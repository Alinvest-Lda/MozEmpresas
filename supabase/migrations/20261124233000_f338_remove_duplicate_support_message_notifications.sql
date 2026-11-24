
-- F3.38: remove duplicate support-message notifications; retain the established recipient-aware trigger.
drop trigger if exists trg_notify_support_message_recipient_f373 on public.support_messages;
drop function if exists public.notify_support_message_recipient_f373();
