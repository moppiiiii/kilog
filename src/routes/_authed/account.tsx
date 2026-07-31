import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import {
  Divider,
  PageShell,
  Pane,
  Panel,
  SectionTitle,
  TopBar,
} from "@/components/kirog/console";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/use-sign-out";
import { profileQueryOptions } from "@/server/profile";

export const Route = createFileRoute("/_authed/account")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(profileQueryOptions()),
  component: AccountPage,
});

function AccountPage() {
  // ガード（_authed）が context にマージした user。非 null。
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const { data: profile } = useSuspenseQuery(profileQueryOptions());

  return (
    <PageShell>
      <Panel>
        <TopBar>
          <div className="flex items-center gap-3.5">
            <Link to="/" className="text-k-fg-dim hover:text-k-fg text-[13px]">
              <span className="text-k-accent">◂</span> ダッシュボード
            </Link>
            <span className="bg-k-edge h-4 w-px" />
            <span className="text-[15px] font-bold">アカウント</span>
          </div>
        </TopBar>
        <Pane className="space-y-6">
          <div>
            <SectionTitle className="mb-1.5">身長・目標</SectionTitle>
            <p className="text-k-fg-dim mb-4 text-xs">
              身長は BMI
              の計算に、目標値はダッシュボード・食事・レポートの目標表示に使われます。
            </p>
            <ProfileForm profile={profile} />
            {/* 目標値を手で決められない人向けの導線。計算して同じ欄へ書き戻す。 */}
            <Link
              to="/account/targets"
              className="border-k-line bg-k-raised hover:border-k-accent-edge mt-5 flex max-w-md items-center gap-3 rounded-[10px] border px-3.5 py-3 transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">
                  目標カロリーと PFC を計算する
                </span>
                <span className="text-k-fg-dim mt-0.5 block text-[11px]">
                  身長・体重・体脂肪率から算出し、PFC の考え方も解説します
                </span>
              </span>
              <span className="text-k-accent shrink-0 text-sm">▸</span>
            </Link>
          </div>

          <Divider />

          <div className="space-y-3">
            <p className="text-k-fg-muted text-sm">
              ログイン中:{" "}
              <span className="text-k-fg font-medium">{user.email}</span>
            </p>
            <Button
              variant="secondary"
              className="rounded-[9px]"
              disabled={signOut.isPending}
              onClick={() =>
                signOut.mutate(undefined, {
                  onSuccess: () => navigate({ to: "/login" }),
                })
              }
            >
              ログアウト
            </Button>
          </div>
        </Pane>
      </Panel>
    </PageShell>
  );
}
