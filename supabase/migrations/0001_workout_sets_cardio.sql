-- 有酸素種目の記録用に workout_sets へ列を追加する。
-- 筋トレ行は weight_kg / reps を使い、有酸素行は下記を使う（未使用側は null / 0）。
--
-- 実行方法: Supabase ダッシュボードの SQL Editor に貼って Run
--   （CLI 運用なら supabase/migrations 配下として管理）。

alter table public.workout_sets
  add column if not exists duration_min numeric,   -- 時間（分）
  add column if not exists distance_km  numeric,   -- 距離（km）
  add column if not exists kcal         integer;   -- 消費カロリー
