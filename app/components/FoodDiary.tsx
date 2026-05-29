"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type FoodLog = {
  id: string;
  meal_type: string;
  food_name: string;
  calories: number | null;
  logged_date: string;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
};
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
  const [estimating, setEstimating] = useState(false);
  const [isEstimated, setIsEstimated] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanningLabel, setScanningLabel] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [macros, setMacros] = useState<{ protein_g: number | null; carbs_g: number | null; fat_g: number | null; fiber_g: number | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

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

  const handleEstimate = async () => {
    if (!foodInput.trim()) return;
    setEstimating(true);
    setIsEstimated(false);
    try {
      const res = await fetch("/api/food-logs/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food_name: foodInput.trim() }),
      });
      const data = await res.json();
      if (data.calories) {
        setCaloriesInput(String(data.calories));
        setIsEstimated(true);
      }
    } finally {
      setEstimating(false);
    }
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageScan = async (file: File) => {
    setScanning(true);
    setIsEstimated(false);
    setMacros(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    try {
      const base64 = await toBase64(file);
      const res = await fetch("/api/food-logs/estimate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64, media_type: file.type }),
      });
      const data = await res.json() as { food_name?: string; calories?: number };
      if (data.food_name) { setFoodInput(data.food_name); setIsEstimated(true); }
      if (data.calories) setCaloriesInput(String(data.calories));
    } catch {
      // silently fail — user can type manually
    } finally {
      setScanning(false);
    }
  };

  const handleLabelScan = async (file: File) => {
    setScanningLabel(true);
    setIsEstimated(false);
    setMacros(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    try {
      const base64 = await toBase64(file);
      const res = await fetch("/api/food-logs/scan-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64, media_type: file.type }),
      });
      const data = await res.json() as {
        food_name?: string;
        calories?: number | null;
        protein_g?: number | null;
        carbs_g?: number | null;
        fat_g?: number | null;
        fiber_g?: number | null;
      };
      if (data.food_name) { setFoodInput(data.food_name); setIsEstimated(true); }
      if (data.calories != null) setCaloriesInput(String(data.calories));
      if (data.protein_g != null || data.carbs_g != null || data.fat_g != null || data.fiber_g != null) {
        setMacros({
          protein_g: data.protein_g ?? null,
          carbs_g: data.carbs_g ?? null,
          fat_g: data.fat_g ?? null,
          fiber_g: data.fiber_g ?? null,
        });
      }
    } catch {
      // silently fail
    } finally {
      setScanningLabel(false);
    }
  };

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
          protein_g: macros?.protein_g ?? null,
          carbs_g: macros?.carbs_g ?? null,
          fat_g: macros?.fat_g ?? null,
          fiber_g: macros?.fiber_g ?? null,
        }),
      });
      const data = await res.json() as { log?: FoodLog };
      if (data.log) setLogs((prev) => [...prev, data.log!]);
      setFoodInput("");
      setCaloriesInput("");
      setIsEstimated(false);
      setPreviewUrl(null);
      setMacros(null);
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
                  onClick={() => { setAddingTo(isAdding ? null : key); setFoodInput(""); setCaloriesInput(""); setIsEstimated(false); setPreviewUrl(null); setMacros(null); }}
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
                    <div key={log.id} className="py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <div className="flex items-center justify-between">
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
                      {(log.protein_g != null || log.carbs_g != null || log.fat_g != null) && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {log.protein_g != null && `P:${log.protein_g}g`}
                          {log.carbs_g != null && ` C:${log.carbs_g}g`}
                          {log.fat_g != null && ` F:${log.fat_g}g`}
                        </p>
                      )}
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
                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageScan(f); e.target.value = ""; }}
                  />
                  <input
                    ref={labelInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLabelScan(f); e.target.value = ""; }}
                  />

                  {/* Image preview */}
                  {previewUrl && (
                    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Food preview" className="w-full max-h-40 object-cover" />
                      {(scanning || scanningLabel) && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <p className="text-white text-sm font-medium">
                            {scanningLabel ? "🏷️ Reading label…" : "✨ Analysing food…"}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => { setPreviewUrl(null); setFoodInput(""); setCaloriesInput(""); setIsEstimated(false); setMacros(null); }}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                      >✕</button>
                    </div>
                  )}

                  {/* Macros preview */}
                  {macros && (
                    <div className="flex gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Protein: <strong className="text-gray-700 dark:text-gray-300">{macros.protein_g ?? "?"}g</strong></span>
                      <span>·</span>
                      <span>Carbs: <strong className="text-gray-700 dark:text-gray-300">{macros.carbs_g ?? "?"}g</strong></span>
                      <span>·</span>
                      <span>Fat: <strong className="text-gray-700 dark:text-gray-300">{macros.fat_g ?? "?"}g</strong></span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={foodInput}
                      onChange={(e) => { setFoodInput(e.target.value); setIsEstimated(false); setCaloriesInput(""); }}
                      placeholder="e.g. 2 eggs and toast with butter"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleEstimate(); }}
                      className="flex-1 min-w-0 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                    />
                    {/* Camera button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanning || scanningLabel}
                      className="flex-shrink-0 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700 rounded-xl px-3 py-2 text-sm transition-colors disabled:opacity-40"
                      title="Scan food with camera"
                    >
                      {scanning ? "⏳" : "📷"}
                    </button>
                    {/* Scan Label button */}
                    <button
                      onClick={() => labelInputRef.current?.click()}
                      disabled={scanning || scanningLabel}
                      className="flex-shrink-0 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700 rounded-xl px-3 py-2 text-sm transition-colors disabled:opacity-40"
                      title="Scan nutrition label"
                    >
                      {scanningLabel ? "⏳" : "🏷️"}
                    </button>
                    <button
                      onClick={handleEstimate}
                      disabled={estimating || !foodInput.trim()}
                      className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-xl px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 whitespace-nowrap"
                      title="Estimate calories with AI"
                    >
                      {estimating ? "…" : "✨ Estimate"}
                    </button>
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        value={caloriesInput}
                        onChange={(e) => { setCaloriesInput(e.target.value); setIsEstimated(false); }}
                        placeholder="Calories (optional)"
                        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
                      />
                      {isEstimated && caloriesInput && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 dark:text-blue-400 font-medium">~AI</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAdd(key)}
                      disabled={saving || !foodInput.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {saving ? "…" : "Add"}
                    </button>
                  </div>
                  {isEstimated && caloriesInput && (
                    <p className="text-[11px] text-blue-500 dark:text-blue-400">✨ AI estimate — you can edit this if you know the exact amount</p>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
