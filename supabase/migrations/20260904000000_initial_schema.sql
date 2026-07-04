-- AlgoIntern initial database schema.
-- Student data is private; aggregated source data is publicly readable when active.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  headline text,
  college text,
  degree text,
  branch text,
  graduation_year integer check (graduation_year between 1900 and 2200),
  cgpa numeric(4, 2) check (cgpa between 0 and 10),
  location text,
  bio text,
  skills text[],
  interests text[],
  preferred_domains text[],
  preferred_locations text[],
  preferred_work_modes text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  file_name text,
  storage_path text,
  file_type text,
  file_size integer check (file_size is null or file_size >= 0),
  extracted_text text,
  extracted_skills text[],
  extracted_education jsonb,
  extracted_experience jsonb,
  extracted_projects jsonb,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  normalized_name text,
  logo_url text,
  website_url text,
  industry text,
  description text,
  headquarters text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  base_url text,
  source_type text check (source_type in ('api', 'feed', 'public_listing', 'import')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.internships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  title text not null check (btrim(title) <> ''),
  description text,
  location text,
  work_mode text,
  employment_type text,
  domain text,
  skills text[],
  stipend_min numeric check (stipend_min is null or stipend_min >= 0),
  stipend_max numeric check (stipend_max is null or stipend_max >= 0),
  stipend_currency text not null default 'INR',
  duration text,
  eligibility_cgpa numeric(4, 2) check (eligibility_cgpa between 0 and 10),
  application_url text not null check (btrim(application_url) <> ''),
  source_listing_id text,
  posted_at timestamptz,
  deadline timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internships_stipend_range_check check (
    stipend_min is null or stipend_max is null or stipend_min <= stipend_max
  )
);

create table public.saved_internships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  internship_id uuid not null references public.internships(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_internships_student_internship_key unique (student_id, internship_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  internship_id uuid not null references public.internships(id) on delete cascade,
  status text not null default 'saved' check (
    status in ('saved', 'applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn')
  ),
  notes text,
  applied_at timestamptz,
  last_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_student_internship_key unique (student_id, internship_id)
);

create index profiles_college_idx on public.profiles (college);
create index profiles_graduation_year_idx on public.profiles (graduation_year);

create index resumes_student_id_idx on public.resumes (student_id);

create index internships_company_id_idx on public.internships (company_id);
create index internships_source_id_idx on public.internships (source_id);
create index internships_domain_idx on public.internships (domain);
create index internships_location_idx on public.internships (location);
create index internships_work_mode_idx on public.internships (work_mode);
create index internships_deadline_idx on public.internships (deadline);
create index internships_is_active_idx on public.internships (is_active);

create index saved_internships_student_id_idx on public.saved_internships (student_id);
create index saved_internships_internship_id_idx on public.saved_internships (internship_id);

create index applications_student_id_idx on public.applications (student_id);
create index applications_internship_id_idx on public.applications (internship_id);
create index applications_status_idx on public.applications (status);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger resumes_set_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger sources_set_updated_at
before update on public.sources
for each row execute function public.set_updated_at();

create trigger internships_set_updated_at
before update on public.internships
for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.companies enable row level security;
alter table public.sources enable row level security;
alter table public.internships enable row level security;
alter table public.saved_internships enable row level security;
alter table public.applications enable row level security;

create policy "Students can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Students can create their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Students can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Students can read their own resumes"
on public.resumes for select
to authenticated
using (auth.uid() = student_id);

create policy "Students can create their own resumes"
on public.resumes for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can update their own resumes"
on public.resumes for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "Students can delete their own resumes"
on public.resumes for delete
to authenticated
using (auth.uid() = student_id);

create policy "Anyone can read companies"
on public.companies for select
to anon, authenticated
using (true);

create policy "Anyone can read active sources"
on public.sources for select
to anon, authenticated
using (is_active = true);

create policy "Anyone can read active internships"
on public.internships for select
to anon, authenticated
using (is_active = true);

create policy "Students can read their own saved internships"
on public.saved_internships for select
to authenticated
using (auth.uid() = student_id);

create policy "Students can save internships for themselves"
on public.saved_internships for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can update their own saved internships"
on public.saved_internships for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "Students can delete their own saved internships"
on public.saved_internships for delete
to authenticated
using (auth.uid() = student_id);

create policy "Students can read their own applications"
on public.applications for select
to authenticated
using (auth.uid() = student_id);

create policy "Students can create their own applications"
on public.applications for insert
to authenticated
with check (auth.uid() = student_id);

create policy "Students can update their own applications"
on public.applications for update
to authenticated
using (auth.uid() = student_id)
with check (auth.uid() = student_id);

create policy "Students can delete their own applications"
on public.applications for delete
to authenticated
using (auth.uid() = student_id);
