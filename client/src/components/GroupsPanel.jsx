"use client";
import { Hash, Plus } from "lucide-react";
import PostCard from "./PostCard";
import Avatar from "./Avatar";
import { plural } from "../lib/format";

const segment = (on) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition duration-200 ${
    on ? "bg-white text-zinc-900" : "text-white/70 hover:text-white"
  }`;

export default function GroupsPanel({
  view,
  activeServer,
  isMember,
  canJoin,
  onJoin,
  servers,
  groups,
  activeGroup,
  onSelectGroup,
  onSelectServer,
  posts,
  loading,
  feedSort,
  onSortChange,
  selectedTag,
  onClearTag,
  onTag,
  activePostId,
  onOpenPost,
  currentUser,
  onCompose,
  onEditPost,
  onDeletePost,
  onVote,
  onProfile,
}) {
  const isHome = view === "home";

  return (
    <section
      aria-label={isHome ? "Home feed" : `${activeServer?.name ?? "Server"} groups and questions`}
      className="glass flex h-full flex-col overflow-hidden rounded-[2rem]"
    >
      {/* The inner wrapper keeps a minimum width, so text is clipped instead of re-wrapping while the panel collapses. */}
      <div className="flex h-full min-h-0 min-w-[min(30rem,calc(100vw-1.5rem))] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 pb-3 pt-5 sm:px-6">
          <div className="min-w-0">
            {isHome ? (
              <>
                <h1 className="text-xl font-semibold tracking-tight">Home</h1>
                <p className="text-sm text-white/60">Latest questions across every server</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white/14 px-2 text-xs font-medium">
                    {activeServer?.monogram}
                  </span>
                  <h1 className="truncate text-xl font-semibold tracking-tight">{activeServer?.name ?? "Pick a server"}</h1>
                </div>
                {activeServer?.description && (
                  <p className="mt-1 line-clamp-1 text-sm text-white/60">{activeServer.description}</p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canJoin && (
              <button
                onClick={onJoin}
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-ink transition hover:brightness-110 active:scale-95"
              >
                Join
              </button>
            )}
            {!isHome && isMember && <span className="text-sm text-white/50">Joined</span>}
            <div className="flex rounded-full bg-black/30 p-0.5" role="group" aria-label="Sort questions">
              <button onClick={() => onSortChange("newest")} className={segment(feedSort === "newest")}>
                Newest
              </button>
              <button onClick={() => onSortChange("top")} className={segment(feedSort === "top")}>
                Top
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
          {/* Groups (or, on Home, servers) */}
          <nav
            aria-label={isHome ? "Servers" : "Groups"}
            className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/10 px-4 py-3 xl:w-60 xl:flex-col xl:overflow-y-auto xl:border-b-0 xl:border-r xl:px-3 xl:py-4"
          >
            {isHome
              ? servers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelectServer(s)}
                    className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/14 px-1.5 text-xs">
                      {s.monogram}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{s.name}</span>
                      <span className="hidden text-xs text-white/50 xl:block">{plural(s.member_count ?? 0, "member")}</span>
                    </span>
                  </button>
                ))
              : groups.map((g) => {
                  const on = activeGroup?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => onSelectGroup(g)}
                      aria-current={on}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition duration-200 ${
                        on ? "bg-white/16 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Hash className="h-4 w-4 shrink-0 opacity-60" />
                      <span className="min-w-0">
                        <span className="block truncate">{g.name}</span>
                        <span className="hidden text-xs text-white/50 xl:block">{plural(g.post_count || 0, "question")}</span>
                      </span>
                    </button>
                  );
                })}
            {!isHome && groups.length === 0 && (
              <p className="px-3 py-2 text-sm text-white/50">No groups in this server yet.</p>
            )}
          </nav>

          {/* Feed */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {!isHome && (
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={currentUser?.username ?? "?"} />
                <button
                  onClick={onCompose}
                  disabled={!activeGroup}
                  className="flex h-10 min-w-0 flex-1 items-center justify-between rounded-full border border-white/12 bg-black/25 px-4 text-left text-sm text-white/60 transition hover:bg-black/35 disabled:opacity-50"
                >
                  <span className="truncate">
                    {activeGroup ? `Ask something in #${activeGroup.name}` : "Pick a group to ask a question"}
                  </span>
                  <Plus className="h-4 w-4 shrink-0" />
                </button>
              </div>
            )}

            {selectedTag && (
              <div className="mx-4 mb-2 flex items-center justify-between rounded-xl bg-accent/15 px-3 py-2 text-sm sm:mx-5">
                <span>
                  Showing <strong>#{selectedTag}</strong>
                </span>
                <button onClick={onClearTag} className="text-accent hover:underline">
                  Clear
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-5 sm:px-5">
              {loading && posts.length === 0 ? (
                <div className="space-y-3" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/6" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <div className="px-4 py-14 text-center text-sm text-white/55">
                  {selectedTag
                    ? `No questions tagged #${selectedTag} here.`
                    : isHome
                      ? "No questions yet. Open a server and ask the first one."
                      : "No questions in this group yet. Be the first to ask."}
                </div>
              ) : (
                posts.map((post, i) => (
                  <div key={post.id} className="rise-in" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
                    <PostCard
                      post={post}
                      showLocation={isHome}
                      active={activePostId === post.id}
                      isOwner={currentUser?.id === post.author_id}
                      onOpen={() => onOpenPost(post)}
                      onEdit={() => onEditPost(post)}
                      onDelete={() => onDeletePost(post)}
                      onVote={(value) => onVote("POST", post.id, value)}
                      onTag={onTag}
                      onProfile={onProfile}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
