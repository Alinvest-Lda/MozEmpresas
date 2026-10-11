create table if not exists public.user_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  entity_type text not null check (entity_type in ('businesses','marketplace','opportunities')),
  filters jsonb not null default '{}'::jsonb,
  alert_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entity_type, filters)
);
create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('business','listing','opportunity')),
  entity_id uuid not null,
  title text not null,
  href text not null,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);
alter table public.user_saved_searches enable row level security;
alter table public.user_favorites enable row level security;
drop policy if exists "users manage own saved searches" on public.user_saved_searches;
create policy "users manage own saved searches" on public.user_saved_searches for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "users manage own favorites" on public.user_favorites;
create policy "users manage own favorites" on public.user_favorites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists user_saved_searches_user_created_idx on public.user_saved_searches(user_id, created_at desc);
create index if not exists user_favorites_user_created_idx on public.user_favorites(user_id, created_at desc);

create or replace function public.notify_saved_search_matches()
returns trigger language plpgsql security definer set search_path = public
as $function$
declare
  v_entity_type text; v_title text; v_description text; v_location text; v_href text;
  v_status text; v_type text; v_category_id text; v_is_new boolean := false;
  s record; v_q text; v_location_filter text;
begin
  if tg_table_name = 'businesses' then
    v_entity_type := 'businesses'; v_title := new.name; v_description := coalesce(new.description, '');
    v_location := coalesce(new.location, ''); v_href := '/empresas/' || new.slug;
    v_category_id := new.category_id::text;
    v_is_new := new.is_public and new.archived_at is null and (tg_op = 'INSERT' or old.is_public is distinct from true);
  elsif tg_table_name = 'listings' then
    v_entity_type := 'marketplace'; v_title := new.title; v_description := coalesce(new.description, '');
    v_location := coalesce(new.location, ''); v_href := '/marketplace/' || new.id::text;
    v_status := new.status::text; v_type := new.type::text;
    v_is_new := v_status = 'PUBLISHED' and (tg_op = 'INSERT' or old.status::text is distinct from 'PUBLISHED');
  elsif tg_table_name = 'opportunities' then
    v_entity_type := 'opportunities'; v_title := new.title; v_description := coalesce(new.description, '');
    v_location := coalesce(new.location, ''); v_href := '/oportunidades/' || new.slug;
    v_status := new.status::text; v_type := new.type::text;
    v_is_new := v_status = 'PUBLISHED' and (tg_op = 'INSERT' or old.status::text is distinct from 'PUBLISHED');
  end if;
  if not coalesce(v_is_new, false) then return new; end if;
  for s in select id,user_id,title,filters from public.user_saved_searches where entity_type=v_entity_type and alert_enabled=true loop
    v_q := nullif(trim(coalesce(s.filters->>'q','')), '');
    v_location_filter := nullif(trim(coalesce(s.filters->>'location','')), '');
    if (v_q is null or (coalesce(v_title,'') || ' ' || coalesce(v_description,'') ilike '%' || v_q || '%'))
      and (v_location_filter is null or coalesce(v_location,'') ilike '%' || v_location_filter || '%')
      and (v_entity_type <> 'marketplace' or coalesce(s.filters->>'type','') in ('','all') or s.filters->>'type'=v_type)
      and (v_entity_type <> 'businesses' or coalesce(s.filters->>'category','')='' or v_category_id=s.filters->>'category')
    then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      values(s.user_id,'SAVED_SEARCH_MATCH','Nova correspondência: ' || left(coalesce(v_title,'conteúdo'),120),
        'Uma nova publicação corresponde à pesquisa guardada "' || left(s.title,120) || '".',
        case when v_entity_type='businesses' then 'BUSINESS' when v_entity_type='marketplace' then 'LISTING' else 'OPPORTUNITY' end,new.id);
    end if;
  end loop;
  return new;
end;
$function$;
revoke all on function public.notify_saved_search_matches() from public, anon, authenticated;
drop trigger if exists notify_saved_search_business_match on public.businesses;
create trigger notify_saved_search_business_match after insert or update of is_public on public.businesses for each row execute function public.notify_saved_search_matches();
drop trigger if exists notify_saved_search_listing_match on public.listings;
create trigger notify_saved_search_listing_match after insert or update of status on public.listings for each row execute function public.notify_saved_search_matches();
drop trigger if exists notify_saved_search_opportunity_match on public.opportunities;
create trigger notify_saved_search_opportunity_match after insert or update of status on public.opportunities for each row execute function public.notify_saved_search_matches();
