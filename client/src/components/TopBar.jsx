"use client";
import { Code2, Maximize2, Minimize2, Search, X } from "lucide-react";
import Avatar from "./Avatar";

function ResultGroup({ title, children }) {
  return (
    <div>
      <div className="px-2 pb-1 pt-2 text-xs font-medium text-white/50">{title}</div>
      {children}
    </div>
  );
}

const rowClass =
  "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-white/10";

export default function TopBar({
  inputRef,
  query,
  onQueryChange,
  results,
  onClearSearch,
  stage,
  onToggleStage,
  onHome,
  onPickServer,
  onPickGroup,
  onPickPerson,
  onPickPost,
}) {
  const empty =
    results &&
    !results.servers?.length &&
    !results.groups?.length &&
    !results.people?.length &&
    !results.posts?.length;

  return (
    <header className="relative z-30 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:px-6 lg:pt-5">
      <div className="glass-pill relative flex h-14 w-full max-w-xl items-center gap-2 rounded-full pl-2 pr-2">
        <button
          onClick={onHome}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition active:scale-95"
          aria-label="SpatialDev home"
        >
          <Code2 className="h-5 w-5" />
        </button>

        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClearSearch()}
            placeholder="Search anything"
            aria-label="Search"
            className="h-10 w-full rounded-full border border-white/10 bg-black/25 pl-10 pr-9 text-base text-white placeholder:text-white/45 focus:border-white/35 focus:outline-none sm:text-sm"
          />
          {query && (
            <button
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={onToggleStage}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/85 transition hover:bg-white/20 lg:flex"
          aria-label={stage === "groups" ? "Focus the chat panel" : "Show the groups panel"}
          title={stage === "groups" ? "Focus the chat panel" : "Show the groups panel"}
        >
          {stage === "groups" ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </button>

        {results && (
          <div className="glass rise-in absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(24rem,60dvh)] overflow-y-auto rounded-3xl p-2">
            {empty && <div className="px-3 py-6 text-center text-sm text-white/60">No matches for “{query}”.</div>}

            {results.servers?.length > 0 && (
              <ResultGroup title="Servers">
                {results.servers.map((s) => (
                  <button key={s.id} onClick={() => onPickServer(s)} className={rowClass}>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-xs font-medium">
                      {s.monogram}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </ResultGroup>
            )}

            {results.groups?.length > 0 && (
              <ResultGroup title="Groups">
                {results.groups.map((g) => (
                  <button key={g.id} onClick={() => onPickGroup(g)} className={`${rowClass} justify-between`}>
                    <span className="truncate">#{g.name}</span>
                    <span className="shrink-0 text-xs text-white/50">{g.server_name}</span>
                  </button>
                ))}
              </ResultGroup>
            )}

            {results.people?.length > 0 && (
              <ResultGroup title="Developers">
                {results.people.map((u) => (
                  <button key={u.id} onClick={() => onPickPerson(u)} className={`${rowClass} justify-between`}>
                    <span className="flex items-center gap-2.5 truncate">
                      <Avatar name={u.username} size="sm" />@{u.username}
                    </span>
                    <span className="shrink-0 text-xs text-white/50">{u.reputation} rep</span>
                  </button>
                ))}
              </ResultGroup>
            )}

            {results.posts?.length > 0 && (
              <ResultGroup title="Questions">
                {results.posts.map((p) => (
                  <button key={p.id} onClick={() => onPickPost(p)} className={rowClass}>
                    <span className="truncate">{p.title}</span>
                  </button>
                ))}
              </ResultGroup>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
