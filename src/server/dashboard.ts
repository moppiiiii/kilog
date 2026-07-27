import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { todayIso } from "@/lib/format";
import { $supabaseServer } from "@/lib/supabase/server";
import {
  type Dashboard,
  type DashboardExercise,
  type DashboardMeal,
} from "@/schemas/dashboard";
import { MealSlot, type MealSlotValue } from "@/schemas/meals";

import { loadProfile } from "./profile.server";
import { loadSessions } from "./sessions.server";

// 当日サマリー。profiles / body_measurements / meal_entries / workout_sessions を
// 1 リクエストで束ね、各画面と同じ導出値を返す（旧固定データの置き換え）。

const round1 = (value: number) => Math.round(value * 10) / 10;

export const getDashboard = createServerFn().handler(
  async (): Promise<Dashboard> => {
    const $supabase = await $supabaseServer();
    const date = todayIso();
    const profile = await loadProfile($supabase);
    const sessions = await loadSessions();

    const measurements = (
      await $supabase("@select/body_measurements", {
        filter: (q) => q.order("date", { ascending: false }).limit(30),
      })
    ).unwrapOr([]);
    const ordered = [...measurements].reverse();
    const weightSeries = ordered.map((row) => ({
      date: row.date,
      weightKg: row.weight_kg,
    }));
    const weightKg = measurements[0]?.weight_kg ?? 0;
    const weightDeltaKg =
      measurements[1] != null
        ? round1(weightKg - measurements[1].weight_kg)
        : 0;

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
  },
);

export const dashboardQueryOptions = () =>
  queryOptions({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
