import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { todayIso } from "@/lib/format";
import { $supabaseServer } from "@/lib/supabase/server";
import {
  AddMealEntryInput,
  type DailyMeals,
  type FoodSuggestion,
  type MealGroup,
  MealSlot,
  type MealSlotValue,
  RemoveMealEntryInput,
  SLOT_META,
} from "@/schemas/meals";

import { loadProfile } from "./profile";

// meal_entries（当日）を slot でグルーピングし、profiles の目標値と foods の候補を添える。
// kcal / PFC は記録行が持つ値をそのまま使う（自前で再計算しない）。

export const getDailyMeals = createServerFn().handler(
  async (): Promise<DailyMeals> => {
    const $supabase = await $supabaseServer();
    const profile = await loadProfile($supabase);
    const date = todayIso();

    const entries = (
      await $supabase("@select/meal_entries", {
        filter: (q) => q.eq("date", date).order("position"),
      })
    ).unwrapOr([]);

    const suggestionRows = (
      await $supabase("@select/foods", {
        filter: (q) => q.eq("is_suggestion", true).order("name"),
      })
    ).unwrapOr([]);

    const groups: MealGroup[] = MealSlot.options.map((slot: MealSlotValue) => ({
      slot,
      name: SLOT_META[slot].name,
      items: entries
        .filter((entry) => entry.slot === slot)
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          qty: entry.qty,
          kcal: entry.kcal,
          macros: { p: entry.protein_g, f: entry.fat_g, c: entry.carb_g },
        })),
    }));

    const suggestions: FoodSuggestion[] = suggestionRows.map((food) => ({
      id: food.id,
      tag: food.tag,
      name: food.name,
      kcal: food.kcal,
      macros: { p: food.protein_g, f: food.fat_g, c: food.carb_g },
    }));

    return {
      date,
      targetKcal: profile.targetKcal,
      targetMacros: profile.targetMacros,
      groups,
      suggestions,
    };
  },
);

export const dailyMealsQueryOptions = () =>
  queryOptions({
    queryKey: ["meals", "today"],
    queryFn: () => getDailyMeals(),
  });

// ─── 記録の書き込み（mutation） ──────────────────────────────────────────────

export const addMealEntry = createServerFn({ method: "POST" })
  .validator(AddMealEntryInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@insert/meal_entries", { data });
    if (result.isErr()) throw result.error;
  });

export const removeMealEntry = createServerFn({ method: "POST" })
  .validator(RemoveMealEntryInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@delete/meal_entries", {
      match: { id: data.id },
    });
    if (result.isErr()) throw result.error;
  });
