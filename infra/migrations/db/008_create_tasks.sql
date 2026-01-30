create table public.tasks (
  id uuid not null default gen_random_uuid(),

  phc_id uuid not null,
  area_id uuid not null,

  created_by uuid not null,
  assigned_to uuid null,

  family_id uuid null,
  member_id uuid null,

  parent_task_id uuid null,

  task_type text not null,
  title text not null,
  description text null,

  due_date date null,

  status text not null default 'PENDING',

  data_json jsonb null,

  -- offline-first metadata
  device_created_at timestamp without time zone default now(),
  device_updated_at timestamp without time zone default now(),
  synced_at timestamp without time zone null,

  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),

  constraint tasks_pkey primary key (id),

  constraint tasks_phc_id_fkey
    foreign key (phc_id) references phcs (id) on delete restrict,

  constraint tasks_area_id_fkey
    foreign key (area_id) references phc_areas (id) on delete restrict,

  constraint tasks_created_by_fkey
    foreign key (created_by) references users (id) on delete set null,

  constraint tasks_assigned_to_fkey
    foreign key (assigned_to) references users (id) on delete set null,

  constraint tasks_family_id_fkey
    foreign key (family_id) references families (id) on delete set null,

  constraint tasks_member_id_fkey
    foreign key (member_id) references family_members (id) on delete set null,

  constraint tasks_parent_task_id_fkey
    foreign key (parent_task_id) references tasks (id) on delete set null,

  constraint tasks_status_check
    check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED')),

  constraint tasks_task_type_check
    check (
      task_type in (
        'ANC',
        'PNC',
        'TB_SCREEN',
        'IMMUNIZATION',
        'GENERAL',
        'SURVEY',
        'CUSTOM'
      )
    )
);

create trigger trg_tasks_updated
before update on tasks
for each row
execute function update_timestamp();
