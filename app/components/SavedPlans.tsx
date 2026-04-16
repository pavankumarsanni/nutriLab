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
  onClose: () => void;
};

export default function SavedPlans({ plans, onDelete, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗓️</span>
            <h2 className="font-semibold text-gray-900">Saved Meal Plans</h2>
            <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">{plans.length}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <span className="text-4xl">🗓️</span>
              <p className="text-gray-500 text-sm">No saved plans yet.<br />Generate a meal plan and save it!</p>
            </div>
          ) : (
            plans.map((p) => <PlanItem key={p.id} plan={p} onDelete={onDelete} />)
          )}
        </div>
      </div>
    </div>
  );
}

function PlanItem({ plan, onDelete }: { plan: MealPlan; onDelete: (id: string) => void }) {
  const emoji = GOAL_EMOJI[plan.goal] ?? "🗓️";
  const dietLabel = DIET_LABELS[plan.diet] ?? plan.diet;

  return (
    <details className="group px-5 py-3">
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
