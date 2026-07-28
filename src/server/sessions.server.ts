import { kg } from "@/lib/format";
import type { $supabaseServer } from "@/lib/supabase/server";
import type { MealEntryRead } from "@/schemas/meals";
import {
  type ExerciseRecord,
  PB_TAG,
  type SessionRead,
  type SetRecord,
  type WorkoutSession,
} from "@/schemas/workouts";

// トレーニングの読み取りと集計の server-only 層。
// `.server.ts` にすることで（DB 読み取り＋純ヘルパーを export しても）クライアント束に混ざらない。
// dashboard / reports / workouts の各 serverFn がここを共有する。
// 呼び出し側が生成済みの $supabase を渡す（profile.server.ts と同じ規約。
// 同一リクエストで getSession を二重に呼ばない＝並列化してもトークン更新が競合しない）。

type SetRead = SessionRead["exercises"][number]["sets"][number];
type Server = Awaited<ReturnType<typeof $supabaseServer>>;

/**
 * 全セッション（新しい順）。件数は個人データ規模なので一括取得で十分。
 * 同日複数セッションのため date に加えて started_at でも降順に並べ、順序を安定させる
 * （getActiveSession が「当日の最新の未確定」を find で拾える）。
 */
export async function loadSessions($supabase: Server): Promise<SessionRead[]> {
  return (
    await $supabase("@select/workout_sessions", {
      filter: (q) =>
        q
          .order("date", { ascending: false })
          .order("started_at", { ascending: false, nullsFirst: false }),
    })
  ).unwrapOr([]);
}

/** 食事記録（新しい順・全期間）。フィード / 集計で日付ごとに畳む。 */
export async function loadMealEntries(
  $supabase: Server,
): Promise<MealEntryRead[]> {
  return (
    await $supabase("@select/meal_entries", {
      filter: (q) => q.order("date", { ascending: false }),
    })
  ).unwrapOr([]);
}

const setsOf = (read: SessionRead): SetRead[] =>
  read.exercises.flatMap((exercise) => exercise.sets);

export const sessionVolumeKg = (read: SessionRead): number =>
  setsOf(read).reduce((total, set) => total + set.weight_kg * set.reps, 0);

const sessionTopKg = (read: SessionRead): number =>
  setsOf(read).reduce((max, set) => Math.max(max, set.weight_kg), 0);

const durationMin = (read: SessionRead): number => {
  if (!read.started_at || !read.ended_at) return 0;
  const ms =
    new Date(read.ended_at).getTime() - new Date(read.started_at).getTime();
  return Math.max(0, Math.round(ms / 60000));
};

// Intl のコンストラクタはロケールデータを読み込むので、セッション件数ぶん作り直さず
// モジュール直下で 1 度だけ生成する（ロケール・オプションとも固定のため安全）。
const JST_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const hhmm = (ts: string | null): string =>
  ts ? JST_TIME.format(new Date(ts)) : "";

const topSet = (sets: SetRead[]): SetRead | null =>
  sets.reduce<SetRead | null>(
    (best, set) =>
      best === null || set.weight_kg > best.weight_kg ? set : best,
    null,
  );

const topSetString = (sets: SetRead[]): string | null => {
  const top = topSet(sets);
  return top ? `${kg(top.weight_kg)}kg×${top.reps}` : null;
};

/**
 * その日付より前の直近セッション。前回比・前回トップセットの基準。
 * セッション名は開始時刻ベース（毎回変わる）なので、名前一致では基準が取れない。
 * all は date 降順なので「日付が前の最初の 1 件」が直近の前回になる。
 */
export function findPrevious(
  all: SessionRead[],
  session: SessionRead,
): SessionRead | null {
  return all.find((candidate) => candidate.date < session.date) ?? null;
}

/** SessionRead（DB 埋め込み）を WorkoutSession（画面 view-model）へ。 */
export function buildSession(
  read: SessionRead,
  previous: SessionRead | null,
): WorkoutSession {
  const previousTops = new Map<string, string | null>();
  for (const exercise of previous?.exercises ?? []) {
    previousTops.set(exercise.exercise_id, topSetString(exercise.sets));
  }

  const exercises: ExerciseRecord[] = [...read.exercises]
    .sort((a, b) => a.position - b.position)
    .map((exercise) => ({
      id: exercise.exercise_id,
      name: exercise.exercise?.name ?? exercise.exercise_id,
      isCardio: exercise.exercise?.is_cardio ?? false,
      sessionExerciseId: exercise.id,
      previousTop: previousTops.get(exercise.exercise_id) ?? null,
      sets: [...exercise.sets]
        .sort((a, b) => a.set_no - b.set_no)
        .map(
          (set): SetRecord => ({
            id: set.id,
            n: set.set_no,
            kg: set.weight_kg,
            reps: set.reps,
            rpe: set.rpe,
            done: set.done,
            durationMin: set.duration_min,
            distanceKm: set.distance_km,
            kcal: set.kcal,
          }),
        ),
    }));

  const rests = setsOf(read)
    .map((set) => set.rest_sec)
    .filter((rest): rest is number => rest !== null);
  const avgRestSec =
    rests.length > 0
      ? Math.round(rests.reduce((sum, rest) => sum + rest, 0) / rests.length)
      : 0;

  return {
    id: read.id,
    date: read.date,
    title: read.title,
    parts: read.parts,
    startTime: hhmm(read.started_at),
    endTime: hhmm(read.ended_at),
    durationMin: durationMin(read),
    avgRestSec,
    note: read.note,
    tags: read.tags,
    personalBest: read.tags.includes(PB_TAG),
    exercises,
    previous: previous
      ? {
          volumeKg: sessionVolumeKg(previous),
          topSetKg: sessionTopKg(previous),
          durationMin: durationMin(previous),
        }
      : null,
  };
}
