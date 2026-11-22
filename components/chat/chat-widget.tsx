"use client";

import { useEffect, useRef, useState } from "react";
import { STORE } from "@/lib/ai/identity";
import { LogoMark, SparkO } from "../logo";
import { MessageText } from "./message-text";
import { stripFakeReceipts, useChat } from "./use-chat";

const SUGGESTIONS = [
  "Show me laptops under EGP 30,000",
  "What's on sale right now?",
  "How does payment and delivery work?",
  "Where is my last order?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, status, busy, send, stop, reset } = useChat();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (text = input) => {
    if (!text.trim() || busy) return;
    send(text);
    setInput("");
  };

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={STORE.assistantName}
          className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-3xl border border-line bg-background shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[600px] sm:w-[400px] sm:rounded-3xl"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <LogoMark size={32} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{STORE.assistantName}</p>
              <p className="text-xs text-muted">Help with products, your cart and orders</p>
            </div>
            {messages.length > 0 && (
              <button onClick={reset} className="rounded-full px-2 py-1 text-xs text-muted hover:bg-surface hover:text-foreground">
                New chat
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm" aria-live="polite">
            {messages.length === 0 ? (
              <div className="pt-4">
                <p className="text-base font-medium">Hi! I'm the {STORE.name} assistant.</p>
                <p className="mt-1 text-muted">
                  I can find products, compare prices, manage your cart and wishlist, and check your orders. I only help with
                  this store.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="rounded-xl border border-line px-3 py-2 text-left transition-colors hover:border-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="ml-10 rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-background">
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                ) : m.content ? (
                  <div
                    key={m.id}
                    className={`mr-6 rounded-2xl rounded-bl-md px-3.5 py-2.5 ${
                      m.error ? "bg-red-500/10 text-red-600" : m.denied ? "border border-line bg-background" : "bg-surface"
                    }`}
                  >
                    <MessageText text={stripFakeReceipts(m.content)} onNavigate={() => window.innerWidth < 640 && setOpen(false)} />
                    {m.receipts?.length ? (
                      <ul className="mt-2 space-y-1 border-t border-line pt-2">
                        {m.receipts.map((r, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-emerald-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                              <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null,
              )
            )}
            {status && (
              <p className="flex items-center gap-2 text-xs text-muted">
                <span className="flex gap-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </span>
                {status}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-end gap-2 border-t border-line p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder="Ask about products, your cart or orders…"
              aria-label="Message"
              className="input max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
            />
            {busy ? (
              <button type="button" onClick={stop} aria-label="Stop" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line hover:bg-surface">
                <span className="h-3 w-3 rounded-sm bg-foreground" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : `Chat with ${STORE.assistantName}`}
        aria-expanded={open}
        className={`fixed bottom-5 right-5 z-50 items-center rounded-full shadow-lg transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:bottom-6 sm:right-6 ${
          open
            ? "hidden h-12 w-12 justify-center sm:flex sm:bg-foreground sm:text-background"
            : "flex h-12 gap-2 bg-accent pl-1.5 pr-4 text-white"
        }`}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <>
            {/* The brand's ring-and-spark on a white disc, then a plain label so it's clear what this does. */}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-accent">
              <SparkO className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold">Ask {STORE.name}</span>
          </>
        )}
      </button>
    </>
  );
}
