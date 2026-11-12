-- Run this in Supabase SQL Editor ONLY when you want cloud sync across devices
create table if not exists vehicles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  plate text,
  initial_odo numeric default 0,
  service_interval_km numeric default 10000,
  service_interval_days integer default 365,
  last_service_odo numeric default 0,
  last_service_date date default current_date,
  last_wash_date date default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  type text not null check (type in ('fuel', 'expense', 'service', 'wash')),
  date date default current_date not null,
  amount numeric not null,
  fuel_liters numeric,
  odo_reading numeric,
  category text,
  notes text,
  calculated_mileage numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table vehicles enable row level security;
alter table logs enable row level security;

create policy "Users manage own vehicles" on vehicles for all using (auth.uid() = user_id);
create policy "Users manage own logs" on logs for all using (auth.uid() = user_id);
