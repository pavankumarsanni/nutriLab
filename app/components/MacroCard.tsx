"use client";

type Profile = {
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  age: number | null;
  activity_level: string | null;
  sex: string | null;
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

function calculateTDEE(profile: Profile): { tdee: number; bmr: number } | null {
  const { height_cm, current_weight_kg, age, activity_level, sex } = profile;
  if (!height_cm || !current_weight_kg || !age || !activity_level) return null;

  let bmr: number;
  if (sex === "male") {
    bmr = 10 * current_weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else if (sex === "female") {
    bmr = 10 * current_weight_kg + 6.25 * height_cm - 5 * age - 161;
  } else {
    // Average of male and female formulas
    const bmrMale = 10 * current_weight_kg + 6.25 * height_cm - 5 * age + 5;
    const bmrFemale = 10 * current_weight_kg + 6.25 * height_cm - 5 * age - 161;
    bmr = (bmrMale + bmrFemale) / 2;
  }

  const multiplier = ACTIVITY_MULTIPLIERS[activity_level] ?? 1.375;
  return { bmr: Math.round(bmr), tdee: Math.round(bmr * multiplier) };
}

export default function MacroCard({ profile, onEditProfile }: { profile: Profile | null; onEditProfile: () => void }) {
  if (!profile || !profile.height_cm || !profile.current_weight_kg || !profile.age) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div className="text-4xl mb-3">🧮</div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Complete your profile</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Add your height, weight, age, and activity level to see your personalised calorie and macro targets.</p>
        <button
          onClick={onEditProfile}
          className="bg-green-600 text-white rounded-xl px-5 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Set up profile
        </button>
      </div>
    );
  }

  const result = calculateTDEE(profile);
  if (!result) return null;

  const { tdee } = result;

  // Macro split: 30% protein, 45% carbs, 25% fat
  const proteinKcal = Math.round(tdee * 0.30);
  const carbsKcal = Math.round(tdee * 0.45);
  const fatKcal = Math.round(tdee * 0.25);
  const proteinG = Math.round(proteinKcal / 4);
  const carbsG = Math.round(carbsKcal / 4);
  const fatG = Math.round(fatKcal / 9);

  // Goal direction
  const diff = profile.target_weight_kg && profile.current_weight_kg
    ? profile.target_weight_kg - profile.current_weight_kg
    : null;
  const goalCalories = diff === null ? tdee : diff < 0 ? tdee - 500 : diff > 0 ? tdee + 300 : tdee;
  const goalLabel = diff === null ? null : diff < 0 ? "deficit (fat loss)" : diff > 0 ? "surplus (muscle gain)" : "maintenance";

  const macros = [
    { label: "Protein", g: proteinG, kcal: proteinKcal, color: "bg-blue-500", light: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
    { label: "Carbs", g: carbsG, kcal: carbsKcal, color: "bg-yellow-400", light: "bg-yellow-50 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300" },
    { label: "Fat", g: fatG, kcal: fatKcal, color: "bg-red-400", light: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Daily Calorie & Macro Target</h3>
          {!profile.sex && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Add your sex in profile for precise TDEE</p>
          )}
        </div>
        <button onClick={onEditProfile} className="text-xs text-green-600 hover:text-green-700 dark:text-green-400">Edit profile</button>
      </div>

      {/* TDEE display */}
      <div className="text-center py-2">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Maintenance calories</p>
        <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{tdee.toLocaleString()}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">kcal / day</p>
        {goalLabel && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full px-3 py-1">
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              {goalCalories.toLocaleString()} kcal for {goalLabel}
            </span>
          </div>
        )}
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-3 gap-3">
        {macros.map((m) => (
          <div key={m.label} className={`${m.light} rounded-xl p-3 text-center`}>
            <div className={`w-full h-1 ${m.color} rounded-full mb-2`} />
            <p className={`text-lg font-bold ${m.text}`}>{m.g}g</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{m.label}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{m.kcal} kcal</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
        Based on Mifflin-St Jeor formula · Adjust based on how your body responds
      </p>
    </div>
  );
}
