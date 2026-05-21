"use client";

import { useState, useRef } from "react";
import WorkoutContent from "./WorkoutContent";

type Workout = {
  id: string; title: string; goal: string; target: string;
  level: string; equipment: string; duration: number; content: string; created_at: string;
};

const GOAL_EMOJI: Record<string, string> = {
  weight_loss: "🔥", muscle_gain: "💪", endurance: "🏃", flexibility: "🧘", general: "⚡",
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
};
const EQUIPMENT_LABELS: Record<string, string> = {
  none: "No equipment", home: "Home gym", gym: "Full gym",
};

type Props = {
  workouts: Workout[];
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onGenerate: () => void;
};

export default function SavedWorkouts({ workouts, onDelete, onRename, onGenerate }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏋️</span>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Workouts</h2>
          {workouts.length > 0 && (
            <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">{workouts.length}</span>
          )}
        </div>
        <button
          onClick={onGenerate}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span>✨</span> Generate New
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 divide-y divide-gray-100 dark:divide-gray-700">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl">🏋️</span>
            <p className="text-gray-500 text-sm">No saved workouts yet.</p>
            <button onClick={onGenerate} className="mt-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              ✨ Generate your first workout
            </button>
          </div>
        ) : (
          workouts.map((w) => (
            <WorkoutItem key={w.id} workout={w} onDelete={onDelete} onRename={onRename} />
          ))
        )}
      </div>
    </div>
  );
}

function WorkoutItem({ workout, onDelete, onRename }: {
  workout: Workout; onDelete: (id: string) => void; onRename: (id: string, title: string) => void;
}) {
  const emoji = GOAL_EMOJI[workout.goal] ?? "🏋️";
  const levelLabel = LEVEL_LABELS[workout.level] ?? workout.level;
  const equipLabel = EQUIPMENT_LABELS[workout.equipment] ?? workout.equipment;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(workout.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRenameStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setRenameValue(workout.title);
    setRenaming(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleRenameSave = async () => {
    if (!renameValue.trim() || renameValue.trim() === workout.title) { setRenaming(false); return; }
    setSaving(true);
    await fetch(`/api/workouts/${workout.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renameValue.trim() }),
    });
    onRename(workout.id, renameValue.trim());
    setRenaming(false);
    setSaving(false);
  };

  return (
    <details className="group py-3">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-green-600 group-open:rotate-90 transition-transform text-xs">▶</span>
          <span className="text-lg">{emoji}</span>
          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                ref={inputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSave}
                onKeyDown={(e) => { if (e.key === "Enter") handleRenameSave(); if (e.key === "Escape") setRenaming(false); }}
                onClick={(e) => e.preventDefault()}
                className="w-full text-sm font-medium bg-white dark:bg-gray-700 border border-green-400 rounded-lg px-2 py-0.5 outline-none focus:ring-1 focus:ring-green-400 text-gray-800 dark:text-gray-100"
                disabled={saving}
                autoFocus
              />
            ) : (
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{workout.title}</p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{workout.duration} min · {levelLabel} · {equipLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(workout.created_at).toLocaleDateString()}
          </span>

          {/* Rename button */}
          <button
            onClick={handleRenameStart}
            className="p-1 text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-400 transition-colors"
            title="Rename"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
            </svg>
          </button>

          {/* Delete with confirmation */}
          {confirmDelete ? (
            <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Delete?</span>
              <button
                onClick={() => { onDelete(workout.id); setConfirmDelete(false); }}
                className="text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 rounded px-1.5 py-0.5 transition-colors"
              >Yes</button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >No</button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); setConfirmDelete(true); }}
              className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </summary>
      <div className="mt-3">
        <WorkoutContent content={workout.content} workoutId={workout.id} workoutTitle={workout.title} />
      </div>
    </details>
  );
}
