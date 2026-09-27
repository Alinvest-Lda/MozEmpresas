alter table public.profiles
  add column if not exists user_type text not null default 'empresa';

alter table public.profiles
  drop constraint if exists profiles_user_type_check;

alter table public.profiles
  add constraint profiles_user_type_check
  check (user_type in ('empresa', 'profissional'));
