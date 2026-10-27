"use client";
import { useEffect, useRef } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Code2,
  HelpCircle,
  Maximize2,
  MessageSquare,
  Send,
} from "lucide-react";
import Avatar from "./Avatar";
import Markdown from "./Markdown";
import { clock, plural, timeAgo } from "../lib/format";

const tabButton = (on) =>
  `flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition duration-200 ${
    on ? "bg-white text-zinc-900" : "text-white/70 hover:text-white"
  }`;

const smallIcon =
  "flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/12 hover:text-white";

export default function ChatPanel({
  stage,
  onFocus,
  onBack,
  activeGroup,
  activeServer,
  tab,
  onTabChange,
  messages,
  chatInput,
  onChatInput,
  codeInput,
  onCodeInput,
  showCode,
  onToggleCode,
  chatError,
  onSendChat,
  activePost,
  comments,
  answerInput,
  onAnswerInput,
  onSubmitAnswer,
  onAccept,
  onVote,
  onProfile,
  currentUser,
  onSignIn,
}) {
  const scroller = useRef(null);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scroller.current;
    if (el && tab === "chat") el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, tab, stage]);

  const title = activeGroup ? `#${activeGroup.name}` : "Messages";
  const people = new Set(messages.map((m) => m.senderUsername)).size;

  return (
    <section
      aria-label="Group conversation"
      onClick={stage === "groups" ? onFocus : undefined}
      className={`chat-panel glass relative h-full overflow-hidden rounded-[2rem] ${stage === "groups" ? "cursor-pointer" : ""}`}
    >
      {/* ---------- Compact view: the tilted "Messages" wing ---------- */}
      <div className="layer layer-wing flex flex-col" aria-hidden={stage !== "groups"}>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{title}</h2>
            <p className="truncate text-sm text-white/55">
              {activeGroup ? `${activeServer?.name} · ${plural(people, "person", "people")} chatting` : "Pick a group to see its chat"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabChange(tab === "chat" ? "qa" : "chat");
              }}
              className={smallIcon}
              aria-label={tab === "chat" ? "Show answers instead" : "Show chat instead"}
            >
              {tab === "chat" ? <HelpCircle className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFocus();
              }}
              className={smallIcon}
              aria-label="Bring this panel to the centre"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {tab === "chat" ? (
            messages.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-white/55">
                {activeGroup ? "No messages yet. Open the chat and say hello." : "Choose a group to start."}
              </p>
            ) : (
              [...messages].reverse().map((m, i) => (
                <div key={m._id ?? i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white/8">
                  <Avatar name={m.senderUsername} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{m.senderUsername}</span>
                      <span className="shrink-0 text-xs text-white/45">{clock(m.createdAt)}</span>
                    </div>
                    <p className="truncate text-sm text-white/65">{m.content}</p>
                  </div>
                </div>
              ))
            )
          ) : !activePost ? (
            <p className="px-4 py-12 text-center text-sm text-white/55">Open a question from the feed to see its answers here.</p>
          ) : (
            <>
              <p className="px-3 pb-2 pt-1 text-sm font-medium text-white/80">{activePost.title}</p>
              {comments.length === 0 && <p className="px-3 text-sm text-white/55">No answers yet.</p>}
              {comments.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/8">
                  <Avatar name={c.author_username} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">@{c.author_username}</span>
                      <span className="shrink-0 text-xs text-white/45">{c.score} votes</span>
                    </div>
                    <p className="truncate text-sm text-white/65">{c.body_markdown}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ---------- Full view: the chat once it has the centre ---------- */}
      <div className="layer layer-full flex flex-col" aria-hidden={stage !== "chat"}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={onBack} className={smallIcon} aria-label="Back to groups" tabIndex={stage === "chat" ? 0 : -1}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{title}</h2>
              {activeServer && <p className="truncate text-sm text-white/55">{activeServer.name}</p>}
            </div>
          </div>

          <div className="flex rounded-full bg-black/30 p-0.5" role="tablist">
            <button role="tab" aria-selected={tab === "chat"} onClick={() => onTabChange("chat")} className={tabButton(tab === "chat")}>
              <MessageSquare className="h-4 w-4" /> Chat
            </button>
            <button role="tab" aria-selected={tab === "qa"} onClick={() => onTabChange("qa")} className={tabButton(tab === "qa")}>
              <HelpCircle className="h-4 w-4" /> Answers
            </button>
          </div>
        </div>

        {tab === "chat" ? (
          <div key="chat" className="fade-in flex min-h-0 flex-1 flex-col">
            <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
              {messages.length === 0 ? (
                <p className="py-14 text-center text-sm text-white/55">
                  {activeGroup ? `Nobody has said anything in #${activeGroup.name} yet.` : "Pick a group to join its conversation."}
                </p>
              ) : (
                messages.map((m, i) => (
                  <div key={m._id ?? i} className="flex gap-3">
                    <Avatar name={m.senderUsername} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <button onClick={() => onProfile(m.senderUsername)} className="text-sm font-medium hover:underline">
                          {m.senderUsername}
                        </button>
                        <span className="text-xs text-white/45">{clock(m.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">{m.content}</p>
                      {m.codeSnippet && (
                        <pre className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-black/55 p-3 font-mono text-[13px] leading-relaxed text-white/90">
                          <code>{m.codeSnippet}</code>
                        </pre>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {currentUser ? (
              <form onSubmit={onSendChat} className="space-y-2 border-t border-white/10 p-3 sm:p-4">
                {showCode && (
                  <textarea
                    rows={3}
                    value={codeInput}
                    onChange={(e) => onCodeInput(e.target.value)}
                    placeholder="Paste a code snippet"
                    className="field font-mono"
                  />
                )}
                {chatError && <p className="px-1 text-sm text-bad">{chatError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleCode}
                    aria-label="Attach a code snippet"
                    aria-pressed={showCode}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                      showCode ? "bg-accent text-accent-ink" : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    <Code2 className="h-4 w-4" />
                  </button>
                  <input
                    value={chatInput}
                    onChange={(e) => onChatInput(e.target.value)}
                    placeholder={activeGroup ? `Message #${activeGroup.name}` : "Pick a group first"}
                    disabled={!activeGroup}
                    maxLength={2000}
                    className="field !rounded-full"
                  />
                  <button
                    type="submit"
                    disabled={!activeGroup || !chatInput.trim()}
                    aria-label="Send message"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition active:scale-90 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="border-t border-white/10 p-4 text-center text-sm text-white/70">
                <button onClick={onSignIn} className="font-medium text-accent hover:underline">
                  Sign in
                </button>{" "}
                to join the conversation.
              </div>
            )}
          </div>
        ) : (
          <div key="qa" className="fade-in flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
              {!activePost ? (
                <p className="py-14 text-center text-sm text-white/55">Open a question from the feed to read and answer it here.</p>
              ) : (
                <>
                  <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/55">
                      Asked by{" "}
                      <button onClick={() => onProfile(activePost.author_username)} className="font-medium text-white hover:underline">
                        @{activePost.author_username}
                      </button>{" "}
                      · {timeAgo(activePost.created_at)}
                    </p>
                    <h3 className="mb-3 mt-1 text-lg font-semibold leading-snug">{activePost.title}</h3>
                    <Markdown>{activePost.body_markdown}</Markdown>
                  </article>

                  <h4 className="text-sm font-medium text-white/60">{plural(comments.length, "answer")}</h4>

                  {comments.map((c) => {
                    const accepted = activePost.accepted_comment_id === c.id;
                    return (
                      <article
                        key={c.id}
                        className={`rounded-2xl border p-4 ${accepted ? "border-good/50 bg-good/10" : "border-white/10 bg-black/20"}`}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <button onClick={() => onProfile(c.author_username)} className="font-medium hover:underline">
                              @{c.author_username}
                            </button>
                            {accepted && (
                              <span className="flex items-center gap-1 rounded-full bg-good/20 px-2 py-0.5 text-xs text-good">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {currentUser?.id === activePost.author_id && !accepted && (
                              <button
                                onClick={() => onAccept(c.id)}
                                className="rounded-full bg-good/15 px-3 py-1 text-xs text-good transition hover:bg-good/25"
                              >
                                Accept answer
                              </button>
                            )}
                            <div className="flex items-center rounded-full bg-white/10">
                              <button onClick={() => onVote("COMMENT", c.id, 1)} className={smallIcon} aria-label="Upvote answer">
                                <ChevronUp className="h-[18px] w-[18px]" />
                              </button>
                              <span className="min-w-6 text-center text-sm font-medium tabular-nums">{c.score}</span>
                              <button onClick={() => onVote("COMMENT", c.id, -1)} className={smallIcon} aria-label="Downvote answer">
                                <ChevronDown className="h-[18px] w-[18px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <Markdown>{c.body_markdown}</Markdown>
                      </article>
                    );
                  })}
                </>
              )}
            </div>

            {activePost &&
              (currentUser ? (
                <form onSubmit={onSubmitAnswer} className="space-y-2 border-t border-white/10 p-3 sm:p-4">
                  <textarea
                    rows={3}
                    value={answerInput}
                    onChange={(e) => onAnswerInput(e.target.value)}
                    placeholder="Write an answer. Markdown works, and fenced code blocks get highlighted."
                    className="field font-mono"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={answerInput.trim().length < 2}
                      className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition active:scale-95 disabled:opacity-40"
                    >
                      Post answer
                    </button>
                  </div>
                </form>
              ) : (
                <div className="border-t border-white/10 p-4 text-center text-sm text-white/70">
                  <button onClick={onSignIn} className="font-medium text-accent hover:underline">
                    Sign in
                  </button>{" "}
                  to answer this question.
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
