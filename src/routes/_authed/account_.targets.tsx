import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/kirog/console";
import { TargetCalculator } from "@/components/profile/target-calculator";
import { bodyLogQueryOptions } from "@/server/body";
import { profileQueryOptions } from "@/server/profile";

// 目標カロリー / PFC の計算ページ（/account/targets）。account.tsx はレイアウトでは
// ないので、末尾の `_` で親の入れ子から外している。
// 身長は profiles、体重・体脂肪率は body_measurements の直近行を使うため両方を起動する。
export const Route = createFileRoute("/_authed/account_/targets")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(profileQueryOptions()),
      context.queryClient.ensureQueryData(bodyLogQueryOptions()),
    ]),
  component: TargetsPage,
});

function TargetsPage() {
  const { data: profile } = useSuspenseQuery(profileQueryOptions());
  const { data: body } = useSuspenseQuery(bodyLogQueryOptions());

  return (
    <PageShell>
      <TargetCalculator profile={profile} body={body} />
    </PageShell>
  );
}
