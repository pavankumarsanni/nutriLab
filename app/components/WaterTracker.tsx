"use client";

import { useState, useEffect, useCallback } from "react";

const GOAL_ML = 2500;
const QUICK_AMOUNTS = [
  { label: "☕ Small", ml: 150 },
  { label: "🥛 Glass", ml: 250 },
  { label: "🍶 Bottle", ml: 500 },
  { label: "🫙 Large", ml: 750 },
];

type WeekDay = { date: string; total_ml: number };

function calcStreak(week: WeekDay[]): number {
  // Check how many consecutive days (ending today or yesterday) hit the goal
  const today = new Date().toISOString().slice(0, 10);
  const byDate: Record<string, number> = {};
  for (const d of week) byDate[d.date] = d.total_ml;

  let streak = 0;
  const cursor = new Date();
  // Start from today going back
  for (let i = 0; i < 7; i++) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (dateStr === today && !(byDate[dateStr] >= GOAL_ML)) {
      // Today not yet hit; check yesterday
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (byDate[dateStr] >= GOAL_ML) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function WaterTracker() {
  const [todayMl, setTodayMl] = useState(0);
  const [week, setWeek] = useState<WeekDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const fetchWater = useCallback(async () => {
    try {
      const res = await fetch("/api/water-logs");
      const data = await res.json() as { today_ml: number; week: WeekDay[] };
      setTodayMl(data.today_ml ?? 0);
      setWeek(data.week ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchWater(); }, [fetchWater]);

  const addWater = async (ml: number) => {
    if (ml <= 0) return;
    setAdding(true);
    try {
      await fetch("/api/water-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_ml: ml }),
      });
      setTodayMl((prev) => prev + ml);
      // Update today in week array
      const today = new Date().toISOString().slice(0, 10);
      setWeek((prev) => {
        const idx = prev.findIndex((d) => d.date === today);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], total_ml: updated[idx].total_ml + ml };
          return updated;
        }
        return [...prev, { date: today, total_ml: ml }];
      });
      setCustomInput("");
      setCustomMode(false);
    } finally {
      setAdding(false);
    }
  };

  const fillPercent = Math.min(100, Math.round((todayMl / GOAL_ML) * 100));
  const todayL = (todayMl / 1000).toFixed(1);
  const goalL = (GOAL_ML / 1000).toFixed(1);
  const streak = calcStreak(week);

  const maxWeekMl = Math.max(GOAL_ML, ...week.map((d) => d.total_ml));

  const barColor = (ml: number) =>
    ml >= GOAL_ML ? "bg-blue-500" : ml >= GOAL_ML * 0.7 ? "bg-blue-400" : "bg-blue-200 dark:bg-blue-800";

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="animate-pulse h-32 bg-gray-100 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💧</span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Water Intake</h3>
          {streak > 0 && (
            <span className="text-[11px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">
              🔥 {streak}d streak
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">Goal: {goalL}L</span>
      </div>

      {/* Water drop + progress */}
      <div className="flex items-center gap-5">
        {/* Animated drop */}
        <div className="relative flex-shrink-0 w-16 h-20 flex items-center justify-center">
          {/* Drop shape via CSS clip */}
          <div className="relative w-14 h-16 overflow-hidden" style={{ borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", transform: "rotate(180deg)" }}>
            <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30" />
            <div
              className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-700"
              style={{ height: `${fillPercent}%` }}
            />
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-blue-700 dark:text-blue-300">
            {fillPercent}%
          </span>
        </div>

        {/* Stats + progress bar */}
        <div className="flex-1 space-y-2">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {todayL}L
            <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / {goalL}L</span>
          </p>
          <div className="w-full h-3 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {todayMl >= GOAL_ML
              ? "Daily goal reached! 🎉"
              : `${GOAL_ML - todayMl}ml to go`}
          </p>
        </div>
      </div>

      {/* Quick-add buttons */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map(({ label, ml }) => (
          <button
            key={ml}
            onClick={() => addWater(ml)}
            disabled={adding}
            className="flex flex-col items-center gap-0.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl py-2 px-1 text-[11px] font-medium transition-colors disabled:opacity-40"
          >
            <span className="text-lg">{label.split(" ")[0]}</span>
            <span>{label.split(" ")[1]}</span>
            <span className="text-[10px] text-blue-400">+{ml}ml</span>
          </button>
        ))}
      </div>

      {/* Custom input */}
      {customMode ? (
        <div className="flex gap-2">
          <input
            type="number"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Amount in ml"
            autoFocus
            className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={() => addWater(parseInt(customInput || "0"))}
            disabled={adding || !customInput}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => { setCustomMode(false); setCustomInput(""); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl px-3 py-2 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCustomMode(true)}
          className="w-full text-xs text-blue-500 dark:text-blue-400 hover:underline"
        >
          + Custom amount
        </button>
      )}

      {/* 7-day bar chart */}
      {week.length > 0 && (
        <div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide">Last 7 days</p>
          <div className="flex items-end gap-1.5 h-16">
            {week.map((d) => {
              const pct = Math.min(100, Math.round((d.total_ml / maxWeekMl) * 100));
              const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: "48px" }}>
                    <div
                      className={`w-full rounded-t-sm transition-all duration-500 ${barColor(d.total_ml)}`}
                      style={{ height: `${pct}%`, minHeight: "4px" }}
                      title={`${(d.total_ml / 1000).toFixed(1)}L`}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{dayLabel}</span>
                </div>
              );
            })}
          </div>
          {/* Goal line indicator */}
          <p className="text-[10px] text-blue-400 mt-1">
            Blue bar = goal reached
          </p>
        </div>
      )}
    </div>
  );
}
