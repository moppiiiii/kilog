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
