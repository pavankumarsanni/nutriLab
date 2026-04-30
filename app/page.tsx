"use client";

import { useState, useRef, useEffect, FormEvent, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sidebar from "./components/Sidebar";
import SavedRecipes from "./components/SavedRecipes";
import MealPlanModal from "./components/MealPlanModal";
import SavedPlans from "./components/SavedPlans";
import WorkoutModal from "./components/WorkoutModal";
import SavedWorkouts from "./components/SavedWorkouts";
import ProfileSetupModal from "./components/ProfileSetupModal";
import ProgressDashboard from "./components/ProgressDashboard";
import { useTheme } from "./components/ThemeProvider";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; updated_at: string };
type Recipe = { id: string; title: string; content: string; created_at: string };
type MealPlan = { id: string; title: string; goal: string; diet: string; duration: number; content: string; created_at: string };
type Workout = { id: string; title: string; goal: string; target: string; level: string; equipment: string; duration: number; content: string; created_at: string };
type UserProfile = { height_cm: number | null; current_weight_kg: number | null; target_weight_kg: number | null; age: number | null; activity_level: string | null; injuries: string | null; sex: string | null; fitness_goal: string | null };
type WeightLog = { id: string; weight_kg: number; logged_at: string };

const SUGGESTIONS = [
  { label: "🔥 Foods that boost metabolism", prompt: "What foods naturally boost metabolism and how do they work?" },
  { label: "💪 Best protein sources for muscle gain", prompt: "What are the best protein sources for muscle gain and recovery?" },
  { label: "🫀 Heart-healthy dinner ideas", prompt: "Give me a heart-healthy dinner recipe with science explanations" },
  { label: "⚡ Pre-workout nutrition tips", prompt: "What should I eat before a workout to maximise performance?" },
  { label: "🧘 Anti-inflammatory foods", prompt: "Give me a list of anti-inflammatory foods and how to use them" },
  { label: "😴 Foods that improve sleep & recovery", prompt: "What foods help with sleep and workout recovery?" },
];

