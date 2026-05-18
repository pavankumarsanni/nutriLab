"use client";

import { useState, useRef } from "react";

type AssessmentResult = {
  current_type: string;
  current_summary: string;
  areas_to_focus: string[];
  approach: "bulk" | "cut" | "recomp";
  approach_explanation: string;
  timeline: string;
  workout_recommendation: string;
  diet_recommendation: string;
  suggested_workout_prompt: string;
};

type Props = {
  onClose: () => void;
  onGenerateWorkout: (prompt: string) => void;
};

const PHYSIQUE_OPTIONS = [
  { value: "Slim", label: "🦴 Slim", desc: "Low body fat, want to add size" },
  { value: "Skinny Fat", label: "🫠 Skinny Fat", desc: "Looks slim but low muscle, soft midsection" },
  { value: "Average", label: "📊 Average", desc: "Moderate build, mixed goals" },
  { value: "Athletic", label: "💪 Athletic", desc: "Active, want to refine & build" },
  { value: "Muscular", label: "🏋️ Muscular", desc: "Well built, want to maintain or sharpen" },
  { value: "Stocky", label: "📈 Stocky", desc: "Heavier build, want to lean out" },
  { value: "Overweight", label: "⚖️ Overweight", desc: "Significant fat to lose, building from scratch" },
  { value: "Ectomorph", label: "🪶 Ectomorph", desc: "Very lean, fast metabolism, hard gainer" },
];

const GOAL_OPTIONS = [
  { value: "Athletic & Lean", label: "🏃 Athletic & Lean", desc: "Toned, low body fat, functional strength" },
  { value: "Classic Aesthetic", label: "💪 Classic Aesthetic", desc: "Defined muscles, V-taper, visible separation" },
  { value: "Powerlifter", label: "🏋️ Powerlifter", desc: "Maximum muscle mass and raw strength" },
  { value: "Functional Fitness", label: "🤸 Functional Fitness", desc: "Balanced strength, mobility and endurance" },
];

const APPROACH_COLORS: Record<string, string> = {
  bulk: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700",
  cut: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700",
  recomp: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700",
};

const APPROACH_LABELS: Record<string, string> = {
  bulk: "Bulk",
  cut: "Cut",
  recomp: "Recomp",
};

export default function BodyAssessmentModal({ onClose, onGenerateWorkout }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedPhysique, setSelectedPhysique] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selfDescription, setSelfDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleAnalyse = async () => {
    if (!selectedGoal) return;
    setLoading(true);
    setError("");
    setStep(3);

    try {
      const body: Record<string, string> = { goal: selectedGoal };

      if (photoFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
        body.image_base64 = base64;
        body.media_type = photoFile.type;
      }

      // Combine card selection + free text if present
      const descParts: string[] = [];
      if (selectedPhysique) descParts.push(selectedPhysique);
      if (selfDescription.trim()) descParts.push(selfDescription.trim());
      if (descParts.length > 0) body.current_physique = descParts.join(" — ");

      const res = await fetch("/api/body-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as AssessmentResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep(1);
    setPhotoFile(null);
    setPhotoPreview(null);
    setSelectedPhysique(null);
    setSelfDescription("");
    setSelectedGoal(null);
    setResult(null);
    setError("");
    setLoading(false);
  };

  const canProceedStep1 = photoFile !== null || selectedPhysique !== null || selfDescription.trim().length > 0;
  const canProceedStep2 = selectedGoal !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Body Assessment</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1.5">
              {([1, 2, 3] as const).map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === s
                      ? "bg-green-500 w-4"
                      : step > s
                      ? "bg-green-300 dark:bg-green-700"
                      : "bg-gray-200 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
          </div>
        </div>

        {/* Step 1 — Current Physique */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">📸 Current Physique</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Where are you now?</p>
            </div>

            {/* Privacy note */}
            <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
              <span className="text-base flex-shrink-0">🔒</span>
              <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
                Your photo is used only for this analysis and is never stored on our servers
              </p>
            </div>

            {/* Camera button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-4 transition-all text-sm font-medium ${
                  photoFile
                    ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400"
                }`}
              >
                {photoFile ? (
                  <>
                    {photoPreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="Preview" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <span>✓ Photo ready</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">📷</span>
                    <span>Take / Upload Photo (optional)</span>
                  </>
                )}
              </button>
              {photoFile && (
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="mt-1.5 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors w-full text-center"
                >
                  Remove photo
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500">or describe yourself</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Physique selector cards */}
            <div className="grid grid-cols-2 gap-2">
              {PHYSIQUE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedPhysique(selectedPhysique === opt.value ? null : opt.value)}
                  className={`text-left rounded-xl px-3 py-3 border-2 transition-all ${
                    selectedPhysique === opt.value
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{opt.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Free-text description */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                ✍️ Or describe yourself in your own words <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={selfDescription}
                onChange={(e) => setSelfDescription(e.target.value)}
                placeholder="e.g. I'm 28M, around 80kg, I have some belly fat but my arms are thin. I've been inactive for 2 years and want to get back in shape..."
                rows={3}
                className="w-full text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
              {selfDescription.trim().length > 0 && (
                <p className="text-[11px] text-green-600 dark:text-green-400 mt-1">✓ Description added — you can skip the photo & cards above</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Goal Physique */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">🎯 Your Goal Physique</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Where do you want to be?</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedGoal(opt.value)}
                  className={`text-left rounded-xl px-3 py-3 border-2 transition-all ${
                    selectedGoal === opt.value
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{opt.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Results */}
        {step === 3 && (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {loading && (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">🤖 Analysing your physique…</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">This takes a few seconds</p>
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center gap-4 py-10">
                <div className="text-4xl">⚠️</div>
                <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>
                <button
                  onClick={handleStartOver}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 transition-colors"
                >
                  ← Start Over
                </button>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-4">
                {/* Current type + summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Type</span>
                    <span className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-medium rounded-full px-2.5 py-0.5">
                      {result.current_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.current_summary}</p>
                </div>

                {/* Areas to focus */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Areas to Focus</p>
                  <ul className="space-y-1.5">
                    {result.areas_to_focus.map((area, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-base flex-shrink-0">🎯</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Approach */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recommended Approach</p>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${APPROACH_COLORS[result.approach] ?? APPROACH_COLORS.recomp}`}>
                      {APPROACH_LABELS[result.approach] ?? result.approach}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.approach_explanation}</p>
                </div>

                {/* Timeline + workout + diet */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-base flex-shrink-0">⏱️</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Timeline</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{result.timeline}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-base flex-shrink-0">🏋️</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Training</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{result.workout_recommendation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-base flex-shrink-0">🥗</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Diet</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{result.diet_recommendation}</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => { onGenerateWorkout(result.suggested_workout_prompt); onClose(); }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors shadow-sm"
                >
                  ✨ Generate My Personalised Plan
                </button>

                {/* Start over */}
                <button
                  onClick={handleStartOver}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 transition-colors"
                >
                  ← Start Over
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {step !== 3 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0 gap-3">
            {step === 1 && (
              <>
                <button onClick={onClose} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="bg-green-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </>
            )}
            {step === 2 && (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleAnalyse}
                  disabled={!canProceedStep2}
                  className="bg-green-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Analyse →
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
