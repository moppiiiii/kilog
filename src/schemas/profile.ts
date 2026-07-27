import * as z from "zod";

import { createSupabaseSchema, select } from "@/lib/supabase/query";

import { MacrosSchema } from "./meals";

// プロフィール（目標値・身長）。1 ユーザー 1 行。
// 目標カロリー / PFC・目標体重・身長を各画面（ダッシュボード・食事・レポート・体組成）が参照する。

export const GET_PROFILE_QUERY =
  "user_id, display_name, height_cm, target_weight_kg, target_kcal, target_protein_g, target_fat_g, target_carb_g";

export const ProfileEntitySchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().nullable(),
  height_cm: z.coerce.number().nullable(),
  target_weight_kg: z.coerce.number().nullable(),
  target_kcal: z.coerce.number().int(),
  target_protein_g: z.coerce.number().int(),
  target_fat_g: z.coerce.number().int(),
  target_carb_g: z.coerce.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProfileRow = z.infer<typeof ProfileEntitySchema>;

const ProfileReadSchema = ProfileEntitySchema.pick({
  user_id: true,
  display_name: true,
  height_cm: true,
  target_weight_kg: true,
  target_kcal: true,
  target_protein_g: true,
  target_fat_g: true,
  target_carb_g: true,
});
export type ProfileRead = z.infer<typeof ProfileReadSchema>;

/** 画面で使う正規化済みプロフィール。行が無いユーザーでも既定値で埋める。 */
export type Profile = {
  heightM: number;
  targetWeightKg: number;
  targetKcal: number;
  targetMacros: z.infer<typeof MacrosSchema>;
};

/** DB 行（無ければ null）を画面用に正規化する。既定値はテーブルの default と揃える。 */
export function normalizeProfile(row: ProfileRead | null): Profile {
  return {
    heightM: row?.height_cm != null ? row.height_cm / 100 : 1.7,
    targetWeightKg: row?.target_weight_kg ?? 70,
    targetKcal: row?.target_kcal ?? 2200,
    targetMacros: {
      p: row?.target_protein_g ?? 145,
      f: row?.target_fat_g ?? 60,
      c: row?.target_carb_g ?? 230,
    },
  };
}

export const profileSchema = createSupabaseSchema({
  "@select/profiles": select({
    output: z.array(ProfileReadSchema),
    select: GET_PROFILE_QUERY,
    row: ProfileEntitySchema,
  }),
});
