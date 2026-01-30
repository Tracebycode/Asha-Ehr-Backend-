create table public.family_members (
  id uuid not null default gen_random_uuid(),

  family_id uuid not null,

  name text not null,
  gender text null,
  relation text null,

  dob date null,

  adhar_number text null,
  phone text null,

  is_alive boolean not null default true,

  next_visit_date date null,

  -- offline-first metadata
  device_created_at timestamp without time zone default now(),
  device_updated_at timestamp without time zone default now(),
  synced_at timestamp without time zone null,

  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),

  constraint family_members_pkey primary key (id),

  constraint family_members_family_id_fkey
    foreign key (family_id) references families (id) on delete cascade,

  constraint family_members_gender_check
    check (gender is null or gender in ('male', 'female', 'other')),

  constraint family_members_relation_check
    check (
      relation is null or relation in (
        'head',
        'spouse',
        'son',
        'daughter',
        'father',
        'mother',
        'grandparent',
        'other'
      )
    )
);

create trigger trg_family_members_updated
before update on family_members
for each row
execute function update_timestamp();
