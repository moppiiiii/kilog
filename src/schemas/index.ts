import type { SupabaseSchemaMap } from "@/lib/supabase";

import { bodySchema } from "./body";
import { exercisesSchema } from "./exercises";
import { mealsSchema } from "./meals";
import { menusSchema } from "./menus";
import { profileSchema } from "./profile";
import { workoutsSchema } from "./workouts";

// アプリ全体のスキーマ。各テーブルの操作断片をここにスプレッドで合流させる。
// dashboard / reports / progression はこれらの生テーブルを serverFn 内で集計するため、
// 固有の断片は持たない。
export const appSchema = {
  ...profileSchema,
  ...exercisesSchema,
  ...mealsSchema,
  ...bodySchema,
  ...menusSchema,
  ...workoutsSchema,
} satisfies SupabaseSchemaMap;

export type AppSchema = typeof appSchema;
