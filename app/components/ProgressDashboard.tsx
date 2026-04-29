"use client";

import { useState } from "react";
import MacroCard from "./MacroCard";
import WeightChart from "./WeightChart";

type WeightLog = { id: string; weight_kg: number; logged_at: string };
type Profile = {
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  age: number | null;
  activity_level: string | null;
  sex: string | null;
  injuries: string | null;
};

type Props = {
  profile: Profile | null;
  weightLogs: WeightLog[];
  onAddLog: (weight_kg: number, logged_at: string) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  onEditProfile: () => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProgressDashboard({ profile, weightLogs, onAddLog, onDeleteLog, onEditProfile }: Props) {
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAddLog = async () => {
    const w = parseFloat(weightInput);
    if (!w || w < 20 || w > 500) { setError("Enter a valid weight (20–500 kg)"); return; }
    setSubmitting(true);
    setError("");
    try {
      await onAddLog(w, dateInput);
      setWeightInput("");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const latestWeight = weightLogs.length > 0 ? Number(weightLogs[weightLogs.length - 1].weight_kg) : null;
  const startWeight = weightLogs.length > 0 ? Number(weightLogs[0].weight_kg) : null;
  const totalChange = latestWeight !== null && startWeight !== null ? latestWeight - startWeight : null;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-6">

      {/* Calorie & Macro Calculator */}
      <MacroCard profile={profile} onEditProfile={onEditProfile} />

      {/* Progress stats */}
      {weightLogs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Current</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{latestWeight} kg</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Change</p>
            <p className={`text-xl font-bold ${totalChange === null ? "text-gray-400" : totalChange < 0 ? "text-green-600 dark:text-green-400" : totalChange > 0 ? "text-red-500" : "text-gray-500"}`}>
              {totalChange === null ? "—" : `${totalChange > 0 ? "+" : ""}${totalChange.toFixed(1)} kg`}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 text-center">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Goal</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Weight chart */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Weight Progress</h3>
        <WeightChart logs={weightLogs} targetWeight={profile?.target_weight_kg ?? null} />
      </div>

      {/* Log weight form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Log Weight</h3>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="e.g. 74.5"
            className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
          />
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400"
          />
          <button
            onClick={handleAddLog}
            disabled={submitting || !weightInput}
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? "…" : "Log"}
          </button>
        </div>
      </div>

      {/* Log history */}
      {weightLogs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">History</h3>
          <div className="space-y-1.5">
            {[...weightLogs].reverse().slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(log.logged_at)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{log.weight_kg} kg</span>
                  <button
                    onClick={() => onDeleteLog(log.id)}
                    className="text-gray-300 hover:text-red-400 text-xs transition-colors"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
