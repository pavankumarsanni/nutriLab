import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecipeByShareId } from "@/lib/db";
import SaveRecipeButton from "./SaveRecipeButton";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";

export default async function SharedRecipePage({ params }: { params: { shareId: string } }) {
  const [recipe, session] = await Promise.all([
    getRecipeByShareId(params.shareId),
    getServerSession(authOptions),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-green-600">NutriFitLab</span>
          </Link>
          {!session && (
            <Link
              href="/api/auth/signin"
              className="text-sm font-medium text-green-600 hover:text-green-700 border border-green-200 hover:border-green-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {!recipe ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-5xl">🍽️</span>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">This plan is no longer available</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">The recipe you are looking for may have been deleted or the link is incorrect.</p>
            <Link href="/" className="mt-2 text-sm font-medium text-green-600 hover:text-green-700 underline underline-offset-2">
              Go to NutriFitLab
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Title card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-3xl">📋</span>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-snug">{recipe.title}</h1>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(recipe.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  Shared via NutriFitLab · AI-powered nutrition planner
                </p>
              </div>
            </div>

            {/* Recipe content */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-headings:font-semibold prose-table:text-xs prose-th:bg-green-50 dark:prose-th:bg-green-900/30 prose-th:text-green-900 dark:prose-th:text-green-300 prose-th:font-semibold prose-td:border-gray-200 dark:prose-td:border-gray-700 prose-tr:border-gray-200 dark:prose-tr:border-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{recipe.content}</ReactMarkdown>
              </div>
            </div>

            {/* Save CTA */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm text-center space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Want to save this recipe?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Save it to your NutriFitLab account to keep it in your personal recipe library.</p>

              {session ? (
                <SaveRecipeButton shareId={params.shareId} />
              ) : (
                <Link
                  href={`/api/auth/signin?callbackUrl=/share/recipe/${params.shareId}`}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.04a.75.75 0 1 0-1.04-1.08l-2.5 2.4a.75.75 0 0 0 0 1.08l2.5 2.4a.75.75 0 1 0 1.04-1.08L8.704 10.75H18.25A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
                  </svg>
                  Sign in to Save
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
