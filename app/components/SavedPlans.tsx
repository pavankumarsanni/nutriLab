"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MealPlan = {
  id: string;
  title: string;
  goal: string;
  diet: string;
  duration: number;
  content: string;
  created_at: string;
};

const GOAL_EMOJI: Record<string, string> = {
  balanced: "⚖️",
  weight_loss: "🔥",
  high_protein: "💪",
  anti_inflammatory: "🫀",
  energy: "⚡",
};

const DIET_LABELS: Record<string, string> = {
  none: "No restrictions",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  gluten_free: "Gluten-Free",
  dairy_free: "Dairy-Free",
};

type Props = {
  plans: MealPlan[];
  onDelete: (id: string) => void;
  onGenerate: () => void;
};

export default function SavedPlans({ plans, onDelete, onGenerate }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗓️</span>
          <h2 className="font-semibold text-gray-900">Meal Plans</h2>
          {plans.length > 0 && (
            <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">{plans.length}</span>
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
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl">🗓️</span>
            <p className="text-gray-500 text-sm">No saved meal plans yet.</p>
            <button
              onClick={onGenerate}
              className="mt-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              ✨ Generate your first plan
            </button>
          </div>
        ) : (
          plans.map((p) => <PlanItem key={p.id} plan={p} onDelete={onDelete} />)
        )}
      </div>
    </div>
  );
}

function PlanItem({ plan, onDelete }: { plan: MealPlan; onDelete: (id: string) => void }) {
  const emoji = GOAL_EMOJI[plan.goal] ?? "🗓️";
  const dietLabel = DIET_LABELS[plan.diet] ?? plan.diet;

  return (
    <details className="group py-3">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-green-600 group-open:rotate-90 transition-transform text-xs">▶</span>
          <span className="text-lg">{emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{plan.title}</p>
            <p className="text-[11px] text-gray-400">{plan.duration} days · {dietLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-[10px] text-gray-400">
            {new Date(plan.created_at).toLocaleDateString()}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); onDelete(plan.id); }}
            className="text-gray-300 hover:text-red-400 transition-colors text-sm"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </summary>
      <div className="mt-3 pl-4 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-gray-900 prose-headings:text-gray-900 prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm prose-table:text-xs prose-th:bg-green-50 prose-th:text-green-900 prose-th:font-semibold prose-td:border-gray-200 prose-tr:border-gray-200 border-l-2 border-green-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.content}</ReactMarkdown>
      </div>
    </details>
  );
}
