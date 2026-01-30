create table public.users (
  id uuid not null default gen_random_uuid(),
  name text not null,
  phone text null,
  role text not null,
  phc_id uuid not null,
  password_hash text null,
  created_at timestamp without time zone default now(),
  updated_at timestamp without time zone default now(),
  status text not null default 'active',
  created_by uuid null,
  approved_by uuid null,
  gender text null,
  dob date null,
  education_level text null,

  constraint users_pkey primary key (id),
  constraint users_phone_key unique (phone),
  constraint users_phc_id_fkey
    foreign key (phc_id) references phcs (id) on delete restrict,
  constraint users_approved_by_fkey
    foreign key (approved_by) references users (id),
  constraint users_created_by_fkey
    foreign key (created_by) references users (id),

  constraint users_gender_check
    check (gender = any (array['male', 'female', 'other'])),

  constraint users_role_check
    check (role = any (array['phc_admin', 'doctor', 'anm', 'asha'])),

  constraint users_status_check
    check (status = any (array['active', 'disabled']))
);

create trigger trg_users_updated
before update on users
for each row
execute function update_timestamp();
