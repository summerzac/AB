"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

interface ConversationListItem {
  id: string;
  updatedAt: string;
  manufacturer?: { id: string; companyName: string };
  buyer?: { id: string; name: string };
  product: { id: string; title: string } | null;
  messages: { body: string; createdAt: string }[];
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export default function ChatPage() {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  function loadConversations() {
    api<{ conversations: ConversationListItem[] }>("/api/conversations").then((r) => {
      setConversations(r.conversations);
      if (!activeId && r.conversations[0]) setActiveId(r.conversations[0].id);
    });
  }

  useEffect(() => {
    if (!user) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    socketRef.current = socket;
    function onMessage(msg: Message) {
      setMessages((prev) => (msg.conversationId === activeIdRef.current ? [...prev, msg] : prev));
      loadConversations();
    }
    socket.on("message:new", onMessage);
    return () => {
      socket.off("message:new", onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
    if (!activeId) return;
    api<{ messages: Message[] }>(`/api/conversations/${activeId}/messages`).then((r) => setMessages(r.messages));
    socketRef.current?.emit("conversation:join", activeId);
    return () => {
      socketRef.current?.emit("conversation:leave", activeId);
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!draft.trim() || !activeId) return;
    const body = draft;
    setDraft("");
    const res = await api<{ message: Message }>(`/api/conversations/${activeId}/messages`, {
      method: "POST",
      body: { body },
    });
    setMessages((prev) => [...prev, res.message]);
  }

  if (!user) return <div className="mx-auto max-w-4xl px-4 py-8">Please log in to view messages.</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <div className="grid grid-cols-3 gap-4 h-[70vh]">
        <div className="col-span-1 border border-black/10 dark:border-white/10 rounded-lg overflow-y-auto">
          {conversations.length === 0 && <p className="p-4 text-sm opacity-60">No conversations yet.</p>}
          {conversations.map((c) => {
            const counterparty = user.role === "BUYER" ? c.manufacturer?.companyName : c.buyer?.name;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-black/5 dark:border-white/5 hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
                  activeId === c.id ? "bg-neutral-100 dark:bg-neutral-800" : ""
                }`}
              >
                <p className="text-sm font-medium">{counterparty}</p>
                {c.product && <p className="text-xs opacity-60">Re: {c.product.title}</p>}
                <p className="text-xs opacity-60 line-clamp-1">{c.messages[0]?.body}</p>
              </button>
            );
          })}
        </div>

        <div className="col-span-2 border border-black/10 dark:border-white/10 rounded-lg flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  m.senderId === user.id ? "self-end bg-orange-600 text-white" : "self-start bg-neutral-100 dark:bg-neutral-800"
                }`}
              >
                {m.body}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          {activeId && (
            <div className="border-t border-black/10 dark:border-white/10 p-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                className="flex-1 rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
              />
              <button onClick={send} className="rounded-md bg-orange-600 text-white px-4 py-2 text-sm font-medium">
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
