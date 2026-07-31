-- 目標カロリー / PFC を計算するための前提を profiles に持たせる。
-- 体脂肪率が分かる日は Katch-McArdle で基礎代謝を出せるが、無い日は
-- Mifflin-St Jeor に落ちるため年齢（生年）と性別が要る。活動レベルと目標は
-- 基礎代謝から目標カロリーへ換算するのに使う。
--
-- いずれも null 可（未設定なら計算ページで入力を促し、目標値は手入力のままでも動く）。
-- 年齢ではなく生年で持ち、経過で古くならないようにする。
--
-- 実行方法: Supabase ダッシュボードの SQL Editor に貼って Run
--   （CLI 運用なら supabase/migrations 配下として管理）。

alter table public.profiles
  add column if not exists birth_year     integer,
  add column if not exists sex            text,
  add column if not exists activity_level text,
  add column if not exists diet_goal      text;

alter table public.profiles
  drop constraint if exists profiles_birth_year_check,
  drop constraint if exists profiles_sex_check,
  drop constraint if exists profiles_activity_level_check,
  drop constraint if exists profiles_diet_goal_check;

alter table public.profiles
  add constraint profiles_birth_year_check
    check (birth_year is null or birth_year between 1900 and 2100),
  add constraint profiles_sex_check
    check (sex is null or sex in ('male', 'female')),
  add constraint profiles_activity_level_check
    check (activity_level is null or activity_level in
      ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  add constraint profiles_diet_goal_check
    check (diet_goal is null or diet_goal in ('cut', 'maintain', 'bulk'));
