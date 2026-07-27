import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CreateExerciseValue, ExerciseRead } from "@/schemas/exercises";
import { createExercise, exercisesQueryOptions } from "@/server/exercises";

// 本人用のカスタム種目を作成する。onMutate で候補リストへ即時反映し、失敗で巻き戻す。
export function useCreateExercise() {
  const queryClient = useQueryClient();
  const { queryKey } = exercisesQueryOptions();

  return useMutation({
    mutationFn: (data: CreateExerciseValue) => createExercise({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ExerciseRead[]>(queryKey);
      const optimistic: ExerciseRead = {
        id: data.id,
        name: data.name,
        part: data.part,
        is_bodyweight: data.is_bodyweight ?? false,
        is_cardio: data.is_cardio ?? false,
        owner_id: null,
      };
      queryClient.setQueryData<ExerciseRead[]>(queryKey, (old) =>
        [...(old ?? []), optimistic].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      return { previous };
    },
    onError: (_e, _v, context) =>
      queryClient.setQueryData(queryKey, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
