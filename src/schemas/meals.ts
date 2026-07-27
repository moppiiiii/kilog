import * as z from "zod";

import {
  createSupabaseSchema,
  deleteFrom,
  insert,
  select,
  update,
} from "@/lib/supabase/query";

// 食事記録。PFC は g、kcal は食品 DB の値をそのまま持つ（自前で再計算しない）。

export const MacrosSchema = z.object({
  p: z.number().nonnegative(),
  f: z.number().nonnegative(),
  c: z.number().nonnegative(),
});
export type Macros = z.infer<typeof MacrosSchema>;

export const MealItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** 量の表示（例: "150 g" / "1 杯"）。 */
  qty: z.string(),
  // kcal・PFC は小数可（0.5 など）。表示は lib/format の dec() で丸めずに出す。
  kcal: z.number().nonnegative(),
  macros: MacrosSchema,
});
export type MealItem = z.infer<typeof MealItemSchema>;

export const MealSlot = z.enum(["breakfast", "lunch", "snack", "dinner"]);
export type MealSlotValue = z.infer<typeof MealSlot>;

export const MealGroupSchema = z.object({
  slot: MealSlot,
  name: z.string(),
  items: z.array(MealItemSchema),
});
export type MealGroup = z.infer<typeof MealGroupSchema>;

export const FoodSuggestionSchema = z.object({
  id: z.string(),
  tag: z.string(),
  name: z.string(),
  kcal: z.number().int().nonnegative(),
  macros: MacrosSchema,
});
export type FoodSuggestion = z.infer<typeof FoodSuggestionSchema>;

export const DailyMealsSchema = z.object({
  date: z.string(),
  targetKcal: z.number().int().positive(),
  targetMacros: MacrosSchema,
  groups: z.array(MealGroupSchema),
  suggestions: z.array(FoodSuggestionSchema),
});
export type DailyMeals = z.infer<typeof DailyMealsSchema>;

// ─── Supabase アクセス層（entity / response・操作断片） ───────────────────────

/** スロットの表示名。DB は enum 値だけ持ち、表示語はここで与える（バッジは SlotBadge が担当）。 */
export const SLOT_META: Record<MealSlotValue, { name: string }> = {
  breakfast: { name: "朝食" },
  lunch: { name: "昼食" },
  snack: { name: "間食" },
  dinner: { name: "夕食" },
};

export const GET_FOODS_QUERY =
  "id, owner_id, tag, name, default_qty, kcal, protein_g, fat_g, carb_g, is_suggestion";

export const FoodEntitySchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid().nullable(),
  tag: z.string(),
  name: z.string(),
  default_qty: z.string(),
  kcal: z.coerce.number().int(),
  protein_g: z.coerce.number(),
  fat_g: z.coerce.number(),
  carb_g: z.coerce.number(),
  is_suggestion: z.boolean(),
  created_at: z.string(),
});
export type FoodRow = z.infer<typeof FoodEntitySchema>;

export const FoodReadSchema = FoodEntitySchema.pick({
  id: true,
  owner_id: true,
  tag: true,
  name: true,
  default_qty: true,
  kcal: true,
  protein_g: true,
  fat_g: true,
  carb_g: true,
  is_suggestion: true,
});
export type FoodRead = z.infer<typeof FoodReadSchema>;

export const GET_MEAL_ENTRIES_QUERY =
  "id, date, slot, food_id, name, qty, kcal, protein_g, fat_g, carb_g, position";

export const MealEntryEntitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  date: z.string(),
  slot: MealSlot,
  food_id: z.string().uuid().nullable(),
  name: z.string(),
  qty: z.string(),
  kcal: z.coerce.number(),
  protein_g: z.coerce.number(),
  fat_g: z.coerce.number(),
  carb_g: z.coerce.number(),
  position: z.coerce.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MealEntryRow = z.infer<typeof MealEntryEntitySchema>;

export const MealEntryReadSchema = MealEntryEntitySchema.pick({
  id: true,
  date: true,
  slot: true,
  food_id: true,
  name: true,
  qty: true,
  kcal: true,
  protein_g: true,
  fat_g: true,
  carb_g: true,
  position: true,
});
export type MealEntryRead = z.infer<typeof MealEntryReadSchema>;

/** serverFn の入力契約（zod は schemas/ に集約）。 */
export const AddMealEntryInput = z.object({
  date: z.string(),
  slot: MealSlot,
  name: z.string().min(1),
  qty: z.string().default(""),
  kcal: z.number().nonnegative().default(0),
  protein_g: z.number().nonnegative().default(0),
  fat_g: z.number().nonnegative().default(0),
  carb_g: z.number().nonnegative().default(0),
  food_id: z.string().uuid().nullable().default(null),
  position: z.number().int().default(0),
});

export const RemoveMealEntryInput = z.object({ id: z.string().uuid() });
export type AddMealEntryValue = z.infer<typeof AddMealEntryInput>;

/**
 * 手入力フォームの入力契約。date / slot / food_id / position は画面側の文脈で補う。
 * react-form の値型（全項目必須）と合わせるため default は付けない（付けると input が
 * optional になり Standard Schema の型が合わなくなる）。制約は AddMealEntryInput と揃える。
 */
export const ManualMealEntryInput = z.object({
  name: z.string().min(1, "食品名を入力してください"),
  qty: z.string(),
  // 入力欄は文字列で保持し、送信時に数値へ coerce する（"0." など小数の途中入力を壊さない）。
  // 空欄は 0 扱い。kcal・PFC とも小数可（0.5 など）。
  kcal: z.coerce.number().nonnegative(),
  protein_g: z.coerce.number().nonnegative(),
  fat_g: z.coerce.number().nonnegative(),
  carb_g: z.coerce.number().nonnegative(),
});
/** 送信後（coerce 済み）の値。数値を持つ。onAdd / addMealEntry に渡す形。 */
export type ManualMealEntryValue = z.infer<typeof ManualMealEntryInput>;

/** 空欄可・0 以上の数値を表す文字列。手入力フォームの数値欄の検証に使う。 */
const NonNegNumberString = z
  .string()
  .refine(
    (s) => s.trim() === "" || (Number.isFinite(Number(s)) && Number(s) >= 0),
    "0 以上の数値を入力してください",
  );

/**
 * 手入力フォームの検証スキーマ。フォームは値を文字列で保持するため、input/output とも
 * 文字列（react-form の値型と一致させる）。数値化は送信時に ManualMealEntryInput で行う。
 */
export const ManualMealFormSchema = z.object({
  name: z.string().min(1, "食品名を入力してください"),
  qty: z.string(),
  kcal: NonNegNumberString,
  protein_g: NonNegNumberString,
  fat_g: NonNegNumberString,
  carb_g: NonNegNumberString,
});

export const mealsSchema = createSupabaseSchema({
  "@select/meal_entries": select({
    output: z.array(MealEntryReadSchema),
    select: GET_MEAL_ENTRIES_QUERY,
    row: MealEntryEntitySchema,
  }),
  "@insert/meal_entries": insert({ input: AddMealEntryInput }),
  "@update/meal_entries": update({
    input: AddMealEntryInput.partial(),
    row: MealEntryEntitySchema,
  }),
  "@delete/meal_entries": deleteFrom({ row: MealEntryEntitySchema }),
  "@select/foods": select({
    output: z.array(FoodReadSchema),
    select: GET_FOODS_QUERY,
    row: FoodEntitySchema,
  }),
});
