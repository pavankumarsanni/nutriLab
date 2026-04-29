"use client";

import { useState } from "react";

type Profile = {
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  age: number | null;
  activity_level: string | null;
  injuries: string | null;
  sex: string | null;
};

type Props = {
  existing: Profile | null;
  onSaved: (profile: Profile) => void;
  onClose: () => void;
};

const ACTIVITY_LEVELS = [
  { value: "sedentary",   label: "🪑 Sedentary",       desc: "Desk job, little exercise" },
  { value: "light",       label: "🚶 Lightly Active",   desc: "Light exercise 1-3 days/week" },
  { value: "moderate",    label: "🏃 Moderately Active", desc: "Exercise 3-5 days/week" },
  { value: "very_active", label: "💪 Very Active",       desc: "Hard exercise 6-7 days/week" },
];

export default function ProfileSetupModal({ existing, onSaved, onClose }: Props) {
  const [heightCm, setHeightCm] = useState(existing?.height_cm?.toString() ?? "");
  const [currentWeight, setCurrentWeight] = useState(existing?.current_weight_kg?.toString() ?? "");
  const [targetWeight, setTargetWeight] = useState(existing?.target_weight_kg?.toString() ?? "");
  const [age, setAge] = useState(existing?.age?.toString() ?? "");
  const [activityLevel, setActivityLevel] = useState(existing?.activity_level ?? "moderate");
  const [injuries, setInjuries] = useState(existing?.injuries ?? "");
  const [sex, setSex] = useState<string | null>(existing?.sex ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isFirstTime = !existing;

  const handleSave = async () => {
    if (!heightCm || !currentWeight || !age || !activityLevel) {
      setError("Please fill in height, current weight and age.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height_cm: parseInt(heightCm),
          current_weight_kg: parseFloat(currentWeight),
          target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
          age: parseInt(age),
          activity_level: activityLevel,
          injuries: injuries.trim() || null,
          sex: sex,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved({
        height_cm: parseInt(heightCm),
        current_weight_kg: parseFloat(currentWeight),
        target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        age: parseInt(age),
        activity_level: activityLevel,
        injuries: injuries.trim() || null,
        sex: sex,
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">
              {isFirstTime ? "👋 Set up your profile" : "✏️ Edit Profile"}
            </h2>
            {isFirstTime && (
              <p className="text-xs text-gray-400 mt-0.5">Helps us personalise your plans</p>
            )}
          </div>
          {!isFirstTime && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          )}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Height & Age row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Height (cm)</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="e.g. 175"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 28"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          {/* Weight row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder="e.g. 75"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Target Weight (kg) <span className="text-gray-400 font-normal">optional</span></label>
              <input
                type="number"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="e.g. 68"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          {/* Sex */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">
              Biological sex <span className="text-gray-400 font-normal">optional — improves TDEE accuracy</span>
            </label>
            <div className="flex gap-2">
              {[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: null, label: "Prefer not to say" }].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSex(opt.value)}
                  className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                    sex === opt.value
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity level */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-2 block">Activity Level</label>
            <div className="space-y-2">
              {ACTIVITY_LEVELS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setActivityLevel(a.value)}
                  className={`w-full text-left rounded-xl px-4 py-2.5 border transition-all text-sm ${
                    activityLevel === a.value
                      ? "border-green-500 bg-green-50 text-green-800"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <span className="font-medium">{a.label}</span>
                  <span className="text-gray-400 ml-2 text-xs">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Injuries */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Injuries or limitations <span className="text-gray-400 font-normal">optional</span>
            </label>
            <textarea
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="e.g. bad knees, lower back pain, shoulder injury…"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 flex-shrink-0">
          {!isFirstTime ? (
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          ) : (
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">Skip for now</button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : isFirstTime ? "Save & Continue →" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
