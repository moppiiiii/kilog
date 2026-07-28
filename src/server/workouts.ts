import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import {
  addDaysIso,
  dow,
  monthDay,
  num,
  signedPct,
  timeHm,
  todayIso,
  toneOf,
} from "@/lib/format";
import { $supabaseServer } from "@/lib/supabase/server";
import type { MealEntryRead } from "@/schemas/meals";
import {
  AddSessionExerciseInput,
  AddSetInput,
  ConfirmSessionInput,
  CopySessionInput,
  type CopySource,
  CreateSessionInput,
  type LogFeed,
  LogFeedQuery,
  type LogFeedQueryInput,
  type LogRow,
  type RestContext,
  SessionExerciseIdInput,
  SessionIdInput,
  type SessionRead,
  SetIdInput,
  UpdateSetInput,
  type WorkoutSession,
} from "@/schemas/workouts";

import {
  buildSession,
  findPrevious,
  loadMealEntries,
  loadSessions,
  sessionVolumeKg,
} from "./sessions.server";

// トレーニングの serverFn。DB 読み取り・集計は sessions.server.ts に寄せ、
// ここは view-model への整形と serverFn / queryOptions だけを持つ（auth.ts と同じ形）。

const LOG_PAGE_SIZE = 10;

/** 期間フィルタの開始日（この日以降を残す）。all は無制限。今日から遡るローリング窓。 */
function periodStartIso(period: LogFeedQueryInput["period"]): string | null {
  if (period === "all") return null;
  const days = period === "week" ? 7 : period === "month" ? 30 : 90;
  return addDaysIso(todayIso(), -(days - 1));
}

const EMPTY_SESSION: WorkoutSession = {
  id: "",
  date: todayIso(),
  title: "セッションなし",
  parts: [],
  startTime: "",
  endTime: "",
  durationMin: 0,
  avgRestSec: 0,
  note: "",
  tags: [],
  personalBest: false,
  exercises: [],
  previous: null,
};

/**
 * 記録中のセッション＝当日の未確定（ended_at が null）セッション。無ければ空（id=""）。
 * 確定すると対象外になり開始画面へ戻るので、同日に複数セッションを開始できる。
 * loadSessions は date → started_at の降順なので find で最新の未確定を拾う。
 */
export const getActiveSession = createServerFn().handler(
  async (): Promise<WorkoutSession> => {
    const all = await loadSessions();
    const today = todayIso();
    const active = all.find(
      (session) => session.date === today && session.ended_at === null,
    );
    if (!active) return EMPTY_SESSION;
    return buildSession(active, findPrevious(all, active));
  },
);

export const activeSessionQueryOptions = () =>
  queryOptions({
    queryKey: ["workouts", "active"],
    queryFn: () => getActiveSession(),
  });

export const getWorkoutSession = createServerFn()
  .validator(SessionIdInput)
  .handler(async ({ data }): Promise<WorkoutSession> => {
    const all = await loadSessions();
    const session = all.find((candidate) => candidate.id === data.id);
    if (!session) throw notFound();
    return buildSession(session, findPrevious(all, session));
  });

export const workoutSessionQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["workouts", "session", id],
    queryFn: () => getWorkoutSession({ data: { id } }),
  });

// ─── ログフィード（トレーニング＋食事の混在時系列） ──────────────────────────

function trainingRow(read: SessionRead, previous: SessionRead | null): LogRow {
  const volume = sessionVolumeKg(read);
  const detail = `${read.exercises
    .map((exercise) => exercise.exercise?.name ?? exercise.exercise_id)
    .join("・")} / ${read.exercises.length}種目`;
  const deltaPct =
    previous && sessionVolumeKg(previous) > 0
      ? ((volume - sessionVolumeKg(previous)) / sessionVolumeKg(previous)) * 100
      : null;
  return {
    id: `t-${read.id}`,
    date: monthDay(read.date),
    iso: read.date,
    dow: dow(read.date),
    kind: "training",
    title: read.title,
    detail,
    metric: `${num(volume)} kg`,
    delta: deltaPct === null ? "—" : signedPct(deltaPct),
    tone: deltaPct === null ? "flat" : toneOf(deltaPct),
    sessionId: read.id,
  };
}

