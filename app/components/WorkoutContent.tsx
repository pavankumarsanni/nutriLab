"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type WarmCoolItem = { name: string; duration: string; instructions: string[] };
type Exercise = {
  name: string; muscle_group: string; sets: string; reps: string;
  rest: string; instructions: string[]; common_mistakes: string[]; youtube_query: string;
};
type WorkoutDay = {
  day: number; label: string;
  warmup: WarmCoolItem[]; exercises: Exercise[]; cooldown: WarmCoolItem[];
};
type WorkoutPlan = {
  type?: "multi_day";
  intro: string;
  // single-day fields
  warmup?: WarmCoolItem[]; exercises?: Exercise[]; cooldown?: WarmCoolItem[];
  // multi-day field
  days?: WorkoutDay[];
  pro_tips: string[];
};

type LoggedSet = { exerciseName: string; setNumber: number; reps: number | null; weightKg: number | null };

function parseContent(content: string): WorkoutPlan | null {
  try { return JSON.parse(content) as WorkoutPlan; } catch { /* continue */ }
  const fenceMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) { try { return JSON.parse(fenceMatch[1].trim()) as WorkoutPlan; } catch { /* continue */ } }
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]) as WorkoutPlan; } catch { /* continue */ } }
  return null;
}

function parseSets(sets: string): number {
  const match = sets.match(/\d+/);
  return match ? Math.min(parseInt(match[0]), 10) : 3;
}

function parseRestSeconds(rest: string): number {
  const lower = rest.toLowerCase();
  const rangeMin = lower.match(/(\d+)-(\d+)\s*min/);
  if (rangeMin) return Math.round((parseInt(rangeMin[1]) + parseInt(rangeMin[2])) / 2 * 60);
  const min = lower.match(/(\d+(?:\.\d+)?)\s*min/);
  if (min) return Math.round(parseFloat(min[1]) * 60);
  const sec = lower.match(/(\d+)\s*s/);
  if (sec) return parseInt(sec[1]);
  return 60;
}

// Shared AudioContext — created once on first user gesture so browsers allow sound
let sharedAudioCtx: AudioContext | null = null;

function unlockAudio() {
  try {
    if (!sharedAudioCtx) sharedAudioCtx = new AudioContext();
    if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  } catch { /* not supported */ }
}

