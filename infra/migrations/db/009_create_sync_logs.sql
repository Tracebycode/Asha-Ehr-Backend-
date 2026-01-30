create table public.sync_logs (
  id uuid not null default gen_random_uuid(),

  user_id uuid null,
  device_id text null,

  entity_type text not null,
  entity_id uuid null,

  action text not null,
  status text not null,

  payload jsonb null,
  error_message text null,

  created_at timestamp without time zone default now(),

  constraint sync_logs_pkey primary key (id),

  constraint sync_logs_user_id_fkey
    foreign key (user_id) references users (id) on delete set null,

  constraint sync_logs_action_check
    check (
      action in (
        'CREATE',
        'UPDATE',
        'DELETE',
        'SYNC'
      )
    ),

  constraint sync_logs_status_check
    check (
      status in (
        'SUCCESS',
        'FAILED',
        'RETRIED'
      )
    )
);
