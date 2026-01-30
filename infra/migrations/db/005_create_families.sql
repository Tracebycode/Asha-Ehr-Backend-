create table public.families (
  id uuid not null default gen_random_uuid(),

  phc_id uuid not null,
  area_id uuid not null,
  asha_id uuid not null,

  head_member_id uuid null,

  address_line text null,
  landmark text null,

  -- offline-first metadata
  device_created_at timestamp without time zone default now(),
  device_updated_at timestamp without time zone default now(),
  synced_at timestamp without time zone null,

  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),

  constraint families_pkey primary key (id),

  constraint families_phc_id_fkey
    foreign key (phc_id) references phcs (id) on delete restrict,

  constraint families_area_id_fkey
    foreign key (area_id) references phc_areas (id) on delete restrict,

  constraint families_asha_id_fkey
    foreign key (asha_id) references users (id) on delete restrict
);

create trigger trg_families_updated
before update on families
for each row
execute function update_timestamp();
