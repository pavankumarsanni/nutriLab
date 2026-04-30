"use client";

type Profile = {
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  age: number | null;
  activity_level: string | null;
  sex: string | null;
  fitness_goal: string | null;
};

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

type GoalConfig = {
  label: string;
  emoji: string;
  calorieAdjust: number;
  color: string;
  macros: { protein: number; carbs: number; fat: number };
};

const GOAL_CONFIG: Record<string, GoalConfig> = {
  lose_weight: {
    label: "Weight Loss",
    emoji: "🔥",
    calorieAdjust: -500,
    color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300",
    macros: { protein: 0.40, carbs: 0.35, fat: 0.25 },
  },
  maintain: {
    label: "Maintenance",
    emoji: "⚖️",
    calorieAdjust: 0,
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300",
    macros: { protein: 0.30, carbs: 0.45, fat: 0.25 },
  },
  lean_muscle: {
    label: "Lean Muscle Gain",
    emoji: "💪",
    calorieAdjust: 250,
    color: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300",
    macros: { protein: 0.35, carbs: 0.45, fat: 0.20 },
  },
  bulk: {
    label: "Bulk",
    emoji: "📈",
    calorieAdjust: 500,
    color: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300",
    macros: { protein: 0.30, carbs: 0.50, fat: 0.20 },
  },
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
    bmr = 10 * current_weight_kg + 6.25 * height_cm - 5 * age - 78;
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

  const goal = profile.fitness_goal ? GOAL_CONFIG[profile.fitness_goal] : null;
  const targetCalories = goal ? tdee + goal.calorieAdjust : tdee;
  const macroSplit = goal?.macros ?? { protein: 0.30, carbs: 0.45, fat: 0.25 };

  const proteinKcal = Math.round(targetCalories * macroSplit.protein);
  const carbsKcal = Math.round(targetCalories * macroSplit.carbs);
  const fatKcal = Math.round(targetCalories * macroSplit.fat);
  const proteinG = Math.round(proteinKcal / 4);
  const carbsG = Math.round(carbsKcal / 4);
  const fatG = Math.round(fatKcal / 9);

  const macros = [
    { label: "Protein", g: proteinG, kcal: proteinKcal, color: "bg-blue-500", light: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
    { label: "Carbs",   g: carbsG,   kcal: carbsKcal,   color: "bg-yellow-400", light: "bg-yellow-50 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300" },
    { label: "Fat",     g: fatG,     kcal: fatKcal,     color: "bg-red-400", light: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
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

      {/* Goal badge */}
      {goal ? (
        <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 border text-sm font-medium ${goal.color}`}>
          <span>{goal.emoji}</span>
          <span>{goal.label}</span>
          {goal.calorieAdjust !== 0 && (
            <span className="text-xs opacity-70">
              ({goal.calorieAdjust > 0 ? "+" : ""}{goal.calorieAdjust} kcal from maintenance)
            </span>
          )}
        </div>
      ) : (
        <button
          onClick={onEditProfile}
          className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
        >
          🎯 Set your fitness goal for personalised targets
        </button>
      )}

      {/* Calorie display */}
      <div className="text-center py-2">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
          {goal ? "Target calories" : "Maintenance calories"}
        </p>
        <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">{targetCalories.toLocaleString()}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">kcal / day</p>
        {goal && goal.calorieAdjust !== 0 && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Maintenance: {tdee.toLocaleString()} kcal</p>
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
