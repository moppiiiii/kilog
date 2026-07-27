import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type * as z from "zod";

import type {
  AddSessionExerciseValue,
  AddSetValue,
  ConfirmSessionInput,
  CreateSessionValue,
  UpdateSetInputValue,
  WorkoutSession,
} from "@/schemas/workouts";
import {
  activeSessionQueryOptions,
  addSessionExercise,
  addSet,
  confirmSession,
  createSession,
  removeSession,
  removeSessionExercise,
  removeSet,
  updateSet,
} from "@/server/workouts";

type ConfirmValue = z.infer<typeof ConfirmSessionInput>;

// 記録画面のミューテーション束。構造変化（作成・種目/セット追加・削除・確定）は
// 再取得で確定し、セット値の編集だけ onMutate で即時反映する。
// queryKey は購読中のセッション（当日 or /log/$sessionId の過去セッション）を指す。
// 既定は当日セッションで、過去セッション編集時は呼び出し側から渡す。
export function useSessionLogger(
  queryKey: QueryKey = activeSessionQueryOptions().queryKey,
) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    // active / feed / copy-sources は ["workouts"...] 配下、ダッシュボードも当日を集計する。
    void queryClient.invalidateQueries({ queryKey: ["workouts"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: (data: CreateSessionValue) => createSession({ data }),
    onSettled: invalidate,
  });

  const addExercise = useMutation({
    mutationFn: (data: AddSessionExerciseValue) => addSessionExercise({ data }),
    onSettled: invalidate,
  });

  const addSetMutation = useMutation({
    mutationFn: (data: AddSetValue) => addSet({ data }),
    onSettled: invalidate,
  });

  const updateSetMutation = useMutation({
    mutationFn: (data: UpdateSetInputValue) => updateSet({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<WorkoutSession>(queryKey);
      queryClient.setQueryData<WorkoutSession>(queryKey, (old) =>
        old
          ? {
              ...old,
              exercises: old.exercises.map((exercise) => ({
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.id === data.id
                    ? {
                        ...set,
                        kg: data.weight_kg ?? set.kg,
                        reps: data.reps ?? set.reps,
                        rpe: data.rpe !== undefined ? data.rpe : set.rpe,
                        done: data.done ?? set.done,
                      }
                    : set,
                ),
              })),
            }
          : old,
      );
      return { previous };
    },
    onError: (_e, _v, context) =>
      queryClient.setQueryData(queryKey, context?.previous),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeSet({ data: { id } }),
    onSettled: invalidate,
  });

  const confirm = useMutation({
    mutationFn: (data: ConfirmValue) => confirmSession({ data }),
    onSettled: invalidate,
  });

  const removeExercise = useMutation({
    mutationFn: (id: string) => removeSessionExercise({ data: { id } }),
    onSettled: invalidate,
  });

  const removeCurrentSession = useMutation({
    mutationFn: (id: string) => removeSession({ data: { id } }),
    onSettled: invalidate,
  });

  return {
    create,
    addExercise,
    addSet: addSetMutation,
    updateSet: updateSetMutation,
    removeSet: remove,
    confirm,
    removeExercise,
    removeSession: removeCurrentSession,
  };
}
