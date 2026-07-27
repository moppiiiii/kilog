import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { $supabaseServer } from "@/lib/supabase/server";
import type { WorkoutMenu } from "@/schemas/menus";

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
