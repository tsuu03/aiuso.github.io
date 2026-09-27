-- ============================================================
-- 독자용 소설 사이트: 최소 Supabase 설치 스크립트
-- 새 Supabase 프로젝트의 SQL Editor에서 한 번만 실행하세요.
-- ============================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_public (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_draft (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.is_novel_admin(check_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = check_uid
  );
$$;

revoke all on function public.is_novel_admin(uuid) from public;
grant execute on function public.is_novel_admin(uuid) to authenticated;

alter table public.admin_users enable row level security;
alter table public.site_public enable row level security;
alter table public.site_draft enable row level security;

-- 기존 정책이 있으면 안전하게 교체
drop policy if exists "admin can read own admin row" on public.admin_users;
drop policy if exists "anyone can read published site" on public.site_public;
drop policy if exists "admin can write published site" on public.site_public;
drop policy if exists "admin can manage draft" on public.site_draft;

create policy "admin can read own admin row"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

create policy "anyone can read published site"
on public.site_public
for select
to anon, authenticated
using (true);

create policy "admin can write published site"
on public.site_public
for all
to authenticated
using (public.is_novel_admin())
with check (public.is_novel_admin());

create policy "admin can manage draft"
on public.site_draft
for all
to authenticated
using (public.is_novel_admin())
with check (public.is_novel_admin());

-- 테이블 권한 + RLS를 함께 사용합니다.
revoke all on public.admin_users from anon, authenticated;
revoke all on public.site_public from anon, authenticated;
revoke all on public.site_draft from anon, authenticated;

grant select on public.admin_users to authenticated;
grant select on public.site_public to anon, authenticated;
grant insert, update, delete on public.site_public to authenticated;
grant select, insert, update, delete on public.site_draft to authenticated;

-- 실시간 공개 갱신. 이미 추가되어 있으면 건너뜁니다.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'site_public'
  ) then
    alter publication supabase_realtime add table public.site_public;
  end if;
end $$;

-- 설치 확인용
select 'setup complete' as result;
