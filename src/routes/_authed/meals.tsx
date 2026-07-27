import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { MealLogger } from "@/components/meals/meal-logger";
import { dailyMealsQueryOptions } from "@/server/meals";

export const Route = createFileRoute("/_authed/meals")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(dailyMealsQueryOptions()),
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
