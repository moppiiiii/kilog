import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ExerciseRead } from "@/schemas/exercises";
import { deleteExercise, exercisesQueryOptions } from "@/server/exercises";

// 本人用のカスタム種目を削除する。onMutate で候補リストから即時に除き、失敗で巻き戻す。
export function useDeleteExercise() {
  const queryClient = useQueryClient();
  const { queryKey } = exercisesQueryOptions();

  return useMutation({
    mutationFn: (id: string) => deleteExercise({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ExerciseRead[]>(queryKey);
      queryClient.setQueryData<ExerciseRead[]>(queryKey, (old) =>
        (old ?? []).filter((exercise) => exercise.id !== id),
      );
      return { previous };
    },
    onError: (_e, _v, context) =>
      queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
