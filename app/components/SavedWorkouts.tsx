"use client";

import WorkoutContent from "./WorkoutContent";

type Workout = {
  id: string;
  title: string;
  goal: string;
  target: string;
  level: string;
  equipment: string;
  duration: number;
  content: string;
  created_at: string;
};

const GOAL_EMOJI: Record<string, string> = {
  weight_loss: "🔥",
  muscle_gain: "💪",
  endurance: "🏃",
  flexibility: "🧘",
  general: "⚡",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  none: "No equipment",
  home: "Home gym",
  gym: "Full gym",
};

type Props = {
  workouts: Workout[];
  onDelete: (id: string) => void;
  onGenerate: () => void;
};

export default function SavedWorkouts({ workouts, onDelete, onGenerate }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏋️</span>
          <h2 className="font-semibold text-gray-900">Workouts</h2>
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

      {/* List */}
      <div className="max-w-2xl mx-auto px-4 py-4 divide-y divide-gray-100">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl">🏋️</span>
            <p className="text-gray-500 text-sm">No saved workouts yet.</p>
            <button
              onClick={onGenerate}
              className="mt-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              ✨ Generate your first workout
            </button>
          </div>
        ) : (
          workouts.map((w) => (
            <WorkoutItem key={w.id} workout={w} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}

function WorkoutItem({ workout, onDelete }: { workout: Workout; onDelete: (id: string) => void }) {
  const emoji = GOAL_EMOJI[workout.goal] ?? "🏋️";
  const levelLabel = LEVEL_LABELS[workout.level] ?? workout.level;
  const equipLabel = EQUIPMENT_LABELS[workout.equipment] ?? workout.equipment;

  return (
    <details className="group py-3">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-green-600 group-open:rotate-90 transition-transform text-xs">▶</span>
          <span className="text-lg">{emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{workout.title}</p>
            <p className="text-[11px] text-gray-400">{workout.duration} min · {levelLabel} · {equipLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-[10px] text-gray-400">
            {new Date(workout.created_at).toLocaleDateString()}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); onDelete(workout.id); }}
            className="text-gray-300 hover:text-red-400 transition-colors text-sm"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </summary>
      <div className="mt-3">
        <WorkoutContent content={workout.content} />
      </div>
    </details>
  );
}
