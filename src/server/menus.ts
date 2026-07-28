import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { timeHm, todayIso } from "@/lib/format";
import { $supabaseServer } from "@/lib/supabase/server";
import {
  AddMenuExerciseInput,
  CreateMenuInput,
  MenuExerciseIdInput,
  MenuIdInput,
  StartMenuSessionInput,
  UpdateMenuExerciseInput,
  UpdateMenuInput,
  type WorkoutMenu,
} from "@/schemas/menus";

// workout_menus ＋ menu_exercises（種目名は exercises を埋め込み）から定番メニューを組む。

export const getMenus = createServerFn().handler(
  async (): Promise<WorkoutMenu[]> => {
    const $supabase = await $supabaseServer();
    const menus = (
      await $supabase("@select/workout_menus", {
        filter: (q) => q.order("position"),
      })
    ).unwrapOr([]);

    return menus.map((menu) => ({
      id: menu.id,
      kind: menu.kind,
      name: menu.name,
      icon: menu.icon,
      parts: menu.parts,
      summary: menu.parts.join("・"),
      estimatedMin: menu.estimated_min,
      favorite: menu.favorite,
      exercises: [...menu.exercises]
        .sort((a, b) => a.position - b.position)
        .map((exercise) => ({
          rowId: exercise.id,
          id: exercise.exercise_id,
          name: exercise.exercise?.name ?? exercise.exercise_id,
          sets: exercise.target_sets,
          reps: exercise.target_reps,
          restSec: exercise.rest_sec,
        })),
    }));
  },
);

export const menusQueryOptions = () =>
  queryOptions({ queryKey: ["menus"], queryFn: () => getMenus() });

// ─── 書き込み（メニュー編集） ────────────────────────────────────────────────

export const createMenu = createServerFn({ method: "POST" })
  .validator(CreateMenuInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@insert/workout_menus", { data });
    if (result.isErr()) throw result.error;
  });

export const updateMenu = createServerFn({ method: "POST" })
  .validator(UpdateMenuInput)
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const $supabase = await $supabaseServer();
    const result = await $supabase("@update/workout_menus", {
      data: rest,
      match: { id },
    });
    if (result.isErr()) throw result.error;
  });

/** メニューを削除する。子行（menu_exercises）を先に消してから本体を消す。 */
export const deleteMenu = createServerFn({ method: "POST" })
  .validator(MenuIdInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const children = await $supabase("@delete/menu_exercises", {
      match: { menu_id: data.id },
    });
    if (children.isErr()) throw children.error;
    const result = await $supabase("@delete/workout_menus", {
      match: { id: data.id },
    });
    if (result.isErr()) throw result.error;
  });

export const addMenuExercise = createServerFn({ method: "POST" })
  .validator(AddMenuExerciseInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@insert/menu_exercises", { data });
    if (result.isErr()) throw result.error;
  });

export const updateMenuExercise = createServerFn({ method: "POST" })
  .validator(UpdateMenuExerciseInput)
  .handler(async ({ data }) => {
    const { id, ...rest } = data;
    const $supabase = await $supabaseServer();
    const result = await $supabase("@update/menu_exercises", {
      data: rest,
      match: { id },
    });
    if (result.isErr()) throw result.error;
  });

export const removeMenuExercise = createServerFn({ method: "POST" })
  .validator(MenuExerciseIdInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@delete/menu_exercises", {
      match: { id: data.id },
    });
    if (result.isErr()) throw result.error;
  });

/**
 * メニューから当日セッションを起こす。種目と、target_sets 本の未実施セット
 * （重量 0・目標レップ）を作る。実施値は記録画面で上書きしていく。
 */
export const startMenuSession = createServerFn({ method: "POST" })
  .validator(StartMenuSessionInput)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const $supabase = await $supabaseServer();
    const menus = (
      await $supabase("@select/workout_menus", {
        filter: (q) => q.eq("id", data.menuId),
      })
    ).unwrapOr([]);
    const menu = menus[0];
    if (!menu) throw notFound();

    const id = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const created = await $supabase("@insert/workout_sessions", {
      data: {
        id,
        date: todayIso(),
        title: `${menu.name} ${timeHm(startedAt)}`,
        parts: menu.parts,
        started_at: startedAt,
      },
    });
    if (created.isErr()) throw created.error;

    const ordered = [...menu.exercises].sort((a, b) => a.position - b.position);
    if (ordered.length === 0) return { id };

    const exerciseRows = ordered.map((exercise, index) => ({
      id: crypto.randomUUID(),
      session_id: id,
      exercise_id: exercise.exercise_id,
      position: index,
    }));
    const addedExercises = await $supabase("@insert/session_exercises", {
      data: exerciseRows,
    });
    if (addedExercises.isErr()) throw addedExercises.error;

    const setRows = ordered.flatMap((exercise, index) =>
      Array.from({ length: exercise.target_sets }, (_, position) => ({
        id: crypto.randomUUID(),
        session_exercise_id: exerciseRows[index]!.id,
        set_no: position + 1,
        weight_kg: 0,
        reps: exercise.target_reps,
        rpe: null,
        rest_sec: null,
        done: false,
        duration_min: null,
        distance_km: null,
        kcal: null,
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
