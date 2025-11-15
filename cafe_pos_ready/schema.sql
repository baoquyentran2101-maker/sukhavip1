create extension if not exists "pgcrypto";

drop table if exists payments cascade;
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists menu_items cascade;
drop table if exists menu_groups cascade;
drop table if exists cafe_tables cascade;
drop table if exists areas cascade;

create table areas(id uuid primary key default gen_random_uuid(), name text, sort int default 0);

create table cafe_tables(
 id uuid primary key default gen_random_uuid(),
 area_id uuid references areas(id) on delete cascade,
 name text,
 status text default 'empty'
);

create table menu_groups(id uuid primary key default gen_random_uuid(), name text, sort int default 0);

create table menu_items(
 id uuid primary key default gen_random_uuid(),
 group_id uuid references menu_groups(id) on delete cascade,
 name text,
 price numeric default 0,
 is_active bool default true
);

create table orders(
 id uuid primary key default gen_random_uuid(),
 table_id uuid references cafe_tables(id),
 table_name text,
 status text default 'open',
 created_at timestamptz default now()
);

create table order_items(
 id uuid primary key default gen_random_uuid(),
 order_id uuid references orders(id),
 item_name text,
 price numeric,
 qty int,
 amount numeric generated always as (price*qty) stored
);

create table payments(
 id uuid primary key default gen_random_uuid(),
 order_id uuid references orders(id),
 method text,
 paid_amount numeric,
 paid_at timestamptz default now()
);

insert into areas(name,sort) values
 ('Khu A',1),('Khu B',2),('Khu C',3),('Khu D',4),('Mang về',5);
