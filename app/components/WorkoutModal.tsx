"use client";

import { useState } from "react";
import WorkoutContent from "./WorkoutContent";

type Workout = { id?: string; title: string; content: string };

type Props = {
  onClose: () => void;
  onSaved: (workout: Workout & { id: string; goal: string; target: string; level: string; equipment: string; duration: number; created_at: string }) => void;
};

const GOALS = [
  { value: "weight_loss",  label: "🔥 Weight Loss",          desc: "Burn calories & shed fat" },
  { value: "muscle_gain",  label: "💪 Muscle Gain",           desc: "Build strength & size" },
  { value: "endurance",    label: "🏃 Endurance & Cardio",    desc: "Boost stamina & heart health" },
  { value: "flexibility",  label: "🧘 Flexibility & Mobility", desc: "Improve range of motion" },
  { value: "general",      label: "⚡ General Fitness",        desc: "Stay active & feel great" },
];

const TARGETS = [
  { value: "full_body",   label: "🏋️ Full Body" },
  { value: "upper_body",  label: "💪 Upper Body" },
  { value: "lower_body",  label: "🦵 Lower Body" },
  { value: "core",        label: "🎯 Core & Abs" },
  { value: "cardio",      label: "🏃 Cardio" },
];

const LEVELS = [
  { value: "beginner",     label: "🌱 Beginner",     desc: "New to working out" },
  { value: "intermediate", label: "⚡ Intermediate",  desc: "Some experience" },
  { value: "advanced",     label: "🔥 Advanced",      desc: "Regular training" },
];

const EQUIPMENT = [
  { value: "none", label: "🤸 No Equipment",  desc: "Bodyweight only" },
  { value: "home", label: "🏠 Home Gym",       desc: "Dumbbells, bands" },
  { value: "gym",  label: "🏋️ Full Gym",       desc: "All equipment" },
];

const DURATIONS = [
  { value: 20, label: "20 min", desc: "Quick" },
  { value: 30, label: "30 min", desc: "Short" },
  { value: 45, label: "45 min", desc: "Standard" },
  { value: 60, label: "60 min", desc: "Full" },
];

export default function WorkoutModal({ onClose, onSaved }: Props) {
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [goal, setGoal] = useState("general");
  const [target, setTarget] = useState("full_body");
  const [level, setLevel] = useState("beginner");
  const [equipment, setEquipment] = useState("none");
  const [duration, setDuration] = useState(30);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, target, level, equipment, duration, save: false }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWorkout({ title: data.title, content: data.content });
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("form");
    }
  };

  const handleSave = async () => {
    if (!workout || saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, target, level, equipment, duration, save: true }),
      });
      const data = await res.json();
      if (data.id) {
        onSaved({
          id: data.id,
          title: workout.title,
          content: workout.content,
          goal, target, level, equipment, duration,
          created_at: new Date().toISOString(),
        });
        setSaved(true);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏋️</span>
            <h2 className="font-semibold text-gray-900">Workout Generator</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Form step */}
        {step === "form" && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
            )}

            {/* Goal */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">What&apos;s your goal?</p>
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setGoal(g.value)}
                    className={`w-full text-left rounded-xl px-4 py-3 border transition-all text-sm ${
                      goal === g.value
                        ? "border-green-500 bg-green-50 text-green-800"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <span className="font-medium">{g.label}</span>
                    <span className="text-gray-400 ml-2 text-xs">{g.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Target area</p>
              <div className="grid grid-cols-2 gap-2">
                {TARGETS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTarget(t.value)}
                    className={`text-left rounded-xl px-4 py-2.5 border transition-all text-sm ${
                      target === t.value
                        ? "border-green-500 bg-green-50 text-green-800 font-medium"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Level */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Fitness level</p>
              <div className="flex gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`flex-1 rounded-xl px-3 py-3 border transition-all text-sm text-center ${
                      level === l.value
                        ? "border-green-500 bg-green-50 text-green-800 font-semibold"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="font-semibold">{l.label}</div>
                    <div className="text-xs text-gray-400">{l.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Equipment available</p>
              <div className="flex gap-2">
                {EQUIPMENT.map((e) => (
                  <button
                    key={e.value}
                    onClick={() => setEquipment(e.value)}
                    className={`flex-1 rounded-xl px-3 py-3 border transition-all text-sm text-center ${
                      equipment === e.value
                        ? "border-green-500 bg-green-50 text-green-800 font-semibold"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="font-semibold">{e.label}</div>
                    <div className="text-xs text-gray-400">{e.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Duration</p>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`flex-1 rounded-xl px-3 py-3 border transition-all text-sm text-center ${
                      duration === d.value
                        ? "border-green-500 bg-green-50 text-green-800 font-semibold"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="font-semibold">{d.label}</div>
                    <div className="text-xs text-gray-400">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generating step */}
        {step === "generating" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
            <div className="text-5xl animate-bounce">🏋️</div>
            <p className="text-gray-600 font-medium">Building your workout plan…</p>
            <p className="text-gray-400 text-sm">This takes a few seconds</p>
            <div className="flex gap-1.5 mt-2">
              {[0, 150, 300].map((d) => (
                <div key={d} className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Result step */}
        {step === "result" && workout && (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <WorkoutContent content={workout.content} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 flex-shrink-0 gap-3">
          {step === "form" && (
            <>
              <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button
                onClick={generate}
                className="bg-green-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Generate Workout ✨
              </button>
            </>
          )}
          {step === "result" && (
            <>
              <button
                onClick={() => { setStep("form"); setWorkout(null); setSaved(false); }}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-4 py-2"
              >
                ← New Workout
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className={`rounded-xl px-5 py-2 text-sm font-medium transition-colors ${
                    saved
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                  }`}
                >
                  {saved ? "✓ Saved!" : saving ? "Saving…" : "🔖 Save Workout"}
                </button>
                <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-4 py-2">
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
