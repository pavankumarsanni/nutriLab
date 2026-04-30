"use client";

import { useState, useEffect, useCallback } from "react";

type FoodLog = { id: string; meal_type: string; food_name: string; calories: number | null; logged_date: string };
type Profile = {
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  age: number | null;
  activity_level: string | null;
  sex: string | null;
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, very_active: 1.725,
};

function getTDEE(profile: Profile | null): number | null {
  if (!profile?.height_cm || !profile?.current_weight_kg || !profile?.age || !profile?.activity_level) return null;
  const { height_cm, current_weight_kg, age, activity_level, sex } = profile;
  let bmr: number;
  if (sex === "male") bmr = 10 * current_weight_kg + 6.25 * height_cm - 5 * age + 5;
  else if (sex === "female") bmr = 10 * current_weight_kg + 6.25 * height_cm - 5 * age - 161;
  else bmr = 10 * current_weight_kg + 6.25 * height_cm - 5 * age - 78;
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activity_level] ?? 1.375));
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast", emoji: "🥣" },
  { key: "lunch",     label: "Lunch",     emoji: "🥗" },
  { key: "dinner",    label: "Dinner",    emoji: "🍽️" },
  { key: "snack",     label: "Snacks",    emoji: "🍎" },
  { key: "drink",     label: "Drinks",    emoji: "🥤" },
];

export default function FoodDiary({ profile }: { profile: Profile | null }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [foodInput, setFoodInput] = useState("");
  const [caloriesInput, setCaloriesInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLogs = useCallback(async (date: string) => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/food-logs?date=${date}`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => { fetchLogs(selectedDate); }, [selectedDate, fetchLogs]);

  const handleAdd = async (meal_type: string) => {
    if (!foodInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_type,
          food_name: foodInput.trim(),
          calories: caloriesInput ? parseInt(caloriesInput) : null,
          logged_date: selectedDate,
        }),
      });
      const data = await res.json();
      if (data.log) setLogs((prev) => [...prev, data.log]);
      setFoodInput("");
      setCaloriesInput("");
      setAddingTo(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/food-logs/${id}`, { method: "DELETE" });
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const tdee = getTDEE(profile);
  const totalCalories = logs.reduce((sum, l) => sum + (l.calories ?? 0), 0);
  const caloriePercent = tdee ? Math.min(100, Math.round((totalCalories / tdee) * 100)) : null;

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigateDate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">‹</button>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm font-medium text-gray-800 dark:text-gray-100 bg-transparent border-none outline-none cursor-pointer"
            />
            {isToday && <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full px-2 py-0.5">Today</span>}
          </div>
          <button
            onClick={() => navigateDate(1)}
            disabled={isToday}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-30"
          >›</button>
        </div>

        {/* Calorie summary */}
        {tdee && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">
                {totalCalories > 0 ? `${totalCalories} kcal eaten` : "No calories logged yet"}
              </span>
              <span className="text-gray-400 dark:text-gray-500">Target: {tdee} kcal</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  caloriePercent! > 100 ? "bg-red-400" : caloriePercent! > 80 ? "bg-yellow-400" : "bg-green-500"
                }`}
                style={{ width: `${caloriePercent ?? 0}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 text-right">
              {caloriePercent !== null ? `${caloriePercent}% of daily target` : ""}
            </p>
          </div>
        )}
      </div>

      {/* Meal sections */}
      {loadingLogs ? (
        <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">Loading…</div>
      ) : (
        MEAL_TYPES.map(({ key, label, emoji }) => {
          const mealLogs = logs.filter((l) => l.meal_type === key);
          const mealCalories = mealLogs.reduce((s, l) => s + (l.calories ?? 0), 0);
          const isAdding = addingTo === key;

          return (
            <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span>{emoji}</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</span>
                  {mealCalories > 0 && (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">{mealCalories} kcal</span>
                  )}
                </div>
                <button
                  onClick={() => { setAddingTo(isAdding ? null : key); setFoodInput(""); setCaloriesInput(""); }}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    isAdding
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      : "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50"
                  }`}
                >
                  {isAdding ? "Cancel" : "+ Add"}
                </button>
              </div>

              {/* Item list */}
              {mealLogs.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {mealLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{log.food_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {log.calories != null ? `${log.calories} kcal` : "—"}
                        </span>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400 text-xs transition-colors"
                          title="Delete"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mealLogs.length === 0 && !isAdding && (
                <p className="text-xs text-gray-400 dark:text-gray-600 italic">Nothing logged yet</p>
              )}

              {/* Add form */}
              {isAdding && (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={foodInput}
                    onChange={(e) => setFoodInput(e.target.value)}
                    placeholder="Food name (e.g. Oats with milk)"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(key); }}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={caloriesInput}
                      onChange={(e) => setCaloriesInput(e.target.value)}
                      placeholder="Calories (optional)"
                      className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                    />
                    <button
                      onClick={() => handleAdd(key)}
                      disabled={saving || !foodInput.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {saving ? "…" : "Add"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
