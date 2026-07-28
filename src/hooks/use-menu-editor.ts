import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  AddMenuExerciseValue,
  CreateMenuValue,
  StartMenuSessionValue,
  UpdateMenuExerciseValue,
  UpdateMenuValue,
} from "@/schemas/menus";
import {
  addMenuExercise,
  createMenu,
  deleteMenu,
  removeMenuExercise,
  startMenuSession,
  updateMenu,
  updateMenuExercise,
} from "@/server/menus";

// マイメニュー（10A）のミューテーション束。編集はすべて即時保存し、再取得で確定する。
export function useMenuEditor() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["menus"] });
  };

  const create = useMutation({
    mutationFn: (data: CreateMenuValue) => createMenu({ data }),
    onSettled: invalidate,
  });

  const update = useMutation({
    mutationFn: (data: UpdateMenuValue) => updateMenu({ data }),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMenu({ data: { id } }),
    onSettled: invalidate,
  });

  const addExercise = useMutation({
    mutationFn: (data: AddMenuExerciseValue) => addMenuExercise({ data }),
    onSettled: invalidate,
  });

  const updateExercise = useMutation({
    mutationFn: (data: UpdateMenuExerciseValue) => updateMenuExercise({ data }),
    onSettled: invalidate,
  });

  const removeExercise = useMutation({
    mutationFn: (id: string) => removeMenuExercise({ data: { id } }),
    onSettled: invalidate,
  });

  const start = useMutation({
    mutationFn: (data: StartMenuSessionValue) => startMenuSession({ data }),
    onSettled: () => {
      // 起こしたセッションは記録画面・履歴・ダッシュボードのすべてに出る。
      void queryClient.invalidateQueries({ queryKey: ["workouts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return {
    create,
    update,
    remove,
    addExercise,
    updateExercise,
    removeExercise,
    start,
  };
}