function mealRow(date: string, entries: MealEntryRead[]): LogRow {
  const kcal = entries.reduce((sum, entry) => sum + entry.kcal, 0);
  const p = Math.round(entries.reduce((s, e) => s + e.protein_g, 0));
  const f = Math.round(entries.reduce((s, e) => s + e.fat_g, 0));
  const c = Math.round(entries.reduce((s, e) => s + e.carb_g, 0));
  return {
    id: `m-${date}`,
    date: monthDay(date),
    iso: date,
    dow: dow(date),
    kind: "meal",
    title: `1日の食事 ${entries.length}品`,
    detail: `P${p} · F${f} · C${c}`,
    metric: `${num(kcal)} kcal`,
    delta: "—",
    tone: "flat",
    sessionId: null,
  };
}

/** 一覧の 1 行を iso 日付付きで持つ中間表現（並び替え・期間フィルタ用）。 */
type FeedItem = {
  iso: string;
  kind: LogRow["kind"];
  row: LogRow;
  text: string;
  /** 部位フィルタ用。食事行は空。 */
  parts: string[];
};

/** セッションに紐づく部位（セッションの parts と、実際に行った種目の部位の和集合）。 */
function sessionPartList(read: SessionRead): string[] {
  return [
    ...new Set([
      ...read.parts,
      ...read.exercises.flatMap((exercise) => exercise.exercise?.part ?? []),
    ]),
  ];
}

// ─── フリーワード検索 ────────────────────────────────────────────────────────
// 画面に出ている文字だけでなく、種目名・部位・カテゴリ・タグ・食品名まで検索対象に含める。

type SessionExerciseEmbed = SessionRead["exercises"][number];

/**
 * 日付の検索表記。表示は "07/28"（ゼロ埋め）だが、"7/28"・"7月28日"・ISO・曜日でも引けるよう
 * 表記ゆれをまとめて並べる。
 */
function dateText(iso: string): string {
  const [y = "", m = "", d = ""] = iso.split("-");
  const mn = Number(m);
  const dn = Number(d);
  return [
    iso,
    `${y}/${m}/${d}`,
    `${m}/${d}`,
    `${mn}/${dn}`,
    `${mn}月${dn}日`,
    dow(iso),
  ].join(" ");
}

/** 種目 1 件の検索語（種目名・部位・有酸素/筋トレの別）。 */
function exerciseText(embed: SessionExerciseEmbed): string {
  const exercise = embed.exercise;
  return [
    exercise?.name ?? embed.exercise_id,
    exercise?.part ?? "",
    exercise?.is_cardio ? "有酸素 カーディオ cardio" : "筋トレ ウェイト",
  ].join(" ");
}

/** セッションの検索対象テキスト（日付・タイトル・部位・タグ・種目・カテゴリ・メモ）。 */
function sessionText(read: SessionRead): string {
  return [
    dateText(read.date),
    "トレーニング",
    read.title,
    ...read.parts,
    ...read.tags,
    read.note,
    ...read.exercises.map(exerciseText),
  ].join(" ");
}

/** 食事 1 日分の検索対象テキスト（日付・食品名・量）。 */
function mealText(date: string, entries: MealEntryRead[]): string {
  return [
    dateText(date),
    "食事",
    ...entries.flatMap((e) => [e.name, e.qty]),
  ].join(" ");
}

/**
 * 空白区切りの語をすべて含むか（大文字小文字を無視した AND 検索）を返す判定関数。
 * 空クエリなら常に true＝絞り込みなし。
 */
function makeMatcher(q: string): (text: string) => boolean {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return () => true;
  return (text) => {
    const lower = text.toLowerCase();
    return terms.every((term) => lower.includes(term));
  };
}

