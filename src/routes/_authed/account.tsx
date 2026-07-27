import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { Pane, PageShell, Panel, TopBar } from "@/components/kirog/console";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/use-sign-out";

export const Route = createFileRoute("/_authed/account")({
  component: AccountPage,
});

function AccountPage() {
  // ガード（_authed）が context にマージした user。非 null。
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const signOut = useSignOut();

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
        <Pane className="space-y-5">
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
        </Pane>
      </Panel>
    </PageShell>
  );
}
