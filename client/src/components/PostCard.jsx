"use client";
import { CheckCircle2, ChevronDown, ChevronUp, MessageSquare, Pencil, Trash2 } from "lucide-react";
import Avatar from "./Avatar";
import { plural, timeAgo } from "../lib/format";

// Cards show a plain-text teaser; the full Markdown renders in the thread view.
const teaser = (markdown = "") =>
  markdown
    .replace(/```[\s\S]*?```/g, " [code] ")
    .replace(/[#*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white";

export default function PostCard({
  post,
  active,
  isOwner,
  showLocation,
  onOpen,
  onEdit,
  onDelete,
  onVote,
  onTag,
  onProfile,
}) {
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  return (
    <article
      onClick={onOpen}
      className={`cursor-pointer rounded-2xl border p-4 transition duration-200 ${
        active ? "border-accent/60 bg-white/12" : "border-white/10 bg-black/20 hover:bg-white/8"
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-sm text-white/60">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={post.author_username} size="sm" />
          <button onClick={stop(() => onProfile(post.author_username))} className="truncate font-medium text-white hover:underline">
            @{post.author_username}
          </button>
          <span className="hidden shrink-0 text-xs sm:inline">{post.author_reputation} rep</span>
          <span className="shrink-0 text-xs">· {timeAgo(post.created_at)}</span>
        </div>

        <div className="flex shrink-0 items-center">
          {post.accepted_comment_id && (
            <span className="mr-1 flex items-center gap-1 rounded-full bg-good/15 px-2 py-0.5 text-xs text-good">
              <CheckCircle2 className="h-3.5 w-3.5" /> Solved
            </span>
          )}
          {isOwner && (
            <>
              <button onClick={stop(onEdit)} className={iconButton} aria-label="Edit your post">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={stop(onDelete)} className={`${iconButton} hover:!text-bad`} aria-label="Delete your post">
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {showLocation && (
        <p className="mt-2 text-xs text-white/50">
          {post.server_monogram} · #{post.group_name}
        </p>
      )}

      <h3 className="mt-2 text-base font-semibold leading-snug">{post.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/70">{teaser(post.body_markdown)}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {post.tags?.map((tag) => (
            <button
              key={tag}
              onClick={stop(() => onTag(tag))}
              className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 transition hover:bg-accent hover:text-accent-ink"
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center rounded-full bg-white/10">
            <button onClick={stop(() => onVote(1))} className={iconButton} aria-label="Upvote">
              <ChevronUp className="h-[18px] w-[18px]" />
            </button>
            <span className="min-w-6 text-center text-sm font-medium tabular-nums">{post.score}</span>
            <button onClick={stop(() => onVote(-1))} className={iconButton} aria-label="Downvote">
              <ChevronDown className="h-[18px] w-[18px]" />
            </button>
          </div>
          <span className="flex items-center gap-1.5 text-white/60">
            <MessageSquare className="h-4 w-4" />
            {plural(post.comment_count || 0, "answer")}
          </span>
        </div>
      </div>
    </article>
  );
}
