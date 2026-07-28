import { Chip, SectionTitle } from "@/components/kirog/console";
import { Input } from "@/components/ui/input";
import type { ExerciseRead } from "@/schemas/exercises";
import type { ExerciseRecord } from "@/schemas/workouts";

// カスタム種目を新規作成するときの部位候補。
const EXERCISE_PARTS = [
  "胸",
  "背中",
  "肩",
  "腕",
  "脚",
  "体幹",
  "有酸素",
  "その他",
] as const;

/**
 * 種目の検索・追加パネル。候補に無ければその場でカスタム種目として作成できる。
 * 削除は確認ダイアログを持つ親へ委ねる（onRequestDelete）。
 */
export function AddExercisePanel({
  master,
  exercises,
  search,
  onSearchChange,
  onAdd,
  onCreate,
  onRequestDelete,
  isCreating,
  isDeleting,
  deleteError,
}: {
  master: ExerciseRead[];
  exercises: ExerciseRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: (exercise: ExerciseRead) => void;
  onCreate: (part: string) => void;
  onRequestDelete: (exercise: ExerciseRead) => void;
  isCreating: boolean;
  isDeleting: boolean;
  deleteError: Error | null;
}) {
  const usedIds = new Set(exercises.map((exercise) => exercise.id));
  const candidates = master.filter(
    (exercise) =>
      !usedIds.has(exercise.id) &&
      (search === "" ||
        exercise.name.includes(search) ||
        exercise.part.includes(search)),
  );
  const exactMatch = master.some((e) => e.name === search.trim());

  return (
    <>
      <SectionTitle>種目を検索して追加</SectionTitle>
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="種目名・部位で検索"
        aria-label="種目を検索"
        className="mb-4"
      />
      {deleteError ? (
        <p className="text-k-danger mb-3 text-xs" role="alert">
          種目を削除できませんでした: {deleteError.message}
        </p>
      ) : null}
      {/* 検索して候補から追加。末尾に「新規作成」。 */}
      {search.trim() ? (
        <div className="border-k-line divide-k-line-soft mb-6 max-h-[280px] divide-y overflow-y-auto rounded-xl border">
          {candidates.map((exercise) => (
            <div
              key={exercise.id}
              className="hover:bg-k-raised flex items-center transition-colors"
            >
              <button
                type="button"
                onClick={() => onAdd(exercise)}
                aria-label={`${exercise.name} を追加`}
                className="flex flex-1 items-center gap-2.5 px-3.5 py-2.5 text-left"
              >
                <span className="text-k-accent-soft">＋</span>
                <span className="flex-1 truncate text-[13px]">
                  {exercise.name}
                </span>
                <span className="text-k-fg-dim font-mono text-[11px]">
                  {exercise.part}
                </span>
              </button>
              {/* 本人が作ったカスタム種目だけ削除できる（共通マスタは owner_id=null）。 */}
              {exercise.owner_id !== null ? (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => onRequestDelete(exercise)}
                  aria-label={`${exercise.name} を削除`}
                  className="text-k-fg-faint hover:text-k-danger px-3 py-2.5 text-xs"
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))}

          {!exactMatch ? (
            <div className="bg-k-well/40 p-3.5">
              <div className="text-k-fg-dim mb-2.5 text-xs">
                「<span className="text-k-fg font-medium">{search.trim()}</span>
                」を新規作成 — 部位を選択
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXERCISE_PARTS.map((part) => (
                  <button
                    key={part}
                    type="button"
                    disabled={isCreating}
                    onClick={() => onCreate(part)}
                    aria-label={`${search.trim()} を ${part} として作成`}
                  >
                    <Chip>＋ {part}</Chip>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-k-fg-faint mb-6 text-xs">
          種目名を入力して検索・追加できます
        </p>
      )}
    </>
  );
}