function playBeep() {
  try {
    const ctx = sharedAudioCtx ?? new AudioContext();
    if (!sharedAudioCtx) sharedAudioCtx = ctx;
    ctx.resume().then(() => {
      [0, 0.15, 0.3].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; osc.type = "sine";
        gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    });
  } catch { /* audio not supported */ }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Rest Timer (floating) ─────────────────────────────────────────────────────
function RestTimerPanel({
  seconds, total, running, finished,
  onStart, onSkip, onClose,
}: {
  seconds: number; total: number; running: boolean; finished: boolean;
  onStart: (s: number) => void; onSkip: () => void; onClose: () => void;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? seconds / total : 0;
  const dash = circumference * progress;

  const PRESETS = [30, 60, 90, 120];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-sm">
      <div className={`rounded-2xl shadow-2xl border p-4 transition-colors ${
        finished
          ? "bg-green-600 border-green-500 text-white"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      }`}>
        {finished ? (
          <div className="text-center space-y-1">
            <p className="text-lg font-bold">✅ Rest done — next set!</p>
            <p className="text-sm opacity-80">Tap a preset to rest again</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {/* SVG ring */}
            <div className="flex-shrink-0">
              <svg width="88" height="88" className="-rotate-90">
                <circle cx="44" cy="44" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
                <circle
                  cx="44" cy="44" r={radius} fill="none"
                  stroke={running ? "#16a34a" : "#9ca3af"}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - dash}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <p className={`text-center text-lg font-bold -mt-14 w-[88px] ${running ? "text-green-700 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                {formatTime(seconds)}
              </p>
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rest Timer</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onStart(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                      running && total === s
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                    }`}
                  >
                    {s < 60 ? `${s}s` : `${s / 60}m`}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onSkip}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Skip
                </button>
                <button
                  onClick={onClose}
                  className="text-xs py-1.5 px-3 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {finished && (
          <div className="flex gap-2 mt-3">
            {PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => onStart(s)}
                className="flex-1 text-xs py-1.5 rounded-lg bg-white/20 hover:bg-white/30 font-medium transition-colors"
              >
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
            <button onClick={onClose} className="text-xs px-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared timer hooks ────────────────────────────────────────────────────────
// Uses wall-clock timestamps so timers stay accurate when the tab is hidden,
// the screen locks, or the user watches the YouTube link in another tab.
function useWorkoutTimers() {
  const [sessionRunning, setSessionRunning] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [restVisible, setRestVisible] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restTotal, setRestTotal] = useState(60);
  const [restRunning, setRestRunning] = useState(false);
  const [restFinished, setRestFinished] = useState(false);

  // Wall-clock refs — never reset by interval throttling
  const sessionStartRef = useRef<number | null>(null);   // Date.now() when current run started
  const sessionBaseRef  = useRef(0);                      // seconds already accumulated before this run
  const restStartRef    = useRef<number | null>(null);   // Date.now() when rest started
  const restTotalRef    = useRef(60);
  const tickRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTickRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Session timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionRunning) return;
    sessionStartRef.current = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current!) / 1000);
      setSessionSeconds(sessionBaseRef.current + elapsed);
    }, 500); // 500 ms ticks catch up faster after wakeup
    tickRef.current = id;
    return () => clearInterval(id);
  }, [sessionRunning]);

  // ── Page Visibility API — sync timers when tab regains focus ───────────────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;

      // Correct session timer immediately
      if (sessionRunning && sessionStartRef.current !== null) {
        const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        setSessionSeconds(sessionBaseRef.current + elapsed);
      }

      // Correct rest timer immediately
      if (restStartRef.current !== null) {
        const spent = Math.floor((Date.now() - restStartRef.current) / 1000);
        const remaining = restTotalRef.current - spent;
        if (remaining <= 0) {
          if (restTickRef.current) clearInterval(restTickRef.current);
          restTickRef.current = null;
          restStartRef.current = null;
          setRestSeconds(0);
          setRestRunning(false);
          setRestFinished(true);
          playBeep();
        } else {
          setRestSeconds(remaining);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sessionRunning]);

  // ── Rest timer ─────────────────────────────────────────────────────────────
  const startRest = useCallback((seconds: number) => {
    if (restTickRef.current) clearInterval(restTickRef.current);
    restTotalRef.current = seconds;
    restStartRef.current = Date.now();
    setRestTotal(seconds); setRestSeconds(seconds);
    setRestRunning(true); setRestFinished(false); setRestVisible(true);

    restTickRef.current = setInterval(() => {
      const spent = Math.floor((Date.now() - restStartRef.current!) / 1000);
      const remaining = restTotalRef.current - spent;
      if (remaining <= 0) {
        clearInterval(restTickRef.current!);
        restTickRef.current = null;
        restStartRef.current = null;
        setRestSeconds(0);
        setRestRunning(false);
        setRestFinished(true);
        playBeep();
      } else {
        setRestSeconds(remaining);
      }
    }, 500);
  }, []);

  const skipRest = useCallback(() => {
    if (restTickRef.current) clearInterval(restTickRef.current);
    restTickRef.current = null; restStartRef.current = null;
    setRestRunning(false); setRestFinished(false); setRestVisible(false);
  }, []);

  const closeRest = useCallback(() => {
    if (restTickRef.current) clearInterval(restTickRef.current);
    restTickRef.current = null; restStartRef.current = null;
    setRestRunning(false); setRestFinished(false); setRestVisible(false);
  }, []);

  const pauseSession = useCallback(() => {
    // Accumulate elapsed before pausing so resume picks up where we left off
    if (sessionStartRef.current !== null) {
      sessionBaseRef.current += Math.floor((Date.now() - sessionStartRef.current) / 1000);
      sessionStartRef.current = null;
    }
    setSessionRunning(false);
  }, []);

  const resetSession = useCallback(() => {
    sessionBaseRef.current = 0;
    sessionStartRef.current = null;
    setSessionRunning(false);
    setSessionSeconds(0);
  }, []);

  const startSession = useCallback(() => {
    unlockAudio();
    sessionStartRef.current = Date.now();
    setSessionRunning(true);
  }, []);

  const autoStartSession = useCallback(() => {
    if (!sessionRunning) { unlockAudio(); sessionStartRef.current = Date.now(); setSessionRunning(true); }
  }, [sessionRunning]);

  return {
    sessionRunning, sessionSeconds, restVisible, restSeconds, restTotal, restRunning, restFinished,
    startRest, skipRest, closeRest, pauseSession, resetSession, startSession, autoStartSession,
  };
}

