import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { foldFoodCandidates } from "@/lib/food-candidates";
import { todayIso } from "@/lib/format";
import { $supabaseServer } from "@/lib/supabase/server";
import {
  AddMealEntryInput,
  type DailyMeals,
  DailyMealsQuery,
  FOOD_CANDIDATE_SCAN_LIMIT,
  type FoodCandidate,
  type FoodSuggestion,
  type MealGroup,
  MealSlot,
  type MealSlotValue,
  RemoveMealEntryInput,
  SLOT_META,
  UpdateMealEntryInput,
} from "@/schemas/meals";

import { loadProfile } from "./profile.server";

// meal_entries（指定日・既定は当日）を slot でグルーピングし、profiles の目標値と
// foods の候補を添える。kcal / PFC は記録行が持つ値をそのまま使う（自前で再計算しない）。

export const getDailyMeals = createServerFn()
  .validator(DailyMealsQuery)
  .handler(async ({ data }): Promise<DailyMeals> => {
    const $supabase = await $supabaseServer();
    const profile = await loadProfile($supabase);
    const date = data.date ?? todayIso();

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
      items: entries.flatMap((entry) =>
        entry.slot === slot
          ? [
              {
                id: entry.id,
                name: entry.name,
                qty: entry.qty,
                kcal: entry.kcal,
                macros: { p: entry.protein_g, f: entry.fat_g, c: entry.carb_g },
              },
            ]
          : [],
      ),
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
  });

/** date 省略＝当日。キーも "today" のままにして当日の購読・楽観更新を安定させる。 */
export const dailyMealsQueryOptions = (date?: string) =>
  queryOptions({
    queryKey: ["meals", date ?? "today"],
    queryFn: () => getDailyMeals({ data: { date } }),
  });

// ─── 入力補完の候補 ────────────────────────────────────────────────────────
// 直近の記録を新しい順に読み、食品名で畳んで候補にする。日付に依存しないので
// 日次データとはクエリを分け、1 回の取得を全日で使い回す（日移動で引き直さない）。

export const getFoodCandidates = createServerFn().handler(
  async (): Promise<FoodCandidate[]> => {
    const $supabase = await $supabaseServer();

    const entries = (
      await $supabase("@select/meal_entries", {
        filter: (q) =>
          q
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(FOOD_CANDIDATE_SCAN_LIMIT),
      })
    ).unwrapOr([]);

    return foldFoodCandidates(entries);
  },
);

/**
 * 候補は履歴の要約なので数分古くても困らない。staleTime を長めに取り、
 * 追加時は hooks 側でキャッシュを直接更新して再取得を避ける。
 */
export const foodCandidatesQueryOptions = () =>
  queryOptions({
    queryKey: ["food-candidates"],
    queryFn: () => getFoodCandidates(),
    staleTime: 5 * 60 * 1000,
  });

// ─── 記録の書き込み（mutation） ──────────────────────────────────────────────

export const addMealEntry = createServerFn({ method: "POST" })
  .validator(AddMealEntryInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@insert/meal_entries", { data });
    if (result.isErr()) throw result.error;
  });

/** 記録済みの 1 品を修正する（量・kcal・PFC の打ち間違い直し）。 */
export const updateMealEntry = createServerFn({ method: "POST" })
  .validator(UpdateMealEntryInput)
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const $supabase = await $supabaseServer();
    const result = await $supabase("@update/meal_entries", {
      data: rest,
      match: { id },
    });
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
