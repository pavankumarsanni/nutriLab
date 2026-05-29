"use client";

import { useState } from "react";

type Summary = {
  headline: string;
  score: number;
  highlights: string[];
  improvements: string[];
  workout_insight: string;
  nutrition_insight: string;
  water_insight: string;
  motivation: string;
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-500 dark:text-green-400";
  if (score >= 6) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  if (score >= 6) return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
  return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 minute ago";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
}

export default function WeeklySummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weekly-summary", { method: "POST" });
      const data = await res.json() as Summary & { error?: string };
      if (data.error) { setError(data.error); return; }
      setSummary(data);
      setUpdatedAt(new Date());
    } catch {
      setError("Failed to generate summary. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">This Week&apos;s Summary</h3>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
        >
          <span className={loading ? "animate-spin inline-block" : ""}>🔄</span>
          {loading ? "Generating…" : summary ? "Refresh" : "Generate"}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <div className="animate-pulse h-6 bg-gray-100 dark:bg-gray-700 rounded-lg w-3/4" />
          <div className="animate-pulse h-4 bg-gray-100 dark:bg-gray-700 rounded-lg w-full" />
          <div className="animate-pulse h-4 bg-gray-100 dark:bg-gray-700 rounded-lg w-5/6" />
          <div className="animate-pulse h-4 bg-gray-100 dark:bg-gray-700 rounded-lg w-2/3" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Empty state */}
      {!summary && !loading && !error && (
        <div className="text-center py-6 space-y-2">
          <p className="text-3xl">🌱</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Complete a few workouts and log some meals to get your first weekly summary!
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Hit &quot;Generate&quot; whenever you&apos;re ready.
          </p>
        </div>
      )}

      {/* Summary content */}
      {summary && !loading && (
        <div className="space-y-4">
          {/* Score + headline */}
          <div className={`flex items-center gap-4 rounded-xl border p-4 ${scoreBg(summary.score)}`}>
            <div className="text-center flex-shrink-0">
              <span className={`text-4xl font-bold ${scoreColor(summary.score)}`}>{summary.score}</span>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">/10</p>
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100 leading-tight">{summary.headline}</p>
            </div>
          </div>

          {/* Highlights */}
          {summary.highlights.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Highlights</p>
              {summary.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{h}</p>
                </div>
              ))}
            </div>
          )}

          {/* Improvements */}
          {summary.improvements.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Next Week</p>
              {summary.improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 flex-shrink-0 mt-0.5">→</span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{imp}</p>
                </div>
              ))}
            </div>
          )}

          {/* Insight cards */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">💪 Training</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{summary.workout_insight}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">🥗 Nutrition</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{summary.nutrition_insight}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">💧 Hydration</p>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{summary.water_insight}</p>
            </div>
          </div>

          {/* Motivation */}
          <p className="text-sm italic text-gray-500 dark:text-gray-400 border-l-2 border-green-400 pl-3">
            &ldquo;{summary.motivation}&rdquo;
          </p>

          {/* Timestamp */}
          {updatedAt && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-right">
              Last updated: {timeAgo(updatedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
