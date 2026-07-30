import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { MealLogger } from "@/components/meals/meal-logger";
import { IsoDate } from "@/schemas/meals";
import {
  dailyMealsQueryOptions,
  foodCandidatesQueryOptions,
} from "@/server/meals";

// 指定日の食事。/meals は当日、こちらは日付指定で任意の日を開く（/log/$sessionId と同じ形）。
export const Route = createFileRoute("/_authed/meals/$date")({
  loader: ({ context, params }) => {
    // YYYY-MM-DD 以外の URL は 404（fetch 前に弾く）。
    if (!IsoDate.safeParse(params.date).success) throw notFound();
    return Promise.all([
      context.queryClient.ensureQueryData(dailyMealsQueryOptions(params.date)),
      context.queryClient.ensureQueryData(foodCandidatesQueryOptions()),
    ]);
  },
  component: MealsByDatePage,
});

function MealsByDatePage() {
  const { date } = Route.useParams();
  const { data } = useSuspenseQuery(dailyMealsQueryOptions(date));

  return (
    <PageShell>
      <MealLogger
        data={data}
        queryKey={dailyMealsQueryOptions(date).queryKey}
      />
    </PageShell>
  );
}