export const getLogFeed = createServerFn()
  .validator(LogFeedQuery)
  .handler(async ({ data }): Promise<LogFeed> => {
    const { kind, period, page, q, part } = data;
    const sessions = await loadSessions();
    const entries = await loadMealEntries();
    const matches = makeMatcher(q);
    /** 部位フィルタ。食事行は部位を持たないので、指定時は自動的に除外される。 */
    const inPart = (parts: string[]) => part === "" || parts.includes(part);

    // 食事は日付ごとに 1 行へまとめる。
    const mealsByDate = new Map<string, MealEntryRead[]>();
    for (const entry of entries) {
      const list = mealsByDate.get(entry.date) ?? [];
      list.push(entry);
      mealsByDate.set(entry.date, list);
    }

    // 検索対象テキストは行・サマリーの両方で使うので 1 度だけ組む。
    const sessionTexts = new Map(
      sessions.map((session) => [session.id, sessionText(session)]),
    );
    const mealTexts = new Map(
      [...mealsByDate.entries()].map(([date, list]) => [
        date,
        mealText(date, list),
      ]),
    );

    // 部位もテキストと同じく、行・サマリー・チップ一覧で使い回す。
    const sessionParts = new Map(
      sessions.map((session) => [session.id, sessionPartList(session)]),
    );

    const items: FeedItem[] = [
      ...sessions.map((session) => ({
        iso: session.date,
        kind: "training" as const,
        row: trainingRow(session, findPrevious(sessions, session)),
        text: sessionTexts.get(session.id) ?? "",
        parts: sessionParts.get(session.id) ?? [],
      })),
      ...[...mealsByDate.entries()].map(([date, list]) => ({
        iso: date,
        kind: "meal" as const,
        row: mealRow(date, list),
        text: mealTexts.get(date) ?? "",
        parts: [] as string[],
      })),
    ];

    // 日付の新しい順にマージ（同日はトレーニングを先に）。iso で比較して年跨ぎも正しく。
    items.sort((a, b) => {
      if (a.iso === b.iso) return a.kind === "training" ? -1 : 1;
      return a.iso < b.iso ? 1 : -1;
    });

    // 期間 → 検索 → 部位の順に絞り、種別ごとの件数（サイドバー用。種別選択には依存させない）。
    const from = periodStartIso(period);
    const inPeriod = from ? items.filter((item) => item.iso >= from) : items;
    const found = inPeriod.filter((item) => matches(item.text));
    const scoped = found.filter((item) => inPart(item.parts));
    const counts = {
      all: scoped.length,
      training: scoped.filter((item) => item.kind === "training").length,
      meal: scoped.filter((item) => item.kind === "meal").length,
    };

    // 種別フィルタ → ページング。total は現在の絞り込み後の件数。
    const filtered =
      kind === "all" ? scoped : scoped.filter((item) => item.kind === kind);
    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), pageCount);
    const start = (safePage - 1) * LOG_PAGE_SIZE;
    const rows = filtered
      .slice(start, start + LOG_PAGE_SIZE)
      .map((item) => item.row);

    // サマリーは期間＋検索＋部位で集計する（種別・ページには依存させない）。
    const foundSessions = sessions.filter(
      (session) =>
        (!from || session.date >= from) &&
        matches(sessionTexts.get(session.id) ?? ""),
    );
    const scopedSessions = foundSessions.filter((session) =>
      inPart(sessionParts.get(session.id) ?? []),
    );
    const totalVolume = scopedSessions.reduce(
      (sum, session) => sum + sessionVolumeKg(session),
      0,
    );
    // 部位を選ぶと食事は対象外になるので、平均 kcal もその指定に従う。
    const periodMealKcals =
      part === ""
        ? [...mealsByDate.entries()]
            .filter(
              ([date]) =>
                (!from || date >= from) && matches(mealTexts.get(date) ?? ""),
            )
            .map(([, list]) => list.reduce((sum, entry) => sum + entry.kcal, 0))
        : [];
    const avgKcal = periodMealKcals.length
      ? Math.round(
          periodMealKcals.reduce((s, k) => s + k, 0) / periodMealKcals.length,
        )
      : 0;

    // チップ一覧は部位フィルタ前の集合から作る（選択中でも他の部位へ切り替えられる）。
    const parts = [
      ...new Set(
        foundSessions.flatMap((session) => sessionParts.get(session.id) ?? []),
      ),
    ];

    return {
      rows,
      total,
      page: safePage,
      pageSize: LOG_PAGE_SIZE,
      counts,
      summary: {
        sessions: counts.training,
        volumeTons: Math.round((totalVolume / 1000) * 10) / 10,
        avgKcal,
        weightDeltaKg: 0,
      },
      parts,
    };
  });

