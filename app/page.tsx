"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useSession, signIn } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sidebar from "./components/Sidebar";
import SavedRecipes from "./components/SavedRecipes";
import MealPlanModal from "./components/MealPlanModal";
import SavedPlans from "./components/SavedPlans";
import WorkoutModal from "./components/WorkoutModal";
import SavedWorkouts from "./components/SavedWorkouts";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; updated_at: string };
type Recipe = { id: string; title: string; content: string; created_at: string };
type MealPlan = { id: string; title: string; goal: string; diet: string; duration: number; content: string; created_at: string };
type Workout = { id: string; title: string; goal: string; target: string; level: string; equipment: string; duration: number; content: string; created_at: string };

const SUGGESTIONS = [
  { label: "🍛 Anti-inflammatory recipe", prompt: "Give me a recipe that fights inflammation" },
  { label: "🫀 Heart-healthy dinner", prompt: "Give me a heart-healthy dinner recipe with science explanations" },
  { label: "⚡ Energy-boosting breakfast", prompt: "Give me an energy-boosting breakfast recipe" },
  { label: "🧪 What does turmeric do?", prompt: "What does turmeric do and how do I activate it?" },
  { label: "🧄 Garlic & cooking", prompt: "What happens to garlic when you cook it?" },
  { label: "🥦 How to get the most from broccoli?", prompt: "How do I get the most out of broccoli?" },
];

