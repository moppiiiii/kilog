-- 種目マスタ（共通マスタ）のシード。
-- owner_id = NULL は全ユーザー共通の種目。part はアプリの新規作成と同じ区分
-- （胸 / 背中 / 肩 / 腕 / 脚 / 体幹 / 有酸素 / その他）。id はスラッグ（/report/$exerciseId で使用）。
--
-- 実行方法（どちらでも）:
--   1) Supabase CLI:            supabase db reset  （このファイルが自動実行される）
--   2) ダッシュボードの SQL Editor に貼り付けて実行
--
-- 再実行しても重複しないよう on conflict (id) do nothing。
-- created_at はテーブル default（now()）に任せる。

insert into public.exercises (id, name, part, is_bodyweight, is_cardio, owner_id)
values
  -- ── 胸 ──────────────────────────────────────────────
  ('bench-press',            'ベンチプレス',                 '胸',   false, false, null),
  ('incline-bench-press',    'インクラインベンチプレス',     '胸',   false, false, null),
  ('decline-bench-press',    'デクラインベンチプレス',       '胸',   false, false, null),
  ('dumbbell-bench-press',   'ダンベルベンチプレス',         '胸',   false, false, null),
  ('incline-dumbbell-press', 'インクラインダンベルプレス',   '胸',   false, false, null),
  ('machine-chest-press',    'チェストプレス',            '胸',   false, false, null),
  ('dumbbell-fly',           'ダンベルフライ',               '胸',   false, false, null),
  ('incline-dumbbell-fly',   'インクラインダンベルフライ',   '胸',   false, false, null),
  ('cable-crossover',        'ケーブルクロスオーバー',       '胸',   false, false, null),
  ('pec-deck',               'ペックデックフライ',           '胸',   false, false, null),
  ('push-up',                '腕立て伏せ',                   '胸',   true,  false, null),
  ('decline-push-up',        'デクライン腕立て伏せ',         '胸',   true,  false, null),
  ('dips',                   'ディップス',                   '胸',   true,  false, null),

  -- ── 背中 ────────────────────────────────────────────
  ('deadlift',               'デッドリフト',                 '背中', false, false, null),
  ('rack-pull',              'ラックプル',                   '背中', false, false, null),
  ('pull-up',                '懸垂（順手）',                 '背中', true,  false, null),
  ('chin-up',                'チンアップ（逆手）',           '背中', true,  false, null),
  ('lat-pulldown',           'ラットプルダウン',             '背中', false, false, null),
  ('bent-over-row',          'ベントオーバーロウ',           '背中', false, false, null),
  ('dumbbell-row',           'ワンハンドダンベルロウ',       '背中', false, false, null),
  ('seated-row',             'シーテッドロウ',               '背中', false, false, null),
  ('t-bar-row',              'Tバーロウ',                    '背中', false, false, null),
  ('pullover',               'プルオーバー',                 '背中', false, false, null),
  ('back-extension',         'バックエクステンション',       '背中', true,  false, null),
  ('shrug',                  'シュラッグ',                   '背中', false, false, null),

  -- ── 肩 ──────────────────────────────────────────────
  ('overhead-press',         'オーバーヘッドプレス',         '肩',   false, false, null),
  ('dumbbell-shoulder-press','ダンベルショルダープレス',     '肩',   false, false, null),
  ('machine-shoulder-press', 'ショルダープレス（マシン）',   '肩',   false, false, null),
  ('arnold-press',           'アーノルドプレス',             '肩',   false, false, null),
  ('lateral-raise',          'サイドレイズ',                 '肩',   false, false, null),
  ('front-raise',            'フロントレイズ',               '肩',   false, false, null),
  ('rear-delt-fly',          'リアレイズ',                   '肩',   false, false, null),
  ('upright-row',            'アップライトロウ',             '肩',   false, false, null),
  ('face-pull',              'フェイスプル',                 '肩',   false, false, null),

  -- ── 腕 ──────────────────────────────────────────────
  ('barbell-curl',           'バーベルカール',               '腕',   false, false, null),
  ('dumbbell-curl',          'ダンベルカール',               '腕',   false, false, null),
  ('hammer-curl',            'ハンマーカール',               '腕',   false, false, null),
  ('incline-curl',           'インクラインカール',           '腕',   false, false, null),
  ('preacher-curl',          'プリーチャーカール',           '腕',   false, false, null),
  ('concentration-curl',     'コンセントレーションカール',   '腕',   false, false, null),
  ('cable-curl',             'ケーブルカール',               '腕',   false, false, null),
  ('reverse-curl',           'リバースカール',               '腕',   false, false, null),
  ('wrist-curl',             'リストカール',                 '腕',   false, false, null),
  ('triceps-pushdown',       'トライセプスプレスダウン',     '腕',   false, false, null),
  ('skull-crusher',          'スカルクラッシャー',           '腕',   false, false, null),
  ('overhead-triceps-ext',   'オーバーヘッドエクステンション','腕',  false, false, null),
  ('triceps-kickback',       'トライセプスキックバック',     '腕',   false, false, null),
  ('close-grip-bench-press', 'ナローベンチプレス',           '腕',   false, false, null),

  -- ── 脚 ──────────────────────────────────────────────
  ('squat',                  'スクワット',                   '脚',   false, false, null),
  ('front-squat',            'フロントスクワット',           '脚',   false, false, null),
  ('goblet-squat',           'ゴブレットスクワット',         '脚',   false, false, null),
  ('hack-squat',             'ハックスクワット',             '脚',   false, false, null),
  ('leg-press',              'レッグプレス',                 '脚',   false, false, null),
  ('lunge',                  'ランジ',                       '脚',   false, false, null),
  ('bulgarian-split-squat',  'ブルガリアンスクワット',       '脚',   false, false, null),
  ('step-up',                'ステップアップ',               '脚',   false, false, null),
  ('leg-extension',          'レッグエクステンション',       '脚',   false, false, null),
  ('leg-curl',               'レッグカール',                 '脚',   false, false, null),
  ('romanian-deadlift',      'ルーマニアンデッドリフト',     '脚',   false, false, null),
  ('stiff-leg-deadlift',     'スティフレッグデッドリフト',   '脚',   false, false, null),
  ('hip-thrust',             'ヒップスラスト',               '脚',   false, false, null),
  ('glute-bridge',           'グルートブリッジ',             '脚',   true,  false, null),
  ('hip-adduction',          'アダクション',                 '脚',   false, false, null),
  ('hip-abduction',          'アブダクション',               '脚',   false, false, null),
  ('calf-raise',             'カーフレイズ',                 '脚',   false, false, null),
  ('seated-calf-raise',      'シーテッドカーフレイズ',       '脚',   false, false, null),

  -- ── 体幹 ────────────────────────────────────────────
  ('plank',                  'プランク',                     '体幹', true,  false, null),
  ('side-plank',             'サイドプランク',               '体幹', true,  false, null),
  ('crunch',                 'クランチ',                     '体幹', true,  false, null),
  ('sit-up',                 'シットアップ',                 '体幹', true,  false, null),
  ('leg-raise',              'レッグレイズ',                 '体幹', true,  false, null),
  ('hanging-leg-raise',      'ハンギングレッグレイズ',       '体幹', true,  false, null),
  ('russian-twist',          'ロシアンツイスト',             '体幹', true,  false, null),
  ('bicycle-crunch',         'バイシクルクランチ',           '体幹', true,  false, null),
  ('dead-bug',               'デッドバグ',                   '体幹', true,  false, null),
  ('cable-crunch',           'ケーブルクランチ',             '体幹', false, false, null),
  ('ab-rollout',             'アブローラー',                 '体幹', false, false, null),

  -- ── 有酸素 ──────────────────────────────────────────
  ('running',                'ランニング',                   '有酸素', true,  true, null),
  ('treadmill',              'トレッドミル',                 '有酸素', false, true, null),
  ('walking',                'ウォーキング',                 '有酸素', true,  true, null),
  ('cycling',                'サイクリング（エアロバイク）', '有酸素', false, true, null),
  ('rowing-machine',         'ローイングマシン',             '有酸素', false, true, null),
  ('elliptical',             'イリプティカル',               '有酸素', false, true, null),
  ('cross-trainer',          'クロストレーナー',             '有酸素', false, true, null),
  ('stair-climber',          'ステアクライマー',             '有酸素', false, true, null),
  ('swimming',               '水泳',                         '有酸素', true,  true, null),
  ('jump-rope',              '縄跳び',                       '有酸素', true,  true, null),
  ('burpee',                 'バーピー',                     '有酸素', true,  true, null),
  ('mountain-climber',       'マウンテンクライマー',         '有酸素', true,  true, null),
  ('hiit',                   'HIIT',                         '有酸素', true,  true, null),
  ('hiking',                 'ハイキング',                   '有酸素', true,  true, null),

  -- ── その他（オリンピック種目・ファンクショナル） ────
  ('power-clean',            'パワークリーン',               'その他', false, false, null),
  ('clean-and-jerk',         'クリーン&ジャーク',            'その他', false, false, null),
  ('snatch',                 'スナッチ',                     'その他', false, false, null),
  ('kettlebell-swing',       'ケトルベルスイング',           'その他', false, false, null),
  ('farmers-walk',           'ファーマーズウォーク',         'その他', false, false, null),
  ('battle-rope',            'バトルロープ',                 'その他', false, true,  null),
  ('box-jump',               'ボックスジャンプ',             'その他', true,  false, null),
  ('sled-push',              'スレッドプッシュ',             'その他', false, false, null)
on conflict (id) do nothing;
