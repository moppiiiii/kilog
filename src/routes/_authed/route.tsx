import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppHeader } from "@/components/kirog/app-header";
import { userQueryOptions } from "@/server/auth";

// 認証ガード（pathless レイアウト）。配下ルートは context.user を非 null で使える。
// 共通ヘッダーもここで 1 度だけ描画し、配下の全画面が同じものを共有する。
export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ context, location }) => {
    const user = await context.queryClient.ensureQueryData(userQueryOptions());
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user }; // 配下ルートの context にマージされる
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();

  return (
    <>
      <AppHeader email={user.email ?? ""} />
      <Outlet />
    </>
  );
}
