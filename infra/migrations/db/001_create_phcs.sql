create table public.phcs (
  id uuid not null default gen_random_uuid(),
  name text not null,
  address text null,
  pincode text null,
  license_number text null,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),

  constraint phcs_pkey primary key (id)
);

create trigger trg_phcs_updated
before update on phcs
for each row
execute function update_timestamp();
