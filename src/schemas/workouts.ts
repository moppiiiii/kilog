import * as z from "zod";

import {
  createSupabaseSchema,
  deleteFrom,
  insert,
  select,
  update,
} from "@/lib/supabase/query";

// トレーニング記録（セッション → 種目 → セット）。
// いまは serverFn がローカル固定データを返すが、スキーマは Supabase 移行後の
// レスポンス契約としてそのまま使う（docs/data-access.md のエンティティ/レスポンス）。

export const SetRecordSchema = z.object({
  /** workout_sets の行 id。記録画面から update/delete するときの対象。 */
  id: z.string().optional(),
  n: z.number().int().positive(),
  kg: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  rpe: z.number().nullable(),
  done: z.boolean(),
  /** 有酸素の記録（筋トレ行では null）。時間(分)・距離(km)・消費カロリー。 */
  durationMin: z.number().nullable(),
  distanceKm: z.number().nullable(),
  kcal: z.number().int().nullable(),
});
export type SetRecord = z.infer<typeof SetRecordSchema>;

export const ExerciseRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** 有酸素種目か（記録・集計を筋トレと分けるための判別）。 */
  isCardio: z.boolean(),
  /** session_exercises の行 id。セット追加のとき親として渡す。 */
  sessionExerciseId: z.string().optional(),
  /** 前回のトップセット（例: "70kg×5"）。初回種目は null。 */
  previousTop: z.string().nullable(),
  sets: z.array(SetRecordSchema),
});
export type ExerciseRecord = z.infer<typeof ExerciseRecordSchema>;

export const WorkoutSessionSchema = z.object({
  id: z.string(),
  /** ISO 日付（YYYY-MM-DD）。表示整形は lib/format に寄せる。 */
  date: z.string(),
  title: z.string(),
  parts: z.array(z.string()),
  startTime: z.string(),
  endTime: z.string(),
  durationMin: z.number().int(),
  avgRestSec: z.number().int(),
  note: z.string(),
  tags: z.array(z.string()),
  personalBest: z.boolean(),
  exercises: z.array(ExerciseRecordSchema),
  /** 直前の同名セッション。比較ブロック（4A）で使う。 */
  previous: z
    .object({
      volumeKg: z.number(),
      topSetKg: z.number(),
      durationMin: z.number().int(),
    })
    .nullable(),
});
export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>;

/** 一覧（3A）の 1 行。トレーニングと食事が同じ時系列に混ざる。 */
export const LogRowSchema = z.object({
  id: z.string(),
  date: z.string(),
  dow: z.string(),
  kind: z.enum(["training", "meal"]),
  title: z.string(),
  detail: z.string(),
  metric: z.string(),
  delta: z.string(),
  tone: z.enum(["up", "down", "flat"]),
  /** トレーニング行のみ詳細（4A）へ遷移できる。 */
  sessionId: z.string().nullable(),
});
export type LogRow = z.infer<typeof LogRowSchema>;

export const LogFeedSchema = z.object({
  rows: z.array(LogRowSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  counts: z.object({
    all: z.number().int(),
    training: z.number().int(),
    meal: z.number().int(),
  }),
  summary: z.object({
    sessions: z.number().int(),
    volumeTons: z.number(),
    avgKcal: z.number().int(),
    weightDeltaKg: z.number(),
  }),
  parts: z.array(z.string()),
});
export type LogFeed = z.infer<typeof LogFeedSchema>;

/** 前回コピー（8A）のコピー元候補。 */
export const CopySourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  exerciseCount: z.number().int(),
  volumeKg: z.number(),
});
export type CopySource = z.infer<typeof CopySourceSchema>;

/** 休憩タイマー（9A）が必要とするセッション文脈。 */
export const RestContextSchema = z.object({
  sessionTitle: z.string(),
  elapsedSec: z.number().int(),
  exerciseName: z.string(),
  setNo: z.number().int(),
  setTotal: z.number().int(),
  targetKg: z.number(),
  targetReps: z.number().int(),
  recommendedRestSec: z.tuple([z.number().int(), z.number().int()]),
  doneSets: z.array(SetRecordSchema),
});
export type RestContext = z.infer<typeof RestContextSchema>;

