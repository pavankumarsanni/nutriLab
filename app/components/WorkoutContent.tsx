"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type WarmCoolItem = {
  name: string;
  duration: string;
  instructions: string[];
};

type Exercise = {
  name: string;
  muscle_group: string;
  sets: string;
  reps: string;
  rest: string;
  instructions: string[];
  common_mistakes: string[];
  youtube_query: string;
};

type WorkoutPlan = {
  intro: string;
  warmup: WarmCoolItem[];
  exercises: Exercise[];
  cooldown: WarmCoolItem[];
  pro_tips: string[];
};

function parseContent(content: string): WorkoutPlan | null {
  try {
    return JSON.parse(content) as WorkoutPlan;
  } catch {
    return null;
  }
}

export default function WorkoutContent({ content }: { content: string }) {
  const plan = parseContent(content);

  // Fallback to markdown for old-format workouts
  if (!plan) {
    return (
      <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-gray-900 prose-headings:text-gray-900 prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <p className="text-sm text-gray-600 leading-relaxed">{plan.intro}</p>

      {/* Warm-Up */}
      {plan.warmup?.length > 0 && (
        <Section title="🌡️ Warm-Up" subtitle="Get your body ready">
          <div className="space-y-2">
            {plan.warmup.map((item, i) => (
              <SimpleItem key={i} item={item} />
            ))}
          </div>
        </Section>
      )}

      {/* Main Exercises */}
      {plan.exercises?.length > 0 && (
        <Section title="💪 Main Workout" subtitle={`${plan.exercises.length} exercises`}>
          <div className="space-y-3">
            {plan.exercises.map((ex, i) => (
              <ExerciseCard key={i} exercise={ex} index={i + 1} />
            ))}
          </div>
        </Section>
      )}

      {/* Cool-Down */}
      {plan.cooldown?.length > 0 && (
        <Section title="🧘 Cool-Down" subtitle="Help your body recover">
          <div className="space-y-2">
            {plan.cooldown.map((item, i) => (
              <SimpleItem key={i} item={item} />
            ))}
          </div>
        </Section>
      )}

      {/* Pro Tips */}
      {plan.pro_tips?.length > 0 && (
        <Section title="💡 Pro Tips" subtitle="">
          <ul className="space-y-1.5">
            {plan.pro_tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function SimpleItem({ item }: { item: WarmCoolItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`text-green-600 text-xs transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
          <span className="text-sm font-medium text-gray-800">{item.name}</span>
          <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">{item.duration}</span>
        </div>
      </button>
      {open && (
        <ol className="mt-3 ml-4 space-y-1">
          {item.instructions.map((step, i) => (
            <li key={i} className="text-xs text-gray-600 flex gap-2">
              <span className="text-green-600 font-semibold flex-shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, index }: { exercise: Exercise; index: number }) {
  const [open, setOpen] = useState(false);
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.youtube_query)}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Card header — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{exercise.name}</p>
            <p className="text-[11px] text-gray-400">{exercise.muscle_group}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 hidden sm:block">
            {exercise.sets} × {exercise.reps}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50">
          {/* Stats row */}
          <div className="flex gap-2 flex-wrap">
            <Badge label="Sets" value={exercise.sets} />
            <Badge label="Reps" value={exercise.reps} />
            <Badge label="Rest" value={exercise.rest} />
          </div>

          {/* Instructions */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How to do it</p>
            <ol className="space-y-1.5">
              {exercise.instructions.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-700">
                  <span className="w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Common mistakes */}
          {exercise.common_mistakes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Common mistakes</p>
              <ul className="space-y-1">
                {exercise.common_mistakes.map((m, i) => (
                  <li key={i} className="flex gap-2 text-xs text-amber-700">
                    <span className="flex-shrink-0">⚠️</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* YouTube link */}
          <a
            href={ytUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 transition-colors"
          >
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
    <div className="flex flex-col items-center bg-white border border-gray-200 rounded-lg px-3 py-1.5 min-w-[56px]">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  );
}
