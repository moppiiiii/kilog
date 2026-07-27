# リソースの追加手順

新しいテーブル（例: `posts`）を足すときの流れ。以下のコードがそのまま雛形になる。

> 既存リソース（`profiles` / `exercises` / `meal_entries` / `foods` / `workout_menus` / `workout_sessions` ...）はこの手順で `appSchema` を通している。`src/schemas/meals.ts`・`src/server/meals.ts` が読み取りの、`src/schemas/body.ts` の書き込み断片（`@insert`/`@update`）が雛形になる。

## 1. スキーマを定義する — `src/schemas/posts.ts`

```ts
import * as z from "zod";
import {
  createSupabaseSchema,
  deleteFrom,
  insert,
  select,
  update,
} from "@/lib/supabase/query";

export const GET_POSTS_QUERY = "id, title, body, created_at";

// 全カラム（filter のカラム型はこれ由来）
export const PostEntitySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// レスポンス（pick → 必要なら transform で camelCase）
export const PostResponseSchema = PostEntitySchema.pick({
  id: true,
  title: true,
  body: true,
  created_at: true,
}).transform((row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  createdAt: row.created_at,
}));

export type Post = z.infer<typeof PostResponseSchema>;

// API リクエスト（serverFn の入力契約）は名前付きで置き、操作 input と
// serverFn の `.validator()` の両方から共有する（src/server/ に zod を書かない）。
export const AddPostInput = z.object({ title: z.string().min(1), body: z.string() });
export const UpdatePostInput = z.object({ title: z.string().min(1).optional() });
export const RemovePostInput = z.object({ id: z.string().uuid() });

export const postsSchema = createSupabaseSchema({
  "@select/posts": select({
    output: z.array(PostResponseSchema),
    select: GET_POSTS_QUERY,
    row: PostEntitySchema,
  }),
  "@insert/posts": insert({ input: AddPostInput }),
  "@update/posts": update({
    input: UpdatePostInput,
    row: PostEntitySchema, // match を Partial<Row> で型付け（カラム名・値のタイポを弾く）
  }),
  "@delete/posts": deleteFrom({ row: PostEntitySchema }),
});
```

## 2. appSchema に合流させる — `src/schemas/index.ts`

```ts
import { postsSchema } from "./posts";

export const appSchema = {
  ...postsSchema, // ← 追加。2 本目以降も同じようにスプレッドで並べる
};
```

## 3. serverFn を書く — `src/server/posts.ts`

```ts
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { $supabaseServer } from "@/lib/supabase/server";
import { AddPostInput, type Post } from "@/schemas/posts";

export const getPosts = createServerFn().handler(async (): Promise<Post[]> => {
  const $supabase = await $supabaseServer();
  const result = await $supabase("@select/posts", {
    filter: (q) => q.order("created_at", { ascending: false }),
  });
  return result.unwrapOr([]);
});

export const postsQueryOptions = () =>
  queryOptions({ queryKey: ["posts"], queryFn: () => getPosts() });

// .validator は schemas/ の名前付きスキーマを参照するだけ（zod をここで定義しない）。
export const addPost = createServerFn({ method: "POST" })
  .validator(AddPostInput)
  .handler(async ({ data }) => {
    const $supabase = await $supabaseServer();
    const result = await $supabase("@insert/posts", { data });
    if (result.isErr()) throw result.error;
  });
```

> mutation はすべて `method: "POST"`（serverFn は GET/POST のみ。delete も POST）。
> serverFn の `.validator()` に渡す zod は `schemas/` に名前付きで置き、ここでは import して参照するだけにする（`src/server/` に zod を定義しない）。

## 4.（必要なら）楽観的更新フック — `src/hooks/use-add-post.ts`

`onMutate` でキャッシュを即時更新 → `onError` で巻き戻し → `onSettled` で `invalidateQueries`。クエリキーは `postsQueryOptions().queryKey` から取得してドリフトを防ぐ。serverFn を叩くフックの形は `src/hooks/use-sign-in.ts` が参考になる（こちらは楽観更新なし・成功時にキャッシュを差し替えるだけ）。

```ts
export function useAddPost() {
  const queryClient = useQueryClient();
  const key = postsQueryOptions().queryKey;

  return useMutation({
    mutationFn: (data: z.infer<typeof AddPostInput>) => addPost({ data }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old) => [...(old ?? []), { ...data, id: `temp-${crypto.randomUUID()}` }]);
      return { previous };            // ← onError へ渡すスナップショット
    },
    onError: (_e, _v, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
```

mutation は `RETURNING` なし（`void`）なので、採番される id は temp-id で埋めて `onSettled` の再取得で確定させる。新しいフックには「即時反映 → 失敗で巻き戻し」を serverFn のモックで検証するテストを添えると安全（`src/lib/supabase/query.test.ts` と同じく vitest）。

**作成/編集フォームを足すとき**は `@tanstack/react-form`（`useForm` ＋ `form.Field`）で書き、検証は `schemas/` の zod（例: `AddPostInput`）を `validators` に渡して共有する。素の `useState` で値を持たない。フォーム本体は `components/<resource>/` に置き、route は薄く保つ。詳細と雛形は [architecture.md](./architecture.md#フォーム)（`src/components/auth/login-form.tsx`）を参照。

## 5. ルートで使う — `src/routes/posts.tsx`

```ts
export const Route = createFileRoute("/posts")({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQueryOptions()),
  component: PostsPage,
});

function PostsPage() {
  const { data: posts } = useSuspenseQuery(postsQueryOptions());
  // ...
}
```

> ログイン必須のリソースなら route は `src/routes/_authed/posts.tsx`（URL: `/posts`）に置く。
> `_authed/route.tsx` のガードを継承するので、route 側にガードは書かない（[architecture.md](./architecture.md#認証ガード保護ルート) 参照）。

## チェックリスト

- [ ] `schemas/<resource>.ts`（Entity → Response、操作断片）
- [ ] `schemas/index.ts` の `appSchema` に合流
- [ ] `server/<resource>.ts`（serverFn ＋ queryOptions）
- [ ] 必要なら `hooks/use-*.ts`（楽観的更新）
- [ ] `components/<resource>/` と `routes/`
- [ ] `bun run check`（tsgo ＋ oxlint ＋ oxfmt）が通る
