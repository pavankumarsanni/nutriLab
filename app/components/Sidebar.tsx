"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

type Conversation = { id: string; title: string; updated_at: string };

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  user: { name?: string | null; email?: string | null; image?: string | null };
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
        c.id === activeId ? "bg-green-50 border border-green-200" : "hover:bg-gray-50"
      }`}
      onClick={() => onSelect(c.id)}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-xs truncate leading-snug ${c.id === activeId ? "text-green-900 font-medium" : "text-gray-700"}`}>
          {c.title}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-sm flex-shrink-0 mt-0.5"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

export default function Sidebar({ conversations, activeId, onSelect, onDelete, user }: Props) {
  const [recentChatsOpen, setRecentChatsOpen] = useState(true);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const groups = groupConversations(conversations);

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Recent Chats collapsible section */}
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={() => setRecentChatsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
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
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
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

      {/* User profile + sign out */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? ""} className="w-8 h-8 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{user.name}</p>
          </div>
          {confirmSignOut ? (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[11px] text-gray-500">Sure?</span>
              <button
                onClick={() => signOut()}
                className="text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                Yes
              </button>
              <span className="text-gray-300 text-[11px]">·</span>
              <button
                onClick={() => setConfirmSignOut(false)}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmSignOut(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.08a.75.75 0 1 0-1.04-1.08l-2.5 2.57a.75.75 0 0 0 0 1.08l2.5 2.57a.75.75 0 1 0 1.04-1.08l-1.048-1.08H18.25A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