export default function Home() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "recipes" | "meal-plans" | "workouts" | "progress">("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Open sidebar by default on desktop, keep closed on mobile
  // Restore last active tab from localStorage
  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true);
    const lastTab = localStorage.getItem("activeTab") as "chat" | "recipes" | "meal-plans" | "workouts" | "progress" | null;
    if (lastTab) setActiveTab(lastTab);
  }, []);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null | undefined>(undefined);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load data when signed in
  useEffect(() => {
    if (session?.user) {
      fetchConversations();
      fetchSavedRecipes();
      fetchMealPlans();
      fetchWorkouts();
      fetchUserProfile();
      fetchWeightLogs();
    }
  }, [session]);

  const switchTab = useCallback((tab: "chat" | "recipes" | "meal-plans" | "workouts" | "progress") => {
    setActiveTab(tab);
    localStorage.setItem("activeTab", tab);
  }, []);

  const fetchConversations = async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    if (data.conversations) setConversations(data.conversations);
  };

  const fetchSavedRecipes = async () => {
    const res = await fetch("/api/recipes");
    const data = await res.json();
    if (data.recipes) setSavedRecipes(data.recipes);
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

  const fetchUserProfile = async () => {
    const res = await fetch("/api/user-profile");
    const data = await res.json();
    setUserProfile(data.profile ?? null);
    // Show setup modal automatically on first sign-in
    if (!data.profile) setShowProfileModal(true);
  };

  const fetchWeightLogs = async () => {
    const res = await fetch("/api/weight-logs");
    const data = await res.json();
    if (data.logs) setWeightLogs(data.logs);
  };

  const handleAddWeightLog = async (weight_kg: number, logged_at: string) => {
    const res = await fetch("/api/weight-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight_kg, logged_at }),
    });
    const data = await res.json();
    if (data.log) setWeightLogs((prev) => [...prev, data.log]);
  };

  const handleDeleteWeightLog = async (id: string) => {
    await fetch(`/api/weight-logs/${id}`, { method: "DELETE" });
    setWeightLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDeleteMealPlan = async (id: string) => {
    await fetch(`/api/meal-plans/${id}`, { method: "DELETE" });
    setMealPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDeleteRecipe = async (id: string) => {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
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
          <p className="text-gray-500 text-sm">Loading NutriFitLab…</p>
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
            <h1 className="text-2xl font-bold text-gray-900">NutriFitLab</h1>
            <p className="text-lg font-medium text-green-700 mt-1">Eat smart. Train hard.</p>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Your AI-powered nutrition & fitness companion. Sign in to save your chats, meal plans, and workouts.
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
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
      {showProfileModal && (
        <ProfileSetupModal
          existing={userProfile ?? null}
          onSaved={(profile) => { setUserProfile(profile); setShowProfileModal(false); }}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shadow-sm z-20 flex-shrink-0">
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
          <h1 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">NutriFitLab</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Eat smart. Train hard.</p>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* Avatar + profile dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => { setProfileMenuOpen((o) => !o); setConfirmSignOut(false); setConfirmDelete(false); }}
            className="flex items-center gap-2 rounded-full hover:bg-gray-50 px-2 py-1 transition-colors"
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt={session.user.name ?? ""} className="w-8 h-8 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800">
                {session.user.name?.[0] ?? "?"}
              </div>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-gray-400">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{session.user.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{session.user.email}</p>
              </div>

              <button
                onClick={() => { setShowProfileModal(true); setProfileMenuOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                ✏️ Edit profile
              </button>

              <div className="border-t border-gray-100 my-1" />

              {/* Sign out */}
              {confirmSignOut ? (
                <div className="px-4 py-2">
                  <p className="text-xs text-gray-600 mb-2">Sure you want to sign out?</p>
                  <div className="flex gap-2">
                    <button onClick={() => signOut()} className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1.5 transition-colors">Yes, sign out</button>
                    <button onClick={() => setConfirmSignOut(false)} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setConfirmSignOut(true); setConfirmDelete(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  🚪 Sign out
                </button>
              )}

              {/* Delete account */}
              {confirmDelete ? (
                <div className="px-4 py-2 bg-red-50 mx-2 mb-1 rounded-lg">
                  <p className="text-xs text-red-700 font-medium mb-2">Delete all data permanently?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await fetch("/api/account", { method: "DELETE" });
                          signOut({ callbackUrl: "/" });
                        } catch {
                          setDeleting(false);
                          setConfirmDelete(false);
                        }
                      }}
                      disabled={deleting}
                      className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60"
                    >
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setConfirmDelete(true); setConfirmSignOut(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  🗑️ Delete my account
                </button>
              )}

              <div className="border-t border-gray-100 my-1" />
              <div className="flex gap-3 px-4 py-2">
                <a href="/privacy" target="_blank" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">Privacy</a>
                <a href="/terms" target="_blank" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">Terms</a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex px-4 gap-1 overflow-x-auto">
          {(["chat", "recipes", "meal-plans", "workouts", "progress"] as const).map((tab) => {
            const labels = { chat: "💬 Chat", recipes: "📋 Saved Recipes", "meal-plans": "🗓️ Meal Plans", workouts: "🏋️ Workouts", progress: "📈 Progress" };
            return (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? "border-green-600 text-green-700 dark:text-green-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
      {activeTab === "progress" && (
        <ProgressDashboard
          profile={userProfile ?? null}
          weightLogs={weightLogs}
          onAddLog={handleAddWeightLog}
          onDeleteLog={handleDeleteWeightLog}
          onEditProfile={() => setShowProfileModal(true)}
        />
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
            onNewChat={handleNewChat}
          />
        )}


        {/* Chat area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center pb-10 px-2">
                <div className="flex items-center gap-2 text-5xl">🥗🏋️</div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Eat smart. Train hard.</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm text-sm">
                    Ask me anything about nutrition, ingredients, fitness, or recovery — I&apos;ll give you science-backed answers tailored to your goals.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.prompt}
                      onClick={() => send(s.prompt)}
                      className="text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 transition-all text-gray-700 dark:text-gray-300 shadow-sm"
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
                    <div className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "bg-green-600 text-white rounded-br-sm whitespace-pre-wrap"
                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-sm"
                    }`}>
                      {m.role === "user" ? m.content : (
                        <>
                          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-gray-900 prose-headings:text-gray-900 prose-headings:font-semibold prose-th:bg-green-50 prose-th:text-green-900 prose-th:font-semibold prose-td:border-gray-200 prose-tr:border-gray-200">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({ children }) => (
                                  <div className="overflow-x-auto w-full my-2">
                                    <table className="text-xs min-w-full">{children}</table>
                                  </div>
                                ),
                              }}
                            >{m.content}</ReactMarkdown>
                          </div>
                          {isRecipeResponse(m.content) && (
                            <SaveButton content={m.content} onSave={handleSaveRecipe} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">🧪</div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
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
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about nutrition, ingredients, fitness, recovery…"
                disabled={loading}
                className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-gray-50 dark:disabled:bg-gray-700"
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

// Detects if a chat response contains a recipe (has ingredients/instructions)
function isRecipeResponse(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    (lower.includes("ingredient") || lower.includes("instructions") || lower.includes("recipe")) &&
    !lower.includes("workout") &&
    !lower.includes("exercise") &&
    !lower.includes("sets") &&
    !lower.includes("reps")
  );
}

function SaveButton({
  content,
  onSave,
}: {
  content: string;
  onSave: (content: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

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
        title={saved ? "Saved to Recipes!" : error ? "Failed — click to retry" : "Save to Recipes"}
      >
        {saved ? "✓ Saved to Recipes" : saving ? "Saving…" : error ? "⚠ Retry" : "🔖 Save Recipe"}
      </button>
    </div>
  );
}

