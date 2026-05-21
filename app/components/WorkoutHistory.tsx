"use client";
import { useState } from "react";

type LogSet = { id: string; log_id: string; exercise_name: string; set_number: number; reps: number | null; weight_kg: number | null };
type WorkoutLog = { id: string; workout_id: string | null; workout_title: string; duration_secs: number; mood: string | null; notes: string | null; logged_at: string };

type Props = {
  logs: WorkoutLog[];
  sets: LogSet[];
  onDelete: (id: string) => void;
};

export default function WorkoutHistory({ logs, sets, onDelete }: Props) {
  const [progressExercise, setProgressExercise] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Get unique exercise names across all logs for the progress picker
  const allExercises = Array.from(new Set(sets.map(s => s.exercise_name))).sort();

  // Group sets by log_id
  const setsByLog: Record<string, LogSet[]> = {};
  for (const s of sets) {
    if (!setsByLog[s.log_id]) setsByLog[s.log_id] = [];
    setsByLog[s.log_id].push(s);
  }

  // Progress data for selected exercise
  const progressData = progressExercise
    ? logs.flatMap(log => {
        const logSets = (setsByLog[log.id] ?? []).filter(s => s.exercise_name === progressExercise);
        if (!logSets.length) return [];
        const maxWeight = Math.max(...logSets.map(s => s.weight_kg ?? 0));
        const totalReps = logSets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
        return [{ date: log.logged_at, maxWeight, totalReps, setCount: logSets.length }];
      }).reverse()
    : [];

  const maxProgressWeight = Math.max(...progressData.map(d => d.maxWeight), 1);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-6 py-4 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">📈</span>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Workout History</h2>
          {logs.length > 0 && <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">{logs.length}</span>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-5">

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <span className="text-5xl">📊</span>
            <p className="text-gray-500 text-sm">No sessions logged yet.<br/>Complete a workout and tap &quot;Save Session&quot; to track your progress.</p>
          </div>
        ) : (
          <>
            {/* Progress tracker */}
            {allExercises.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">📈 Exercise Progress</h3>
                </div>
                <select
                  value={progressExercise}
                  onChange={e => setProgressExercise(e.target.value)}
                  className="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="">Select an exercise…</option>
                  {allExercises.map(e => <option key={e} value={e}>{e}</option>)}
                </select>

                {progressData.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Max weight per session (kg)</p>
                    {progressData.map((d, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400 w-16 flex-shrink-0">{new Date(d.date).toLocaleDateString('en-GB', {day:'numeric',month:'short'})}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${Math.max((d.maxWeight / maxProgressWeight) * 100, 8)}%` }}
                          >
                            <span className="text-[10px] font-bold text-white">{d.maxWeight > 0 ? `${d.maxWeight}kg` : '-'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 w-16 text-right">{d.totalReps} reps</span>
                      </div>
                    ))}
                    {progressData.length >= 2 && (() => {
                      const first = progressData[0].maxWeight;
                      const last = progressData[progressData.length-1].maxWeight;
                      const diff = last - first;
                      if (diff === 0) return null;
                      return (
                        <p className={`text-xs font-medium ${diff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                          {diff > 0 ? '🔥' : '📉'} {diff > 0 ? '+' : ''}{diff}kg since first session
                        </p>
                      );
                    })()}
                  </div>
                )}
                {progressExercise && progressData.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No data for this exercise yet</p>
                )}
              </div>
            )}

            {/* Session list */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {logs.map(log => {
                const logSets = setsByLog[log.id] ?? [];
                const exercises = Array.from(new Set(logSets.map(s => s.exercise_name)));
                const totalSets = logSets.length;
                return (
                  <details key={log.id} className="group py-3">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-green-600 group-open:rotate-90 transition-transform text-xs">▶</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{log.workout_title}</p>
                            {log.mood && <span className="text-base">{log.mood}</span>}
                          </div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {new Date(log.logged_at).toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short'})} · {Math.round(log.duration_secs/60)}min · {totalSets} sets
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        {confirmDelete === log.id ? (
                          <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
                            <span className="text-[10px] text-gray-500">Delete?</span>
                            <button onClick={() => { onDelete(log.id); setConfirmDelete(null); }}
                              className="text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 rounded px-1.5 py-0.5">Yes</button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="text-[10px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">No</button>
                          </div>
                        ) : (
                          <button onClick={e => { e.preventDefault(); setConfirmDelete(log.id); }}
                            className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </summary>
                    <div className="mt-3 pl-4 space-y-3">
                      {log.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">&quot;{log.notes}&quot;</p>
                      )}
                      {exercises.map(exName => {
                        const exSets = logSets.filter(s => s.exercise_name === exName).sort((a,b) => a.set_number - b.set_number);
                        return (
                          <div key={exName}>
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{exName}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {exSets.map((s, i) => (
                                <div key={i} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 text-center min-w-[56px]">
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Set {s.set_number}</p>
                                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">{s.weight_kg != null ? `${s.weight_kg}kg` : '—'}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{s.reps != null ? `${s.reps} reps` : '—'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
