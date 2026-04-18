"use client";

import { signOut } from "next-auth/react";

type Conversation = { id: string; title: string; updated_at: string };

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMealPlan: () => void;
  onSavedRecipes: () => void;
  onSavedPlans: () => void;
  savedRecipesCount: number;
  savedPlansCount: number;
  user: { name?: string | null; email?: string | null; image?: string | null };
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

export default function Sidebar({ conversations, activeId, onSelect, onDelete, onMealPlan, onSavedRecipes, onSavedPlans, savedRecipesCount, savedPlansCount, user }: Props) {
  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Actions */}
      <div className="p-3 border-b border-gray-100 space-y-1.5">
        <button
          onClick={onMealPlan}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
        >
          <span className="text-base">🗓️</span> Generate Meal Plan
        </button>
        <button
          onClick={onSavedRecipes}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2"><span className="text-base">📋</span> Saved Recipes</span>
          {savedRecipesCount > 0 && (
            <span className="bg-green-100 text-green-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">{savedRecipesCount}</span>
          )}
        </button>
        <button
          onClick={onSavedPlans}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2"><span className="text-base">📅</span> Saved Plans</span>
          {savedPlansCount > 0 && (
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">{savedPlansCount}</span>
          )}
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-6 px-4">No conversations yet. Start chatting!</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-start justify-between gap-1 mx-2 mb-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                c.id === activeId ? "bg-green-50 border border-green-200" : "hover:bg-gray-50"
              }`}
              onClick={() => onSelect(c.id)}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-xs truncate leading-snug ${c.id === activeId ? "text-green-900 font-medium" : "text-gray-700"}`}>
                  {c.title}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(c.updated_at)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-sm flex-shrink-0 mt-0.5"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* User profile + sign out */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? ""} className="w-7 h-7 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-[10px] text-gray-400 hover:text-gray-600 flex-shrink-0"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
