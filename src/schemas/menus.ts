import * as z from "zod";

import { createSupabaseSchema, select } from "@/lib/supabase/query";

// マイメニュー（10A）。記録画面の「セッション選択」と前回コピーから呼び出す定番。

export const MenuExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  restSec: z.number().int().positive(),
});
export type MenuExercise = z.infer<typeof MenuExerciseSchema>;

export const MenuKind = z.enum(["training", "meal"]);

export const WorkoutMenuSchema = z.object({
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
  id: z.string().uuid(),
  user_id: z.string().uuid(),
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
  id: z.string().uuid(),
  position: z.coerce.number().int(),
  exercise_id: z.string(),
  target_sets: z.coerce.number().int(),
  target_reps: z.coerce.number().int(),
  rest_sec: z.coerce.number().int(),
  exercise: z.object({ id: z.string(), name: z.string() }).nullable(),
});

export const MenuReadSchema = z.object({
  id: z.string().uuid(),
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

export const menusSchema = createSupabaseSchema({
  "@select/workout_menus": select({
    output: z.array(MenuReadSchema),
    select: GET_MENUS_QUERY,
    row: WorkoutMenuEntitySchema,
  }),
});
