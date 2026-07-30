-- 食事入力の補完候補（getFoodCandidates）は直近の記録を新しい順に limit 300 で読む。
-- RLS の user_id 絞り込み ＋ その並びをそのまま辿れる索引を張り、記録が増えても
-- 全件走査 → ソートにならないようにする。
--
-- 実行方法: Supabase ダッシュボードの SQL Editor に貼って Run
--   （CLI 運用なら supabase/migrations 配下として管理）。

create index if not exists meal_entries_user_recent_idx
  on public.meal_entries (user_id, date desc, created_at desc);