export const logFeedQueryOptions = (query: LogFeedQueryInput) =>
  queryOptions({
    queryKey: ["workouts", "feed", query],
    queryFn: () => getLogFeed({ data: query }),
  });

// ─── 前回コピー（8A）のコピー元候補 ─────────────────────────────────────────

export const getCopySources = createServerFn().handler(
  async (): Promise<CopySource[]> => {
    const sessions = await loadSessions();
    return sessions.slice(0, 6).map((session) => ({
      id: session.id,
      name: session.title,
      date: session.date,
      exerciseCount: session.exercises.length,
      volumeKg: sessionVolumeKg(session),
      // 選択即プレビューにしたいので、候補ごとに種目・セットまで持たせる（最大 6 件）。
      exercises: buildSession(session, findPrevious(sessions, session))
        .exercises,
    }));
  },
);

/**
 * コピー元セッションを今日の新しいセッションとして複製する。
 * 重量は bumpKg を一律加算し、実施状態（done / rpe / 休憩）は引き継がない
 * （これから実施する記録なので、値は「前回の目標」として置くだけ）。
 */
export const copySession = createServerFn({ method: "POST" })
  .validator(CopySessionInput)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const sessions = await loadSessions();
    const source = sessions.find((candidate) => candidate.id === data.sourceId);
    if (!source) throw notFound();

    const $supabase = await $supabaseServer();
    const id = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    const created = await $supabase("@insert/workout_sessions", {
      data: {
        id,
        date: todayIso(),
        // 同日に複数セッションを開始できるよう、記録画面と同じ命名規則に合わせる。
        title: `セッション ${timeHm(startedAt)}`,
        parts: source.parts,
        started_at: startedAt,
      },
    });
    if (created.isErr()) throw created.error;

    const ordered = [...source.exercises].sort(
      (a, b) => a.position - b.position,
    );
    const exerciseRows = ordered.map((exercise, index) => ({
      id: crypto.randomUUID(),
      session_id: id,
      exercise_id: exercise.exercise_id,
      position: index,
    }));
    if (exerciseRows.length === 0) return { id };

    const addedExercises = await $supabase("@insert/session_exercises", {
      data: exerciseRows,
    });
    if (addedExercises.isErr()) throw addedExercises.error;

    const setRows = ordered.flatMap((exercise, index) =>
      [...exercise.sets]
        .sort((a, b) => a.set_no - b.set_no)
        .map((set, position) => ({
          id: crypto.randomUUID(),
          session_exercise_id: exerciseRows[index]!.id,
          set_no: position + 1,
          weight_kg: Math.max(0, set.weight_kg + data.bumpKg),
          reps: set.reps,
          rpe: null,
          rest_sec: null,
          done: false,
          duration_min: set.duration_min,
          distance_km: set.distance_km,
          kcal: set.kcal,
        })),
    );
    if (setRows.length > 0) {
      const addedSets = await $supabase("@insert/workout_sets", {
        data: setRows,
      });
      if (addedSets.isErr()) throw addedSets.error;
    }

    return { id };
  });

export const copySourcesQueryOptions = () =>
  queryOptions({
    queryKey: ["workouts", "copy-sources"],
    queryFn: () => getCopySources(),
  });

// ─── 休憩タイマー（9A）が必要とするセッション文脈 ────────────────────────────

