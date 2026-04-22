"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Plan = { id?: string; title: string; content: string };
type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  onClose: () => void;
  onSaved: (plan: Plan & { id: string; goal: string; diet: string; duration: number; created_at: string }) => void;
};

const GOALS = [
  { value: "balanced",          label: "⚖️ Balanced & Nutritious",  desc: "Well-rounded everyday nutrition" },
  { value: "weight_loss",       label: "🔥 Weight Loss",             desc: "Calorie-conscious, filling meals" },
  { value: "high_protein",      label: "💪 High Protein",            desc: "Muscle building & recovery" },
  { value: "anti_inflammatory", label: "🫀 Anti-Inflammatory",       desc: "Reduce inflammation naturally" },
  { value: "energy",            label: "⚡ Energy & Focus",           desc: "Sustained energy all day" },
];

const DIETS = [
  { value: "none",        label: "🍽️ No restrictions" },
  { value: "vegetarian",  label: "🥗 Vegetarian" },
  { value: "vegan",       label: "🌱 Vegan" },
  { value: "gluten_free", label: "🌾 Gluten-Free" },
  { value: "dairy_free",  label: "🥛 Dairy-Free" },
];

const DURATIONS = [
  { value: 3,  label: "3 Days",  desc: "Quick start" },
  { value: 7,  label: "7 Days",  desc: "Full week" },
  { value: 14, label: "14 Days", desc: "Two weeks" },
];

export default function MealPlanModal({ onClose, onSaved }: Props) {
  const [step, setStep] = useState<"form" | "generating" | "result">("form");
  const [goal, setGoal] = useState("balanced");
  const [diet, setDiet] = useState("none");
  const [duration, setDuration] = useState(7);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    setStep("generating");
    setError("");
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, diet, duration, save: false }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlan({ title: data.title, content: data.content });
      setChatMessages([]);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("form");
    }
  };

  const handleSave = async () => {
    if (!plan || saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, diet, duration, save: true }),
      });
      const data = await res.json();
      if (data.id) {
        onSaved({
          id: data.id,
          title: plan.title,
          content: plan.content,
          goal, diet, duration,
          created_at: new Date().toISOString(),
        });
        setSaved(true);
      }
    } catch {
      // silent fail — plan is still displayed
    } finally {
      setSaving(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading || !plan) return;

    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setChatLoading(true);

    setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/meal-plans/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          planTitle: plan.title,
          planContent: plan.content,
        }),
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again." };
        return updated;
      });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗓️</span>
            <h2 className="font-semibold text-gray-900">Meal Plan Generator</h2>
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

            {/* Diet */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Diet preference</p>
              <div className="grid grid-cols-2 gap-2">
                {DIETS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDiet(d.value)}
                    className={`text-left rounded-xl px-4 py-2.5 border transition-all text-sm ${
                      diet === d.value
                        ? "border-green-500 bg-green-50 text-green-800 font-medium"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    {d.label}
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
                    className={`flex-1 rounded-xl px-4 py-3 border transition-all text-sm text-center ${
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
            <div className="text-5xl animate-bounce">🧑‍🍳</div>
            <p className="text-gray-600 font-medium">Building your meal plan…</p>
            <p className="text-gray-400 text-sm">This takes a few seconds</p>
            <div className="flex gap-1.5 mt-2">
              {[0, 150, 300].map((d) => (
                <div key={d} className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Result step */}
        {step === "result" && plan && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-gray-900 prose-headings:text-gray-900 prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm prose-table:text-xs prose-th:bg-green-50 prose-th:text-green-900 prose-th:font-semibold prose-td:border-gray-200 prose-tr:border-gray-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.content}</ReactMarkdown>
            </div>

            {/* Contextual Chat */}
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🤖</span>
                <p className="text-sm font-semibold text-gray-800">Ask your nutritionist</p>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Ask to swap meals, adjust calories, remove allergens, or anything about this plan.
              </p>

              {/* Chat messages */}
              {chatMessages.length > 0 && (
                <div className="space-y-3 mb-4">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-green-600 text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        }`}
                      >
                        {msg.content || (
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
              )}

              {/* Suggestion chips */}
              {chatMessages.length === 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    "Swap Monday dinner 🍽️",
                    "I'm allergic to nuts",
                    "Add more protein",
                    "What's the calorie count?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setChatInput(suggestion)}
                      className="text-xs bg-gray-50 border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                  placeholder="Ask anything about this meal plan…"
                  disabled={chatLoading}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 disabled:opacity-60"
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
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
                Generate Plan ✨
              </button>
            </>
          )}
          {step === "result" && (
            <>
              <button
                onClick={() => { setStep("form"); setPlan(null); setSaved(false); setChatMessages([]); }}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-4 py-2"
              >
                ← New Plan
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
                  {saved ? "✓ Saved!" : saving ? "Saving…" : "🔖 Save Plan"}
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
