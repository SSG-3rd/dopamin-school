-- 청춘다이스 익명 플레이 통계 (설계 문서 §9)
-- 익명(anon) 사용자는 결과 한 줄을 넣기만 할 수 있고, 개별 행은 읽을 수 없다.
-- 통계는 집계만 돌려주는 get_stats()로만 본다.

-- ───────── 테이블 ─────────
create table if not exists public.play_results (
  id             uuid primary key,                       -- 클라이언트가 만든 값 (중복 전송 방지)
  created_at     timestamptz not null default now(),
  client_version text not null check (char_length(client_version) between 1 and 16),
  trait_id       text not null check (char_length(trait_id) between 1 and 64),
  ending_kind    text not null check (ending_kind in ('normal', 'combo', 'miracle', 'rescue', 'explore')),
  job_id         text not null check (char_length(job_id) between 1 and 64),
  grade          text check (grade in ('top', 'mid', 'low')),
  career_levels  jsonb not null                          -- {"academic":3,...}
    check (jsonb_typeof(career_levels) = 'object' and pg_column_size(career_levels) < 1024),
  final_stats    jsonb not null                          -- 학업·체력·인맥·운·스트레스·돈
    check (jsonb_typeof(final_stats) = 'object' and pg_column_size(final_stats) < 1024),
  club_id        text check (char_length(club_id) <= 64),
  route_id       text check (char_length(route_id) <= 64),
  turns          int  not null check (turns between 1 and 200),
  duration_sec   int  not null check (duration_sec between 0 and 7200),
  booth_mode     boolean not null default false
);

comment on table public.play_results is '청춘다이스: 끝난 판의 익명 요약 (개인정보 없음). anon은 insert만 가능.';

-- /stats 집계는 최근 기간만 본다
create index if not exists play_results_created_at_idx on public.play_results (created_at desc);

-- ───────── 권한 ─────────
alter table public.play_results enable row level security;

-- Supabase 기본 권한(ALL)을 걷어 내고 insert만 준다.
-- created_at은 열 권한에서 빼서 클라이언트가 날짜를 조작하지 못하게 한다(항상 now()).
revoke all on public.play_results from anon, authenticated;
grant insert (
  id, client_version, trait_id, ending_kind, job_id, grade,
  career_levels, final_stats, club_id, route_id, turns, duration_sec, booth_mode
) on public.play_results to anon, authenticated;

-- 익명 사용자는 넣기만 가능, 읽기·수정·삭제 정책 없음
drop policy if exists "anon insert" on public.play_results;
create policy "anon insert" on public.play_results
  for insert to anon, authenticated
  with check (
    created_at between now() - interval '5 minutes' and now() + interval '5 minutes'
  );

-- ───────── 집계 함수 (개별 행은 노출하지 않음) ─────────
-- since는 최대 31일 전까지만 허용한다. 종류가 지나치게 많아지지 않게 상위 N개만 돌려준다.
create or replace function public.get_stats(since timestamptz default now() - interval '1 day')
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select greatest(
      coalesce(get_stats.since, now() - interval '1 day'),
      now() - interval '31 days'
    ) as s
  ),
  r as (
    select p.trait_id, p.job_id
    from public.play_results p, bounds b
    where p.created_at >= b.s
  )
  select json_build_object(
    'plays',  (select count(*) from r),
    'traits', (select json_object_agg(t.trait_id, t.n)
                 from (select trait_id, count(*) as n from r group by trait_id order by n desc limit 20) t),
    'jobs',   (select json_object_agg(j.job_id, j.n)
                 from (select job_id, count(*) as n from r group by job_id order by n desc limit 50) j)
  );
$$;

comment on function public.get_stats(timestamptz) is '청춘다이스 /stats용 집계 (최대 31일). 의도적으로 SECURITY DEFINER: anon은 행을 읽을 수 없고 집계만 본다.';

revoke execute on function public.get_stats(timestamptz) from public;
grant execute on function public.get_stats(timestamptz) to anon, authenticated;
