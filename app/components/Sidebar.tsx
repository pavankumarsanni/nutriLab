"use client";

import { useState } from "react";

type Conversation = { id: string; title: string; updated_at: string };

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
};

function groupConversations(conversations: Conversation[]): { label: string; items: Conversation[] }[] {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const last7Start = new Date(todayStart); last7Start.setDate(last7Start.getDate() - 7);

  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const last7: Conversation[] = [];
  const older: Conversation[] = [];

  for (const c of conversations) {
    const t = new Date(c.updated_at).getTime();
    if (t >= todayStart.getTime()) today.push(c);
    else if (t >= yesterdayStart.getTime()) yesterday.push(c);
    else if (t >= last7Start.getTime()) last7.push(c);
    else older.push(c);
  }

  return [
    { label: "Today", items: today },
    { label: "Yesterday", items: yesterday },
    { label: "Last 7 days", items: last7 },
    { label: "Older", items: older },
  ].filter((g) => g.items.length > 0);
}

function ConversationItem({ c, activeId, onSelect, onDelete }: {
  c: Conversation;
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`group flex items-start justify-between gap-1 mx-2 mb-0.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        c.id === activeId
          ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700"
          : "hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
      onClick={() => onSelect(c.id)}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs truncate leading-snug ${
          c.id === activeId
            ? "text-green-900 dark:text-green-300 font-medium"
            : "text-gray-700 dark:text-gray-300"
        }`}>
          {c.title}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-red-400 dark:hover:text-red-400 transition-all text-sm flex-shrink-0 mt-0.5"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

export default function Sidebar({ conversations, activeId, onSelect, onDelete, onNewChat, onClose }: Props) {
  const [recentChatsOpen, setRecentChatsOpen] = useState(true);
  const groups = groupConversations(conversations);

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* New Chat + collapse arrow */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0 flex gap-2">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          New Chat
        </button>
        <button
          onClick={onClose}
          title="Close sidebar"
          className="flex-shrink-0 flex items-center justify-center w-10 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Recent Chats collapsible section */}
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={() => setRecentChatsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <span>Recent Chats</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-3.5 h-3.5 transition-transform duration-200 ${recentChatsOpen ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>

        {recentChatsOpen && (
          <div className="pb-2">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-4 px-4">No conversations yet. Start chatting!</p>
            ) : (
              groups.map((group) => (
                <div key={group.label}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map((c) => (
                    <ConversationItem
                      key={c.id}
                      c={c}
                      activeId={activeId}
                      onSelect={onSelect}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
