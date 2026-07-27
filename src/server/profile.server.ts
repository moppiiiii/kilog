import type { $supabaseServer } from "@/lib/supabase/server";
import { normalizeProfile, type Profile } from "@/schemas/profile";

// プロフィール読み取りの server-only ヘルパー。
// `.server.ts` にすることで、集計 serverFn から共有 export してもクライアント束に混ざらない。
// 呼び出し側が生成済みの $supabase を渡す（同一リクエストで getSession を二重に呼ばない）。

type Server = Awaited<ReturnType<typeof $supabaseServer>>;

/** 現在ユーザーのプロフィールを正規化して返す。行が無ければテーブル default 相当で埋める。 */
export async function loadProfile($supabase: Server): Promise<Profile> {
  const rows = (await $supabase("@select/profiles", {})).unwrapOr([]);
  return normalizeProfile(rows[0] ?? null);
}