/** serverFn の入力契約。zod は schemas/ に集約する。 */
export const SessionIdInput = z.object({ id: z.string() });

/** 一覧の絞り込み（search params と共有する契約）。 */
// 既定値は default（＝Link 側で省略可）＋ catch（＝不正値でも画面を壊さない）。
export const LogFeedQuery = z.object({
  kind: z.enum(["all", "training", "meal"]).default("all").catch("all"),
  period: z
    .enum(["week", "month", "quarter", "all"])
    .default("month")
    .catch("month"),
  page: z.number().int().min(1).default(1).catch(1),
});
export type LogFeedQueryInput = z.infer<typeof LogFeedQuery>;

// ─── Supabase アクセス層（entity / embed 読み取り） ──────────────────────────
// セッション → 種目 → セットを 1 クエリの埋め込みで取得し、handler で view-model へ組む。
// 導出値（volume / 推定 1RM）は workout_sets の生成列と lib/metrics.ts が一致する。

export const WorkoutSessionEntitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  date: z.string(),
  title: z.string(),
  parts: z.array(z.string()),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  note: z.string(),
  tags: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkoutSessionRow = z.infer<typeof WorkoutSessionEntitySchema>;

export const SessionExerciseEntitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_id: z.string().uuid(),
  exercise_id: z.string(),
  position: z.coerce.number().int(),
  created_at: z.string(),
});
export type SessionExerciseRow = z.infer<typeof SessionExerciseEntitySchema>;

export const WorkoutSetEntitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_exercise_id: z.string().uuid(),
  set_no: z.coerce.number().int(),
  weight_kg: z.coerce.number(),
  reps: z.coerce.number().int(),
  rpe: z.coerce.number().nullable(),
  rest_sec: z.coerce.number().int().nullable(),
  done: z.boolean(),
  duration_min: z.coerce.number().nullable(),
  distance_km: z.coerce.number().nullable(),
  kcal: z.coerce.number().int().nullable(),
  created_at: z.string(),
});
export type WorkoutSetRow = z.infer<typeof WorkoutSetEntitySchema>;

const SetReadSchema = z.object({
  id: z.string().uuid(),
  set_no: z.coerce.number().int(),
  weight_kg: z.coerce.number(),
  reps: z.coerce.number().int(),
  rpe: z.coerce.number().nullable(),
  rest_sec: z.coerce.number().int().nullable(),
  done: z.boolean(),
  duration_min: z.coerce.number().nullable(),
  distance_km: z.coerce.number().nullable(),
  kcal: z.coerce.number().int().nullable(),
});

const SessionExerciseEmbedSchema = z.object({
  id: z.string().uuid(),
  position: z.coerce.number().int(),
  exercise_id: z.string(),
  exercise: z
    .object({
      id: z.string(),
      name: z.string(),
      part: z.string(),
      is_cardio: z.boolean(),
    })
    .nullable(),
  sets: z.array(SetReadSchema),
});

/** セッション 1 件（種目・セットを埋め込み）。一覧・当日・詳細で共有。 */
export const SessionReadSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  title: z.string(),
  parts: z.array(z.string()),
  note: z.string(),
  tags: z.array(z.string()),
  started_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  exercises: z.array(SessionExerciseEmbedSchema),
});
export type SessionRead = z.infer<typeof SessionReadSchema>;

export const GET_SESSIONS_QUERY =
  "id, date, title, parts, note, tags, started_at, ended_at, " +
  "exercises:session_exercises(id, position, exercise_id, " +
  "exercise:exercises(id, name, part, is_cardio), " +
  "sets:workout_sets(id, set_no, weight_kg, reps, rpe, rest_sec, done, " +
  "duration_min, distance_km, kcal))";

/** 種目単位（プログレッション用）。セッション日付とセットを埋め込む。 */
export const SessionExerciseReadSchema = z.object({
  id: z.string().uuid(),
  exercise_id: z.string(),
  session: z
    .object({ id: z.string().uuid(), date: z.string(), title: z.string() })
    .nullable(),
  sets: z.array(SetReadSchema),
});
export type SessionExerciseRead = z.infer<typeof SessionExerciseReadSchema>;