const EMPTY_REST: RestContext = {
  sessionTitle: "セッションなし",
  elapsedSec: 0,
  exerciseName: "",
  setNo: 0,
  setTotal: 0,
  targetKg: 0,
  targetReps: 0,
  recommendedRestSec: [120, 180],
  doneSets: [],
};

export const getRestContext = createServerFn().handler(
  async (): Promise<RestContext> => {
    const all = await loadSessions();
    const active = all[0];
    if (!active) return EMPTY_REST;
    const session = buildSession(active, findPrevious(all, active));

    // 未完了のセットがある種目を「進行中」とみなす。無ければ最後の種目。
    const current =
      session.exercises.find((exercise) =>
        exercise.sets.some((set) => !set.done),
      ) ?? session.exercises.at(-1);
    if (!current) return { ...EMPTY_REST, sessionTitle: session.title };

    const nextSet =
      current.sets.find((set) => !set.done) ?? current.sets.at(-1);
    const doneSets = current.sets.filter((set) => set.done);
    const elapsedSec = active.started_at
      ? Math.max(
          0,
          Math.round(
            (Date.now() - new Date(active.started_at).getTime()) / 1000,
          ),
        )
      : 0;

    return {
      sessionTitle: session.title,
      elapsedSec,
      exerciseName: current.name,
      setNo: nextSet?.n ?? current.sets.length,
      setTotal: current.sets.length,
      targetKg: nextSet?.kg ?? 0,
      targetReps: nextSet?.reps ?? 0,
      recommendedRestSec: [120, 180],
      doneSets,
    };
  },
);

export const restContextQueryOptions = () =>
  queryOptions({
    queryKey: ["workouts", "rest"],
    queryFn: () => getRestContext(),
  });

// ─── 記録の書き込み（mutation） ──────────────────────────────────────────────
// 子行の id はクライアント生成（RETURNING なしのため）。検証は schemas/ の zod を共有。

/** 当日セッションを作成する。id は呼び出し側で uuid 生成して渡す。 */
export const createSession = createServerFn({ method: "POST" })
  .validator(CreateSessionInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@insert/workout_sessions", { data });
    if (result.isErr()) throw result.error;
  });

/** セッションに種目を追加する。 */
export const addSessionExercise = createServerFn({ method: "POST" })
  .validator(AddSessionExerciseInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@insert/session_exercises", { data });
    if (result.isErr()) throw result.error;
  });

/** 種目にセットを追加する。 */
export const addSet = createServerFn({ method: "POST" })
  .validator(AddSetInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@insert/workout_sets", { data });
    if (result.isErr()) throw result.error;
  });

/** セット値（kg / reps / rpe / done）を更新する。 */
export const updateSet = createServerFn({ method: "POST" })
  .validator(UpdateSetInput)
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const $supabase = await $supabaseServer();
    const result = await $supabase("@update/workout_sets", {
      data: rest,
      match: { id },
    });
    if (result.isErr()) throw result.error;
  });

/** セットを削除する。 */
export const removeSet = createServerFn({ method: "POST" })
  .validator(SetIdInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@delete/workout_sets", {
      match: { id: data.id },
    });
    if (result.isErr()) throw result.error;
  });

/** 記録を確定する（ended_at をセット）。 */
export const confirmSession = createServerFn({ method: "POST" })
  .validator(ConfirmSessionInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@update/workout_sessions", {
      data: { ended_at: data.ended_at },
      match: { id: data.id },
    });
    if (result.isErr()) throw result.error;
  });

/** 種目（session_exercises 行）を削除する。子のセットは FK の cascade で消える想定。 */
export const removeSessionExercise = createServerFn({ method: "POST" })
  .validator(SessionExerciseIdInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@delete/session_exercises", {
      match: { id: data.id },
    });
    if (result.isErr()) throw result.error;
  });

/** セッションを丸ごと削除する。子の種目・セットは FK の cascade で消える想定。 */
export const removeSession = createServerFn({ method: "POST" })
  .validator(SessionIdInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@delete/workout_sessions", {
      match: { id: data.id },
    });
    if (result.isErr()) throw result.error;
  });
