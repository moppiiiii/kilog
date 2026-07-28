import * as z from "zod";

import {
  createSupabaseSchema,
  deleteFrom,
  insert,
  select,
  update,
} from "@/lib/supabase/query";

// マイメニュー（10A）。記録画面の「セッション選択」と前回コピーから呼び出す定番。

export const MenuExerciseSchema = z.object({
  /** menu_exercises の行 id。編集・削除の対象。 */
  rowId: z.string(),
  /** 種目マスタの id（exercise_id）。 */
  id: z.string(),
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  restSec: z.number().int().positive(),
});
export type MenuExercise = z.infer<typeof MenuExerciseSchema>;

export const MenuKind = z.enum(["training", "meal"]);
export type MenuKindValue = z.infer<typeof MenuKind>;

const WorkoutMenuSchema = z.object({
  id: z.string(),
  kind: MenuKind,
  name: z.string(),
  icon: z.string(),
  /** 一覧に出す補足（例: "胸・肩・三頭 · 4種目"）は parts と種目数から組み立てる。 */
  parts: z.array(z.string()),
  summary: z.string(),
  estimatedMin: z.number().int(),
  favorite: z.boolean(),
  exercises: z.array(MenuExerciseSchema),
});
export type WorkoutMenu = z.infer<typeof WorkoutMenuSchema>;

export const MenusQuery = z.object({
  kind: MenuKind.default("training").catch("training"),
  /** 編集中のメニュー。未指定なら先頭。 */
  menu: z.string().optional().catch(undefined),
});

// ─── Supabase アクセス層（entity / embed 読み取り・操作断片） ─────────────────

export const WorkoutMenuEntitySchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  kind: MenuKind,
  name: z.string(),
  icon: z.string(),
  parts: z.array(z.string()),
  estimated_min: z.coerce.number().int(),
  favorite: z.boolean(),
  position: z.coerce.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type WorkoutMenuRow = z.infer<typeof WorkoutMenuEntitySchema>;

export const GET_MENUS_QUERY =
  "id, kind, name, icon, parts, estimated_min, favorite, position, " +
  "exercises:menu_exercises(id, position, exercise_id, target_sets, target_reps, rest_sec, exercise:exercises(id, name))";

const MenuExerciseReadSchema = z.object({
  id: z.uuid(),
  position: z.coerce.number().int(),
  exercise_id: z.string(),
  target_sets: z.coerce.number().int(),
  target_reps: z.coerce.number().int(),
  rest_sec: z.coerce.number().int(),
  exercise: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export const MenuReadSchema = z.object({
  id: z.uuid(),
  kind: MenuKind,
  name: z.string(),
  icon: z.string(),
  parts: z.array(z.string()),
  estimated_min: z.coerce.number().int(),
  favorite: z.boolean(),
  position: z.coerce.number().int(),
  exercises: z.array(MenuExerciseReadSchema),
});
export type MenuRead = z.infer<typeof MenuReadSchema>;

export const MenuExerciseEntitySchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  menu_id: z.uuid(),
  exercise_id: z.string(),
  position: z.coerce.number().int(),
  target_sets: z.coerce.number().int(),
  target_reps: z.coerce.number().int(),
  rest_sec: z.coerce.number().int(),
  created_at: z.string(),
});
export type MenuExerciseRow = z.infer<typeof MenuExerciseEntitySchema>;

// ─── 書き込みの入力契約 ──────────────────────────────────────────────────────
// mutation は RETURNING なし（void）。行 id はクライアントで uuid を生成して渡す。

export const CreateMenuInput = z.object({
  id: z.uuid(),
  kind: MenuKind,
  name: z.string().min(1, "メニュー名を入力してください"),
  icon: z.string().default("🏋️"),
  parts: z.array(z.string()).default([]),
  estimated_min: z.number().int().nonnegative().default(0),
  favorite: z.boolean().default(false),
  position: z.number().int().default(0),
});
export type CreateMenuValue = z.infer<typeof CreateMenuInput>;

/** メニュー本体の更新。id で対象を絞り、送った項目だけ差し替える。 */
export const UpdateMenuInput = z.object({
  id: z.uuid(),
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  parts: z.array(z.string()).optional(),
  estimated_min: z.number().int().nonnegative().optional(),
  favorite: z.boolean().optional(),
});
export type UpdateMenuValue = z.infer<typeof UpdateMenuInput>;

export const MenuIdInput = z.object({ id: z.uuid() });

export const AddMenuExerciseInput = z.object({
  id: z.uuid(),
  menu_id: z.uuid(),
  exercise_id: z.string(),
  position: z.number().int().default(0),
  target_sets: z.number().int().positive().default(3),
  target_reps: z.number().int().positive().default(10),
  rest_sec: z.number().int().nonnegative().default(90),
});
export type AddMenuExerciseValue = z.infer<typeof AddMenuExerciseInput>;

/** メニュー内の 1 種目の既定値（セット数・レップ・休憩）の更新。 */
export const UpdateMenuExerciseInput = z.object({
  id: z.uuid(),
  position: z.number().int().optional(),
  target_sets: z.number().int().positive().optional(),
  target_reps: z.number().int().positive().optional(),
  rest_sec: z.number().int().nonnegative().optional(),
});
export type UpdateMenuExerciseValue = z.infer<typeof UpdateMenuExerciseInput>;

export const MenuExerciseIdInput = z.object({ id: z.uuid() });

/** メニューから当日セッションを起こす（10A →記録画面）。 */
export const StartMenuSessionInput = z.object({ menuId: z.uuid() });
export type StartMenuSessionValue = z.infer<typeof StartMenuSessionInput>;

export const menusSchema = createSupabaseSchema({
  "@select/workout_menus": select({
    output: z.array(MenuReadSchema),
    select: GET_MENUS_QUERY,
    row: WorkoutMenuEntitySchema,
  }),
  "@insert/workout_menus": insert({ input: CreateMenuInput }),
  "@update/workout_menus": update({
    input: UpdateMenuInput.omit({ id: true }),
    row: WorkoutMenuEntitySchema,
  }),
  "@delete/workout_menus": deleteFrom({ row: WorkoutMenuEntitySchema }),
  "@insert/menu_exercises": insert({ input: AddMenuExerciseInput }),
  "@update/menu_exercises": update({
    input: UpdateMenuExerciseInput.omit({ id: true }),
    row: MenuExerciseEntitySchema,
  }),
  "@delete/menu_exercises": deleteFrom({ row: MenuExerciseEntitySchema }),
});
