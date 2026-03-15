-- Webhook trigger: notify on order insert/update via Edge Function
-- Requires pg_net extension (already enabled)

-- Ensure extensions schema is accessible
set search_path to public, net, extensions;

-- Create trigger function that calls the Edge Function
create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
begin
  -- Build payload matching Supabase webhook format
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', case when TG_OP = 'UPDATE' then row_to_json(OLD) else '{}'::json end
  );

  -- Fire async HTTP request via pg_net
  -- Edge function deployed with --no-verify-jwt, no auth header needed
  perform net.http_post(
    url := 'https://ppxdnrwpksdeqzfxtgvu.supabase.co/functions/v1/notify-order-status',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  return NEW;
end;
$$;

-- Create trigger on orders table
drop trigger if exists on_order_change on public.orders;

create trigger on_order_change
  after insert or update on public.orders
  for each row
  execute function public.notify_order_status_change();
