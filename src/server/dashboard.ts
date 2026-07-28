import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { addDaysIso, todayIso } from "@/lib/format";
import { $supabaseServer } from "@/lib/supabase/server";
import {
  type Dashboard,
  type DashboardExercise,
  type DashboardMeal,
  DashboardQuery,
  type DashboardQueryInput,
  type WeightRangeValue,
} from "@/schemas/dashboard";
import { MealSlot, type MealSlotValue } from "@/schemas/meals";

import { loadProfile } from "./profile.server";
import { loadSessions } from "./sessions.server";

// 当日サマリー。profiles / body_measurements / meal_entries / workout_sessions を
// 1 リクエストで束ね、各画面と同じ導出値を返す（旧固定データの置き換え）。

const round1 = (value: number) => Math.round(value * 10) / 10;

/** 体重グラフの窓幅（今日を含むローリング日数）。 */
const RANGE_DAYS: Record<WeightRangeValue, number> = {
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

export const getDashboard = createServerFn()
  .validator(DashboardQuery)
  .handler(async ({ data }): Promise<Dashboard> => {
    const $supabase = await $supabaseServer();
    const date = todayIso();
    const profile = await loadProfile($supabase);
    const sessions = await loadSessions();

    // KPI（最新体重・前回比）はグラフの期間に依存させないので、常に直近 2 件から出す。
    const latestTwo = (
      await $supabase("@select/body_measurements", {
        filter: (q) => q.order("date", { ascending: false }).limit(2),
      })
    ).unwrapOr([]);
    const weightKg = latestTwo[0]?.weight_kg ?? 0;
    const weightDeltaKg =
      latestTwo[1] != null ? round1(weightKg - latestTwo[1].weight_kg) : 0;

    // グラフは選択期間のローリング窓（古い順）。
    const from = addDaysIso(date, -(RANGE_DAYS[data.range] - 1));
    const measurements = (
      await $supabase("@select/body_measurements", {
        filter: (q) => q.gte("date", from).order("date"),
      })
    ).unwrapOr([]);
    const weightSeries = measurements.map((row) => ({
      date: row.date,
      weightKg: row.weight_kg,
    }));

    const entries = (
      await $supabase("@select/meal_entries", {
        filter: (q) => q.eq("date", date).order("position"),
      })
    ).unwrapOr([]);
    const kcal = Math.round(
      entries.reduce((sum, entry) => sum + entry.kcal, 0),
    );
    const macros = {
      p: Math.round(entries.reduce((s, e) => s + e.protein_g, 0)),
      f: Math.round(entries.reduce((s, e) => s + e.fat_g, 0)),
      c: Math.round(entries.reduce((s, e) => s + e.carb_g, 0)),
    };

    const meals: DashboardMeal[] = MealSlot.options.flatMap(
      (slot: MealSlotValue) => {
        const items = entries.filter((entry) => entry.slot === slot);
        if (items.length === 0) return [];
        const slotKcal = Math.round(
          items.reduce((sum, entry) => sum + entry.kcal, 0),
        );
        const p = Math.round(items.reduce((s, e) => s + e.protein_g, 0));
        const f = Math.round(items.reduce((s, e) => s + e.fat_g, 0));
        const c = Math.round(items.reduce((s, e) => s + e.carb_g, 0));
        return [
          {
            slot,
            name: items.map((entry) => entry.name).join("・"),
            detail: `P${p} F${f} C${c}`,
            kcal: slotKcal,
          },
        ];
      },
    );

    // 連続記録日数: 今日（無ければ最新セッション日）から遡って連続する日数。
    const sessionDates = new Set(sessions.map((session) => session.date));
    const cursor = new Date(
      sessionDates.has(date) ? date : (sessions[0]?.date ?? date),
    );
    let streakDays = 0;
    while (sessionDates.has(cursor.toISOString().slice(0, 10))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const latest = sessions[0];
    const exercises: DashboardExercise[] = (latest?.exercises ?? []).map(
      (exercise) => {
        const top = exercise.sets.reduce<(typeof exercise.sets)[number] | null>(
          (best, set) =>
            best === null || set.weight_kg > best.weight_kg ? set : best,
          null,
        );
        const isCardio = exercise.exercise?.is_cardio ?? false;
        const first = exercise.sets[0];
        return {
          name: exercise.exercise?.name ?? exercise.exercise_id,
          isCardio,
          sets: exercise.sets.length,
          reps: top?.reps ?? 0,
          volumeKg: exercise.sets.reduce(
            (sum, set) => sum + set.weight_kg * set.reps,
            0,
          ),
          durationMin: isCardio ? (first?.duration_min ?? null) : null,
          distanceKm: isCardio ? (first?.distance_km ?? null) : null,
        };
      },
    );

    return {
      date,
      weightKg,
      weightDeltaKg,
      kcal,
      targetKcal: profile.targetKcal,
      macros,
      targetMacros: profile.targetMacros,
      streakDays,
      weightSeries,
      sessionTitle: latest?.title ?? "セッションなし",
      exercises,
      meals,
    };
  });

/** キーは ["dashboard", ...] 配下に保つ（食事・記録の mutation が prefix で無効化する）。 */
export const dashboardQueryOptions = (
  query: DashboardQueryInput = { range: "30d" },
) =>
  queryOptions({
    queryKey: ["dashboard", query.range],
    queryFn: () => getDashboard({ data: query }),
  });
