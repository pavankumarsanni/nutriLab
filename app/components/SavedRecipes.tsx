"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Recipe = { id: string; title: string; content: string; created_at: string };

type Props = {
  recipes: Recipe[];
  onDelete: (id: string) => void;
};

export default function SavedRecipes({ recipes, onDelete }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center gap-2 z-10">
        <span className="text-xl">📋</span>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Saved Recipes</h2>
        {recipes.length > 0 && (
          <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">{recipes.length}</span>
        )}
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto px-4 py-4 divide-y divide-gray-100 dark:divide-gray-700">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl">🍽️</span>
            <p className="text-gray-500 text-sm">No saved recipes yet.<br />Hit the bookmark icon on any chat response to save it.</p>
          </div>
        ) : (
          recipes.map((r) => (
            <RecipeItem key={r.id} recipe={r} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}

function RecipeItem({ recipe, onDelete }: { recipe: Recipe; onDelete: (id: string) => void }) {
  return (
    <details className="group py-3">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-green-600 group-open:rotate-90 transition-transform text-xs">▶</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{recipe.title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(recipe.created_at).toLocaleDateString()}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); onDelete(recipe.id); }}
            className="text-gray-300 hover:text-red-400 transition-colors text-sm"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </summary>
      <div className="mt-3 pl-4 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-headings:font-semibold prose-table:text-xs prose-th:bg-green-50 dark:prose-th:bg-green-900/30 prose-th:text-green-900 dark:prose-th:text-green-300 prose-th:font-semibold prose-td:border-gray-200 dark:prose-td:border-gray-700 prose-tr:border-gray-200 dark:prose-tr:border-gray-700 border-l-2 border-green-100 dark:border-green-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{recipe.content}</ReactMarkdown>
      </div>
    </details>
  );
}
