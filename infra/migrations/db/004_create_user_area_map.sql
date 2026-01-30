create table public.user_area_map (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  area_id uuid not null,
  assigned_at timestamp without time zone default now(),

  constraint user_area_map_pkey primary key (id),

  -- Prevent duplicate assignments
  constraint user_area_map_user_area_unique
    unique (user_id, area_id),

  constraint user_area_map_user_id_fkey
    foreign key (user_id) references users (id) on delete cascade,

  constraint user_area_map_area_id_fkey
    foreign key (area_id) references phc_areas (id) on delete cascade
);
