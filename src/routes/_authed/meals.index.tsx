import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { MealLogger } from "@/components/meals/meal-logger";
import {
  dailyMealsQueryOptions,
  foodCandidatesQueryOptions,
} from "@/server/meals";

export const Route = createFileRoute("/_authed/meals/")({
  // 入力補完の候補も同時に起動する（staleTime が長いので日移動では再取得しない）。
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(dailyMealsQueryOptions()),
      context.queryClient.ensureQueryData(foodCandidatesQueryOptions()),
    ]),
  component: MealsPage,
});

function MealsPage() {
  const { data } = useSuspenseQuery(dailyMealsQueryOptions());

  return (
    <PageShell>
      <MealLogger data={data} />
    </PageShell>
  );
}
