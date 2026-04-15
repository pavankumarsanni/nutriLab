"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  { label: "🍛 Anti-inflammatory recipe", prompt: "Give me a recipe that fights inflammation" },
  { label: "🫀 Heart-healthy dinner", prompt: "Give me a heart-healthy dinner recipe with science explanations" },
  { label: "⚡ Energy-boosting breakfast", prompt: "Give me an energy-boosting breakfast recipe" },
  { label: "🧪 What does turmeric do?", prompt: "What does turmeric do and how do I activate it?" },
  { label: "🧄 Garlic & cooking", prompt: "What happens to garlic when you cook it?" },
  { label: "🥦 How to get the most from broccoli?", prompt: "How do I get the most out of broccoli?" },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, I ran into an issue: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center text-xl">
          🧪
        </div>
        <div>
          <h1 className="font-semibold text-gray-900 leading-tight">NutriLab</h1>
          <p className="text-xs text-gray-500">The science behind your ingredients</p>
        </div>
      </header>

      {/* Messages */}
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
              <div
                key={i}
                className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-sm flex-shrink-0 mb-0.5">
                    🧪
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-green-600 text-white rounded-br-sm whitespace-pre-wrap"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                  }`}
                >
                  {m.role === "user" ? (
                    m.content
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-gray-900 prose-headings:text-gray-900 prose-headings:font-semibold">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                  🧪
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 150, 300].map((delay) => (
                      <div
                        key={delay}
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
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
      <div className="bg-white border-t border-gray-200 px-4 py-3">
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
    </main>
  );
}