export const GET_SESSION_EXERCISES_QUERY =
  "id, exercise_id, " +
  "session:workout_sessions(id, date, title), " +
  "sets:workout_sets(id, set_no, weight_kg, reps, rpe, rest_sec, done)";

// ─── 書き込み（記録画面）の入力契約 ─────────────────────────────────────────
// mutation は RETURNING なし（void）。採番が必要な子行はクライアントで uuid を生成して渡す。

export const CreateSessionInput = z.object({
  id: z.string().uuid(),
  date: z.string(),
  title: z.string().min(1),
  parts: z.array(z.string()).default([]),
  started_at: z.string().nullable().default(null),
});

export const UpdateSessionInput = z.object({
  title: z.string().min(1).optional(),
  parts: z.array(z.string()).optional(),
  ended_at: z.string().nullable().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const AddSessionExerciseInput = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  exercise_id: z.string(),
  position: z.number().int().default(0),
});

export const AddSetInput = z.object({
  id: z.string().uuid(),
  session_exercise_id: z.string().uuid(),
  set_no: z.number().int().positive(),
  weight_kg: z.number().nonnegative().default(0),
  reps: z.number().int().nonnegative().default(0),
  rpe: z.number().nullable().default(null),
  rest_sec: z.number().int().nullable().default(null),
  done: z.boolean().default(false),
  // 有酸素用（筋トレ行では null）。
  duration_min: z.number().nonnegative().nullable().default(null),
  distance_km: z.number().nonnegative().nullable().default(null),
  kcal: z.number().int().nonnegative().nullable().default(null),
});

/** セット更新。`id` で対象を絞り、残りを data として送る。 */
export const UpdateSetInput = z.object({
  id: z.string().uuid(),
  weight_kg: z.number().nonnegative().optional(),
  reps: z.number().int().nonnegative().optional(),
  rpe: z.number().nullable().optional(),
  done: z.boolean().optional(),
  duration_min: z.number().nonnegative().nullable().optional(),
  distance_km: z.number().nonnegative().nullable().optional(),
  kcal: z.number().int().nonnegative().nullable().optional(),
});
export type UpdateSetInputValue = z.infer<typeof UpdateSetInput>;

const UpdateSetData = UpdateSetInput.omit({ id: true });

export const SetIdInput = z.object({ id: z.string().uuid() });

/** 種目（session_exercises 行）の削除対象。 */
export const SessionExerciseIdInput = z.object({ id: z.string().uuid() });

export const ConfirmSessionInput = z.object({
  id: z.string().uuid(),
  ended_at: z.string(),
});

export type CreateSessionValue = z.infer<typeof CreateSessionInput>;
export type AddSessionExerciseValue = z.infer<typeof AddSessionExerciseInput>;
export type AddSetValue = z.infer<typeof AddSetInput>;

export const workoutsSchema = createSupabaseSchema({
  "@select/workout_sessions": select({
    output: z.array(SessionReadSchema),
    select: GET_SESSIONS_QUERY,
    row: WorkoutSessionEntitySchema,
  }),
  "@select/session_exercises": select({
    output: z.array(SessionExerciseReadSchema),
    select: GET_SESSION_EXERCISES_QUERY,
    row: SessionExerciseEntitySchema,
  }),
  "@insert/workout_sessions": insert({ input: CreateSessionInput }),
  "@update/workout_sessions": update({
    input: UpdateSessionInput,
    row: WorkoutSessionEntitySchema,
  }),
  "@delete/workout_sessions": deleteFrom({ row: WorkoutSessionEntitySchema }),
  "@insert/session_exercises": insert({ input: AddSessionExerciseInput }),
  "@delete/session_exercises": deleteFrom({ row: SessionExerciseEntitySchema }),
  "@insert/workout_sets": insert({ input: AddSetInput }),
  "@update/workout_sets": update({
    input: UpdateSetData,
    row: WorkoutSetEntitySchema,
  }),
  "@delete/workout_sets": deleteFrom({ row: WorkoutSetEntitySchema }),
});