export default function Home() {
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "recipes" | "meal-plans" | "workouts">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Open sidebar by default on desktop, keep closed on mobile
  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true);
  }, []);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load conversations and saved recipes when signed in
  useEffect(() => {
    if (session?.user) {
      fetchConversations();
      fetchSavedRecipes();
      fetchMealPlans();
      fetchWorkouts();
    }
  }, [session]);

  const fetchConversations = async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    if (data.conversations) setConversations(data.conversations);
  };

  const fetchSavedRecipes = async () => {
    const res = await fetch("/api/recipes");
    const data = await res.json();
    if (data.recipes) {
      setSavedRecipes(data.recipes);
      setSavedIds(new Set(data.recipes.map((r: Recipe) => r.id)));
    }
  };

  const handleSaveRecipe = async (content: string) => {
    const firstLine = content.split("\n").find((l) => l.trim()) ?? "Saved Recipe";
    const title = firstLine.replace(/^#+\s*/, "").replace(/\*+/g, "").trim().slice(0, 80);
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    const data = await res.json();
    if (data.id) {
      const newRecipe: Recipe = { id: data.id, title, content, created_at: new Date().toISOString() };
      setSavedRecipes((prev) => [newRecipe, ...prev]);
      setSavedIds((prev) => { const s = new Set(Array.from(prev)); s.add(data.id); return s; });
    }
  };

  const fetchMealPlans = async () => {
    const res = await fetch("/api/meal-plans");
    const data = await res.json();
    if (data.plans) setMealPlans(data.plans);
  };

  const handleMealPlanSaved = (plan: MealPlan) => {
    setMealPlans((prev) => [plan, ...prev]);
  };

  const fetchWorkouts = async () => {
    const res = await fetch("/api/workouts");
    const data = await res.json();
    if (data.workouts) setWorkouts(data.workouts);
  };

  const handleWorkoutSaved = (workout: Workout) => {
    setWorkouts((prev) => [workout, ...prev]);
  };

  const handleDeleteWorkout = async (id: string) => {
    await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  };

  const handleDeleteMealPlan = async (id: string) => {
    await fetch(`/api/meal-plans/${id}`, { method: "DELETE" });
    setMealPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDeleteRecipe = async (id: string) => {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
    setSavedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConvId(id);
    setMessages([]);
    const res = await fetch(`/api/conversations/${id}/messages`);
    const data = await res.json();
    if (data.messages) setMessages(data.messages);
  };

  const handleNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput("");
  };

  const handleDeleteConversation = async (id: string) => {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (activeConvId === id) handleNewChat();
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, conversationId: activeConvId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);

      // If a new conversation was created, update sidebar
      if (data.conversationId && data.conversationId !== activeConvId) {
        setActiveConvId(data.conversationId);
        fetchConversations();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [...prev, { role: "assistant", content: `Sorry, I ran into an issue: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="text-5xl">🧪</div>
          <p className="text-gray-500 text-sm">Loading NutriLab…</p>
        </div>
      </div>
    );
  }

  // ── Sign-in screen ───────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-gray-100">
        <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4">
          <div className="text-6xl">🧪</div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">NutriLab</h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Discover the science behind your ingredients. Sign in to save your chat history and meal plans.
            </p>
          </div>
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <p className="text-xs text-gray-400 text-center">
            Your chat history is saved securely to your account.
          </p>
        </div>
      </div>
    );
  }

  // ── Main app ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {showMealPlanModal && (
        <MealPlanModal
          onClose={() => setShowMealPlanModal(false)}
          onSaved={(plan) => { handleMealPlanSaved(plan); }}
        />
      )}
      {showWorkoutModal && (
        <WorkoutModal
          onClose={() => setShowWorkoutModal(false)}
          onSaved={(workout) => { handleWorkoutSaved(workout); }}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10 flex-shrink-0">
        {activeTab === "chat" && (
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="text-gray-400 hover:text-gray-600 transition-colors mr-1"
            title="Toggle sidebar"
          >
            ☰
          </button>
        )}
        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-lg flex-shrink-0">
          🧪
        </div>
        <div className="flex-1">
          <h1 className="font-semibold text-gray-900 leading-tight">NutriLab</h1>
          <p className="text-xs text-gray-500">The science behind your ingredients</p>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex px-4 gap-1">
          {(["chat", "recipes", "meal-plans", "workouts"] as const).map((tab) => {
            const labels = { chat: "💬 Chat", recipes: "📋 Recipes", "meal-plans": "🗓️ Meal Plans", workouts: "🏋️ Workouts" };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "recipes" && (
        <SavedRecipes recipes={savedRecipes} onDelete={handleDeleteRecipe} />
      )}
      {activeTab === "meal-plans" && (
        <SavedPlans plans={mealPlans} onDelete={handleDeleteMealPlan} onGenerate={() => setShowMealPlanModal(true)} />
      )}
      {activeTab === "workouts" && (
        <SavedWorkouts workouts={workouts} onDelete={handleDeleteWorkout} onGenerate={() => setShowWorkoutModal(true)} />
      )}
      {activeTab === "chat" && (
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <Sidebar
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelectConversation}
            onDelete={handleDeleteConversation}
            user={session.user}
          />
        )}

        {/* Floating New Chat button — only visible when sidebar is open */}
        {sidebarOpen && <button
          onClick={() => { handleNewChat(); setSidebarOpen(false); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="New Chat"
          aria-label="New Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
            <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 0 0-1.032-.211 50.89 50.89 0 0 0-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 0 0 2.433 3.984L7.28 21.53A.75.75 0 0 1 6 21v-4.03a48.527 48.527 0 0 1-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979Z" />
            <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.810 2.664 2.94 .887.074 1.78.122 2.676.145v2.771a.75.75 0 0 0 1.28.53l2.94-2.94a49.28 49.28 0 0 0 2.298-.538c1.606-.49 2.642-1.93 2.642-3.41v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.732 49.732 0 0 0 15.75 7.5Z" />
          </svg>
        </button>}

        {/* Chat area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center pb-10">
                <div className="text-7xl">🧪</div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">What&apos;s in your food?</h2>
                  <p className="text-gray-500 mt-2 max-w-sm">
                    Ask about any ingredient — discover its active compounds, health benefits, and the combinations that unlock its full potential.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.prompt}
                      onClick={() => send(s.prompt)}
                      className="text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-3 hover:bg-green-50 hover:border-green-300 transition-all text-gray-700 shadow-sm"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-sm flex-shrink-0 mb-0.5">
                        🧪
                      </div>
                    )}
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "bg-green-600 text-white rounded-br-sm whitespace-pre-wrap"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                    }`}>
                      {m.role === "user" ? m.content : (
                        <>
                          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-gray-900 prose-headings:text-gray-900 prose-headings:font-semibold prose-table:text-xs prose-th:bg-green-50 prose-th:text-green-900 prose-th:font-semibold prose-td:border-gray-200 prose-tr:border-gray-200">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                          </div>
                          <SaveButton content={m.content} savedIds={savedIds} onSave={handleSaveRecipe} />
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">🧪</div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5 items-center h-4">
                        {[0, 150, 300].map((delay) => (
                          <div key={delay} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any ingredient or combination…"
                disabled={loading}
                className="flex-1 border border-gray-300 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-green-600 text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function SaveButton({
  content,
  savedIds,
  onSave,
}: {
  content: string;
  savedIds: Set<string>;
  onSave: (content: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  // suppress unused warning — savedIds is used by parent to track per-id state
  void savedIds;

  const handle = async () => {
    if (saving || saved) return;
    setSaving(true);
    setError(false);
    try {
      await onSave(content);
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex justify-end mt-2">
      <button
        onClick={handle}
        disabled={saving || saved}
        className={`flex items-center gap-1 text-[11px] rounded-full px-2.5 py-1 transition-colors ${
          saved
            ? "text-green-700 bg-green-50 border border-green-200"
            : error
            ? "text-red-500 bg-red-50 border border-red-200 hover:bg-red-100"
            : "text-gray-400 hover:text-green-600 hover:bg-green-50 border border-transparent"
        }`}
        title={saved ? "Saved!" : error ? "Failed — click to retry" : "Save recipe"}
      >
        {saved ? "✓ Saved" : saving ? "Saving…" : error ? "⚠ Retry" : "🔖 Save"}
      </button>
    </div>
  );
}
