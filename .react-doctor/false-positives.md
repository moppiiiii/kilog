# React Doctor — 既知の誤検知・意図的な保留

`/doctor` の triage はスキャン後にこのファイルを読み、ここに書かれた形に一致する指摘を落とす。

**ルールは 1 つも無効化していない**（`doctor.config.*` は未作成＝既定のまま）。理由は、どの指摘も
「ルール自体は有用だが、この箇所には当てはまらない」ためで、プロジェクト全体で止めると将来の
本物の問題を見逃すから。したがって `npx react-doctor` の出力とスコアにはこれらが残り続ける。
**残り 3 件がこの一覧と一致するなら clean と扱ってよい。**

最終確認日: 2026-07-28（残り 2 件 / スコア 90）

> `react-doctor/tanstack-start-get-mutation`（`src/server/reports.ts`）は**解消済み**。
> 集計用の Map をハンドラ外の純関数（`muscleVolumes` / `personalBestsIn` / `mealAverages`）へ
> 切り出したことで発火しなくなった。抑制ではなくコード側で解決したので、この一覧には残さない。
> 同種の誤検知が再発したら、Map 集計をハンドラ本体に書いていないか先に疑うこと。

---

## 直すと悪化するため据え置き

### `react-doctor/no-event-handler` — `src/components/workouts/rest-timer.tsx`

「残り時間が 0 に達したらタイマーを止めてビープ音を鳴らす」を担う `useEffect`。

ルールが指す形（state + useEffect）ではあるが、**推奨される直し方が適用できない**:

- 正しい直し方は「その state を変えたイベントハンドラへ処理を移す」だが、ここで `remaining` を
  変えているのは `setInterval` であり、**移設先となるユーザー操作が存在しない**
- `setRemaining((current) => ...)` の関数形式更新の中で 0 到達を判定すると、
  **error severity の `react-doctor/no-impure-state-updater` を再導入することになる**
  （React は更新関数を複数回呼びうるため、副作用を入れてはいけない）
- `setTimeout` の毎秒再スケジュール方式に作り替えれば警告は消えるが、
  0 到達後に再生を押したときの実休憩秒数カウントなど、端の挙動が変わる

ルールの誤検知条件「the state being checked is set by an external subscription the handler cannot
observe」に形として該当する。**タイマーの実装方式を変更した場合はこの判断を見直すこと。**

---

## 意図的な保留（指摘自体は正しい）

### `deslop/unused-file` — `src/lib/supabase/client.ts`

**これは誤検知ではない。** ファイルは実際にどこからも到達できず、ビルドにも含まれていない。

残している理由は、`src/lib/supabase/index.ts` に
「クライアント実体は環境跨ぎの誤 import を防ぐため re-export しない」と文書化された、
Realtime 等の直叩き用に用意された**意図的な例外の口**だから。

**この保留は恒久的ではない。** ブラウザから Supabase を直接叩く用途を採らないと決まった時点で、
このファイルは普通に削除すべきデッドコードになる。その際はこの節も削除すること。

なお `deslop/unused-file` はルール単位で無効化できない（`rules explain` が Unknown rule を返す）。
唯一の抑制手段は `--no-dead-code` だが、それは未使用 export・未使用依存・循環 import の検出も
まとめて失うため採らない。
