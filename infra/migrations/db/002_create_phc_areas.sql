create table public.phc_areas (
  id uuid not null default gen_random_uuid(),
  phc_id uuid not null,
  area_name text not null,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),

  constraint phc_areas_pkey primary key (id),
  constraint phc_areas_phc_id_fkey
    foreign key (phc_id) references phcs (id) on delete cascade
);

create trigger trg_phc_areas_updated
before update on phc_areas
for each row
execute function update_timestamp();