// ── Session toolbar ───────────────────────────────────────────────────────────
function SessionBar({ sessionRunning, sessionSeconds, exerciseCount, totalSets, showFinish, unit, onToggle, onToggleUnit }: {
  sessionRunning: boolean; sessionSeconds: number; exerciseCount: number; totalSets: number;
  showFinish: boolean; unit: "kg" | "lbs"; onToggle: () => void; onToggleUnit: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-2xl px-4 py-3">
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500">Session time</p>
        <p className={`text-xl font-bold tabular-nums ${sessionRunning ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
          {formatTime(sessionSeconds)}
        </p>
        {/* kg / lbs toggle */}
        <button
          onClick={onToggleUnit}
          title="Switch weight unit"
          className="mt-1.5 flex items-center bg-gray-200 dark:bg-gray-600 rounded-full p-0.5 w-[56px]"
        >
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all ${unit === "kg" ? "bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>kg</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all ${unit === "lbs" ? "bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>lbs</span>
        </button>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-400 dark:text-gray-500">{exerciseCount} exercises · {totalSets} sets</p>
        <button
          onClick={onToggle}
          className={`mt-1 text-sm font-medium px-4 py-1.5 rounded-xl transition-colors ${
            showFinish
              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700"
              : sessionRunning
              ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {showFinish ? "🏁 Finish" : sessionRunning ? "⏹ End Workout" : "▶ Start Workout"}
        </button>
      </div>
    </div>
  );
}

// ── Single-day body ───────────────────────────────────────────────────────────
function DayBody({ warmup, exercises, cooldown, sessionRunning, onSetDone, onLogSet, unit }: {
  warmup: WarmCoolItem[]; exercises: Exercise[]; cooldown: WarmCoolItem[];
  sessionRunning: boolean; onSetDone: (restSecs: number) => void;
  onLogSet: (set: LoggedSet) => void; unit: "kg" | "lbs";
}) {
  return (
    <div className="space-y-6">
      {!sessionRunning && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          👇 Expand an exercise · tick sets to log them · rest timer starts automatically
        </p>
      )}
      {warmup?.length > 0 && (
        <Section title="🌡️ Warm-Up" subtitle="Get your body ready">
          <div className="space-y-2">{warmup.map((item, i) => <SimpleItem key={i} item={item} />)}</div>
        </Section>
      )}
      {exercises?.length > 0 && (
        <Section title="💪 Main Workout" subtitle={`${exercises.length} exercises`}>
          <div className="space-y-3">
            {exercises.map((ex, i) => (
              <ExerciseCard key={i} exercise={ex} index={i + 1} defaultOpen={i === 0} onSetDone={onSetDone} onLogSet={onLogSet} unit={unit} />
            ))}
          </div>
        </Section>
      )}
      {cooldown?.length > 0 && (
        <Section title="🧘 Cool-Down" subtitle="Help your body recover">
          <div className="space-y-2">{cooldown.map((item, i) => <SimpleItem key={i} item={item} />)}</div>
        </Section>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function WorkoutContent({ content, workoutId, workoutTitle }: { content: string; workoutId?: string; workoutTitle?: string }) {
  const plan = parseContent(content);
  const timers = useWorkoutTimers();
  const [activeDay, setActiveDay] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  const [mood, setMood] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const loggedSetsRef = useRef<LoggedSet[]>([]);
  const [unit, setUnit] = useState<"kg" | "lbs">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("workoutWeightUnit") as "kg" | "lbs") ?? "kg";
    }
    return "kg";
  });

  const toggleUnit = () => {
    const next = unit === "kg" ? "lbs" : "kg";
    setUnit(next);
    localStorage.setItem("workoutWeightUnit", next);
  };

  const handleLogSet = useCallback((set: LoggedSet) => {
    // Replace existing entry for same exercise+set or append
    loggedSetsRef.current = [
      ...loggedSetsRef.current.filter(
        (s) => !(s.exerciseName === set.exerciseName && s.setNumber === set.setNumber)
      ),
      set,
    ];
  }, []);

  const handleToggleSession = () => {
    if (showFinish) {
      // already in finish panel — do nothing (button now says "🏁 Finish")
      return;
    }
    if (timers.sessionRunning) {
      // End workout → show finish panel, pause timer
      timers.pauseSession();
      setShowFinish(true);
    } else {
      timers.startSession();
    }
  };

  const saveSession = async () => {
    setSaving(true);
    try {
      const title = workoutTitle ?? (plan ? (plan.days?.[activeDay]?.label ?? "Workout") : "Workout");
      await fetch("/api/workout-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutId: workoutId ?? null,
          workoutTitle: title,
          durationSecs: timers.sessionSeconds,
          mood: mood || null,
          notes: notes || null,
          sets: loggedSetsRef.current,
        }),
      });
      // Success toast via simple alert for now; real toast via state
      setShowFinish(false);
      setMood("");
      setNotes("");
      loggedSetsRef.current = [];
      timers.resetSession();
      // Show a brief success message
      setToast("✅ Session saved!");
      setTimeout(() => setToast(""), 3000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const discardSession = () => {
    setShowFinish(false);
    setMood("");
    setNotes("");
    loggedSetsRef.current = [];
    timers.resetSession();
  };

  const [toast, setToast] = useState("");

  // Fallback for old markdown-format workouts
  if (!plan) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  const handleSetDone = (restSecs: number) => { timers.startRest(restSecs); timers.autoStartSession(); };

  const finishPanel = showFinish && (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4 shadow-lg">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">🏁 Finish Session</h3>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Duration:</span>
        <span className="text-sm font-bold text-green-600">{formatTime(timers.sessionSeconds)}</span>
      </div>
      {/* Mood */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">How did it feel?</p>
        <div className="flex gap-2">
          {['😴','😐','🙂','💪','🔥'].map(m => (
            <button key={m} onClick={() => setMood(m)}
              className={`text-2xl p-1.5 rounded-xl border-2 transition-all ${mood === m ? 'border-green-500 scale-110' : 'border-transparent hover:border-gray-300'}`}
            >{m}</button>
          ))}
        </div>
      </div>
      {/* Notes */}
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="How did it feel? Any PRs? Notes..."
        rows={2}
        className="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-green-400 text-gray-800 dark:text-gray-100 placeholder-gray-400"
      />
      <div className="flex gap-3">
        <button onClick={saveSession}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
        >💾 Save Session</button>
        <button onClick={discardSession}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 transition-colors"
        >Discard</button>
      </div>
      {saving && <p className="text-xs text-center text-gray-400">Saving...</p>}
    </div>
  );

  // ── Multi-day plan — detect by presence of days[] array ────────────────────
  if (plan.days && plan.days.length > 0) {
    const day = plan.days[activeDay];
    const totalSets = day.exercises.reduce((s, ex) => s + parseSets(ex.sets), 0);

    return (
      <div className="space-y-4 pb-24">
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-lg">
            {toast}
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{plan.intro}</p>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {plan.days.map((d, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                activeDay === i
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-green-400"
              }`}
            >
              <span className="block text-[10px] opacity-70 font-normal">Day {d.day}</span>
              {d.label}
            </button>
          ))}
        </div>

        <SessionBar
          sessionRunning={timers.sessionRunning} sessionSeconds={timers.sessionSeconds}
          exerciseCount={day.exercises.length} totalSets={totalSets}
          showFinish={showFinish} unit={unit}
          onToggle={handleToggleSession} onToggleUnit={toggleUnit}
        />

        {finishPanel}

        <DayBody
          warmup={day.warmup} exercises={day.exercises} cooldown={day.cooldown}
          sessionRunning={timers.sessionRunning} onSetDone={handleSetDone}
          onLogSet={handleLogSet} unit={unit}
        />

        {plan.pro_tips?.length > 0 && (
          <Section title="💡 Pro Tips" subtitle="">
            <ul className="space-y-1.5">
              {plan.pro_tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span><span>{tip}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {timers.restVisible && (
          <RestTimerPanel seconds={timers.restSeconds} total={timers.restTotal}
            running={timers.restRunning} finished={timers.restFinished}
            onStart={timers.startRest} onSkip={timers.skipRest} onClose={timers.closeRest} />
        )}
      </div>
    );
  }

  // ── Single-day plan ─────────────────────────────────────────────────────────
  const exercises = plan.exercises ?? [];
  const totalSets = exercises.reduce((sum, ex) => sum + parseSets(ex.sets), 0);

  return (
    <div className="space-y-6 pb-24">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
      <SessionBar
        sessionRunning={timers.sessionRunning} sessionSeconds={timers.sessionSeconds}
        exerciseCount={exercises.length} totalSets={totalSets}
        showFinish={showFinish} unit={unit}
        onToggle={handleToggleSession} onToggleUnit={toggleUnit}
      />

      {finishPanel}

      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{plan.intro}</p>

      <DayBody
        warmup={plan.warmup ?? []} exercises={exercises} cooldown={plan.cooldown ?? []}
        sessionRunning={timers.sessionRunning} onSetDone={handleSetDone}
        onLogSet={handleLogSet} unit={unit}
      />

      {plan.pro_tips?.length > 0 && (
        <Section title="💡 Pro Tips" subtitle="">
          <ul className="space-y-1.5">
            {plan.pro_tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span><span>{tip}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {timers.restVisible && (
        <RestTimerPanel seconds={timers.restSeconds} total={timers.restTotal}
          running={timers.restRunning} finished={timers.restFinished}
          onStart={timers.startRest} onSkip={timers.skipRest} onClose={timers.closeRest} />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function SimpleItem({ item }: { item: WarmCoolItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <span className={`text-green-600 text-xs transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</span>
          <span className="text-xs text-gray-400 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2 py-0.5">{item.duration}</span>
        </div>
      </button>
      {open && (
        <ol className="mt-3 ml-4 space-y-1">
          {item.instructions.map((step, i) => (
            <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex gap-2">
              <span className="text-green-600 font-semibold flex-shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, index, onSetDone, onLogSet, unit, defaultOpen = false }: {
  exercise: Exercise; index: number; onSetDone: (restSeconds: number) => void;
  onLogSet: (set: LoggedSet) => void; unit: "kg" | "lbs"; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set());
  const [setData, setSetData] = useState<Record<number, { reps: string; weight: string }>>({});
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.youtube_query)}`;
  const numSets = parseSets(exercise.sets);
  const restSecs = parseRestSeconds(exercise.rest);
  const allDone = completedSets.size === numSets;

  const toKg = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return null;
    return unit === "lbs" ? Math.round(n * 0.453592 * 100) / 100 : n;
  };

  const toggleSet = (i: number) => {
    unlockAudio(); // must be called inside the click handler (user gesture)
    setCompletedSets((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
        onSetDone(restSecs);
        const d = setData[i];
        onLogSet({
          exerciseName: exercise.name,
          setNumber: i + 1,
          reps: d?.reps ? parseInt(d.reps) : null,
          weightKg: d?.weight ? toKg(d.weight) : null, // always stored as kg
        });
      }
      return next;
    });
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-xl overflow-hidden shadow-sm transition-colors ${
      allDone ? "border-green-300 dark:border-green-700" : "border-gray-200 dark:border-gray-700"
    }`}>
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
            allDone ? "bg-green-500 text-white" : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
          }`}>
            {allDone ? "✓" : index}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{exercise.name}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{exercise.muscle_group}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Set progress dots */}
          <div className="flex gap-1">
            {Array.from({ length: numSets }).map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${completedSets.has(i) ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"}`} />
            ))}
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 space-y-4 bg-gray-50 dark:bg-gray-700/30">

          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge label="Sets" value={exercise.sets} />
            <Badge label="Reps" value={exercise.reps} />
            <Badge label="Rest" value={exercise.rest} />
          </div>

          {/* Set tracker */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Track your sets — tap when done
            </p>
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: numSets }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => toggleSet(i)}
                  className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 text-xs font-bold transition-all ${
                    completedSets.has(i)
                      ? "bg-green-500 border-green-500 text-white scale-95"
                      : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-400"
                  }`}
                >
                  {completedSets.has(i) ? "✓" : `Set ${i + 1}`}
                  {completedSets.has(i) && <span className="text-[10px] font-normal opacity-80">done</span>}
                </button>
              ))}
            </div>
            {allDone && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">✅ All sets complete!</p>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">Rest timer starts automatically when you tick a set</p>
          </div>

          {/* Weight/reps log inputs */}
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Log your sets</p>
            <div className="space-y-2">
              {Array.from({ length: numSets }).map((_, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${completedSets.has(i) ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 flex-shrink-0">Set {i+1}</span>
                  <input type="number" placeholder={unit} min="0" step={unit === "lbs" ? "1" : "0.5"}
                    value={setData[i]?.weight ?? ''}
                    onChange={e => setSetData(prev => ({...prev, [i]: {...prev[i], weight: e.target.value}}))}
                    className="w-16 text-center text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <span className="text-xs text-gray-400">{unit}</span>
                  <input type="number" placeholder="reps" min="0"
                    value={setData[i]?.reps ?? ''}
                    onChange={e => setSetData(prev => ({...prev, [i]: {...prev[i], reps: e.target.value}}))}
                    className="w-16 text-center text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <span className="text-xs text-gray-400">reps</span>
                  {completedSets.has(i) && <span className="text-green-500 ml-auto">✓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">How to do it</p>
            <ol className="space-y-1.5">
              {exercise.instructions.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <span className="w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Common mistakes */}
          {exercise.common_mistakes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Common mistakes</p>
              <ul className="space-y-1">
                {exercise.common_mistakes.map((m, i) => (
                  <li key={i} className="flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <span className="flex-shrink-0">⚠️</span><span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* YouTube */}
          <a href={ytUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5 transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Watch on YouTube
          </a>
        </div>
      )}
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 min-w-[56px]">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{value}</span>
    </div>
  );
}
