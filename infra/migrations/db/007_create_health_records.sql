create table public.health_records (
  id uuid not null default gen_random_uuid(),

  phc_id uuid not null,
  area_id uuid not null,
  member_id uuid not null,

  asha_id uuid not null,

  task_id uuid null,

  visit_type text not null,
  data_json jsonb not null,

  status text not null default 'PENDING',

  -- offline-first metadata
  device_id text null,
  device_created_at timestamp without time zone default now(),
  device_updated_at timestamp without time zone default now(),
  synced_at timestamp without time zone null,

  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),

  constraint health_records_pkey primary key (id),

  constraint health_records_phc_id_fkey
    foreign key (phc_id) references phcs (id) on delete restrict,

  constraint health_records_area_id_fkey
    foreign key (area_id) references phc_areas (id) on delete restrict,

  constraint health_records_member_id_fkey
    foreign key (member_id) references family_members (id) on delete cascade,

  constraint health_records_asha_id_fkey
    foreign key (asha_id) references users (id) on delete restrict,

  constraint health_records_task_id_fkey
    foreign key (task_id) references tasks (id) on delete set null,

  constraint health_records_status_check
    check (status in ('PENDING', 'VERIFIED')),

  constraint health_records_visit_type_check
    check (
      visit_type in (
        'general',
        'anc',
        'pnc',
        'immunization',
        'nutrition'
      )
    )
);

create trigger trg_health_records_updated
before update on health_records
for each row
execute function update_timestamp();
