import * as z from "zod";

import { createSupabaseSchema, select, update } from "@/lib/supabase/query";

import { MacrosSchema } from "./meals";

// プロフィール（目標値・身長）。1 ユーザー 1 行。
// 目標カロリー / PFC・目標体重・身長を各画面（ダッシュボード・食事・レポート・体組成）が参照する。

// 目標値の計算に使う前提（0003 マイグレーションで追加した列）。
// いずれも未設定を許し、未設定なら計算ページが入力を促す。

export const Sex = z.enum(["male", "female"]);
export type SexValue = z.infer<typeof Sex>;

/** 活動レベル。基礎代謝に掛ける係数は lib/nutrition-targets が持つ。 */
export const ActivityLevel = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export type ActivityLevelValue = z.infer<typeof ActivityLevel>;

/** 減量 / 維持 / 増量。消費カロリーからの増減幅は lib/nutrition-targets が持つ。 */
export const DietGoal = z.enum(["cut", "maintain", "bulk"]);
export type DietGoalValue = z.infer<typeof DietGoal>;

export const GET_PROFILE_QUERY =
  "user_id, display_name, height_cm, target_weight_kg, target_kcal, target_protein_g, target_fat_g, target_carb_g, birth_year, sex, activity_level, diet_goal";

export const ProfileEntitySchema = z.object({
  user_id: z.uuid(),
  display_name: z.string().nullable(),
  height_cm: z.coerce.number().nullable(),
  target_weight_kg: z.coerce.number().nullable(),
  target_kcal: z.coerce.number().int(),
  target_protein_g: z.coerce.number().int(),
  target_fat_g: z.coerce.number().int(),
  target_carb_g: z.coerce.number().int(),
  birth_year: z.coerce.number().int().nullable(),
  sex: Sex.nullable(),
  activity_level: ActivityLevel.nullable(),
  diet_goal: DietGoal.nullable(),
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
  birth_year: true,
  sex: true,
  activity_level: true,
  diet_goal: true,
});
export type ProfileRead = z.infer<typeof ProfileReadSchema>;

/** 目標値を計算した前提。未設定は null（＝目標値は手入力のまま）。 */
export type TargetBasis = {
  birthYear: number | null;
  sex: SexValue | null;
  activityLevel: ActivityLevelValue | null;
  dietGoal: DietGoalValue | null;
};

/** 画面で使う正規化済みプロフィール。行が無いユーザーでも既定値で埋める。 */
export type Profile = {
  heightM: number;
  targetWeightKg: number;
  targetKcal: number;
  targetMacros: z.infer<typeof MacrosSchema>;
  basis: TargetBasis;
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
    // 前提は既定値で埋めない（未入力と「入力した結果その値」を区別する）。
    basis: {
      birthYear: row?.birth_year ?? null,
      sex: row?.sex ?? null,
      activityLevel: row?.activity_level ?? null,
      dietGoal: row?.diet_goal ?? null,
    },
  };
}

/**
 * プロフィール更新の入力契約（身長・目標値）。送信時に数値へ coerce する。
 * 画面の入力欄は文字列で保持するため、react-form の検証は下の ProfileFormSchema を使う。
 */
export const UpdateProfileInput = z.object({
  height_cm: z.coerce.number().positive(),
  target_weight_kg: z.coerce.number().positive(),
  target_kcal: z.coerce.number().int().positive(),
  target_protein_g: z.coerce.number().int().nonnegative(),
  target_fat_g: z.coerce.number().int().nonnegative(),
  target_carb_g: z.coerce.number().int().nonnegative(),
});
export type UpdateProfileValue = z.infer<typeof UpdateProfileInput>;

/**
 * 計算した目標値を反映する入力契約。目標値そのものと、それを出した前提を
 * 1 回の書き込みでまとめて保存する（次に開いたとき同じ条件から再計算できる）。
 */
export const ApplyNutritionTargetsInput = z.object({
  birth_year: z.coerce.number().int().min(1900).max(2100).nullable(),
  sex: Sex.nullable(),
  activity_level: ActivityLevel,
  diet_goal: DietGoal,
  target_kcal: z.coerce.number().int().positive(),
  target_protein_g: z.coerce.number().int().nonnegative(),
  target_fat_g: z.coerce.number().int().nonnegative(),
  target_carb_g: z.coerce.number().int().nonnegative(),
});
export type ApplyNutritionTargetsValue = z.infer<
  typeof ApplyNutritionTargetsInput
>;

const PositiveNumberString = z
  .string()
  .refine((s) => Number(s) > 0, "0 より大きい数値を入力してください");
const NonNegNumberString = z
  .string()
  .refine(
    (s) => Number.isFinite(Number(s)) && Number(s) >= 0,
    "0 以上の数値を入力してください",
  );

/** 設定フォームの検証スキーマ。値は文字列（react-form の値型と一致）。 */
export const ProfileFormSchema = z.object({
  height_cm: PositiveNumberString,
  target_weight_kg: PositiveNumberString,
  target_kcal: PositiveNumberString,
  target_protein_g: NonNegNumberString,
  target_fat_g: NonNegNumberString,
  target_carb_g: NonNegNumberString,
});

/**
 * 目標値の計算ページの入力。生年は空欄可（体脂肪率があれば要らない）、
 * 性別も同じ理由で "" を許す。値は react-form の値型と一致させる。
 */
export const TargetCalculatorFormSchema = z.object({
  birth_year: z
    .string()
    .refine(
      (s) => s.trim() === "" || /^\d{4}$/.test(s.trim()),
      "西暦 4 桁で入力してください",
    ),
  sex: z.union([Sex, z.literal("")]),
  activity_level: ActivityLevel,
  diet_goal: DietGoal,
});
export type TargetCalculatorValues = z.infer<typeof TargetCalculatorFormSchema>;

export const profileSchema = createSupabaseSchema({
  "@select/profiles": select({
    output: z.array(ProfileReadSchema),
    select: GET_PROFILE_QUERY,
    row: ProfileEntitySchema,
  }),
  "@update/profiles": update({
    input: UpdateProfileInput,
    row: ProfileEntitySchema,
  }),
});
