import type { Macros, MealGroup } from "@/schemas/meals";
import type { ExerciseRecord, WorkoutSession } from "@/schemas/workouts";

// トレーニング / 栄養の導出値。表示の元になる計算はここに集約し、
// コンポーネントとサーバー固定データの両方から同じ式を使う。

export function setVolume(set: { kg: number; reps: number }): number {
  return set.kg * set.reps;
}

export function exerciseVolume(exercise: ExerciseRecord): number {
  return exercise.sets.reduce((total, set) => total + setVolume(set), 0);
}

export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) => total + exerciseVolume(exercise),
    0,
  );
}

// ─── 筋トレ / 有酸素 の分離 ──────────────────────────────────────────────
// 集計・表示で両者を混ぜない。筋トレは重量×レップ、有酸素は時間/距離/カロリー。

export const strengthExercises = (session: WorkoutSession): ExerciseRecord[] =>
  session.exercises.filter((exercise) => !exercise.isCardio);

export const cardioExercises = (session: WorkoutSession): ExerciseRecord[] =>
  session.exercises.filter((exercise) => exercise.isCardio);

/** 筋トレのセット数（有酸素エントリを除く）。 */
export function strengthSetCount(session: WorkoutSession): number {
  return strengthExercises(session).reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
}

/** 有酸素の合計（時間・距離・消費カロリー）。 */
export function cardioTotals(session: WorkoutSession): {
  minutes: number;
  km: number;
  kcal: number;
} {
  const sets = cardioExercises(session).flatMap((exercise) => exercise.sets);
  const km = sets.reduce((total, set) => total + (set.distanceKm ?? 0), 0);
  return {
    minutes: sets.reduce((total, set) => total + (set.durationMin ?? 0), 0),
    km: Math.round(km * 10) / 10,
    kcal: sets.reduce((total, set) => total + (set.kcal ?? 0), 0),
  };
}

export function sessionSetCount(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );
}

export function sessionRepCount(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.reduce((sum, set) => sum + set.reps, 0),
    0,
  );
}

export function sessionAvgRpe(session: WorkoutSession): number {
  const rpes = session.exercises
    .flatMap((exercise) => exercise.sets)
    .map((set) => set.rpe)
    .filter((rpe): rpe is number => rpe !== null);
  if (rpes.length === 0) return 0;
  return rpes.reduce((sum, rpe) => sum + rpe, 0) / rpes.length;
}

/** 種目のトップセット（重量が最大のセット）。 */
export function topSet(exercise: ExerciseRecord) {
  return exercise.sets.reduce<ExerciseRecord["sets"][number] | null>(
    (best, set) => (best === null || set.kg > best.kg ? set : best),
    null,
  );
}

/** Epley 法による推定 1RM。 */
export function estimateOneRm(kgValue: number, reps: number): number {
  if (reps <= 1) return kgValue;
  return kgValue * (1 + reps / 30);
}

export function macroKcal(macros: Macros): number {
  return macros.p * 4 + macros.f * 9 + macros.c * 4;
}

/** P / F / C のカロリー構成比（％）。合計 100 になるよう最後で吸収する。 */
export function macroShare(macros: Macros): [number, number, number] {
  const total = macroKcal(macros);
  if (total === 0) return [0, 0, 0];
  const p = Math.round(((macros.p * 4) / total) * 100);
  const f = Math.round(((macros.f * 9) / total) * 100);
  return [p, f, 100 - p - f];
}

export function sumMacros(list: { macros: Macros }[]): Macros {
  return list.reduce<Macros>(
    (total, item) => ({
      p: total.p + item.macros.p,
      f: total.f + item.macros.f,
      c: total.c + item.macros.c,
    }),
    { p: 0, f: 0, c: 0 },
  );
}

export function groupKcal(group: MealGroup): number {
  return group.items.reduce((total, item) => total + item.kcal, 0);
}

export function groupMacros(group: MealGroup): Macros {
  return sumMacros(group.items);
}

export function dayKcal(groups: MealGroup[]): number {
  return groups.reduce((total, group) => total + groupKcal(group), 0);
}

export function dayMacros(groups: MealGroup[]): Macros {
  return groups.reduce<Macros>(
    (total, group) => {
      const macros = groupMacros(group);
      return {
        p: total.p + macros.p,
        f: total.f + macros.f,
        c: total.c + macros.c,
      };
    },
    { p: 0, f: 0, c: 0 },
  );
}

export function pct(value: number, target: number): number {
  if (target === 0) return 0;
  return (value / target) * 100;
}

/**
 * 時系列を棒グラフの高さ（％）へ。値域の外側に余白を取ることで、
 * 微差しかない体重のような系列でも棒が潰れず差が読める。
 */
export function barHeights(values: number[], floorPct = 18): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.35 || 1;
  const lo = min - pad;
  const hi = max + pad;
  return values.map(
    (value) => floorPct + ((value - lo) / (hi - lo)) * (100 - floorPct),
  );
}
