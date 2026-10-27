"use client";
import { Compass } from "lucide-react";

function ServerButton({ server, active, onSelect, size = "h-10 w-10" }) {
  return (
    <button
      onClick={() => onSelect(server)}
      aria-label={server.name}
      aria-current={active}
      title={server.name}
      className={`${size} flex shrink-0 items-center justify-center rounded-full text-sm font-medium transition duration-300 ease-spatial active:scale-90 ${
        active
          ? "scale-105 bg-accent text-accent-ink"
          : "bg-white/12 text-white/80 hover:bg-white/22 hover:text-white"
      }`}
    >
      {server.monogram}
    </button>
  );
}

// Desktop: the second vertical bar that slides out of the main dock.
export function ServerRail({ open, servers, activeServerId, onSelect, onDiscover }) {
  return (
    <div
      data-open={open}
      aria-hidden={!open}
      className="rail glass-pill hidden h-[min(100%,32rem)] self-center rounded-full lg:block"
    >
      <div className="flex h-full w-14 flex-col items-center gap-2.5 overflow-y-auto py-4">
        {servers.map((s) => (
          <ServerButton key={s.id} server={s} active={activeServerId === s.id} onSelect={onSelect} />
        ))}
        <button
          onClick={onDiscover}
          aria-label="Discover servers"
          title="Discover servers"
          tabIndex={open ? 0 : -1}
          className="mt-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-white/30 text-white/70 transition hover:border-white/60 hover:text-white"
        >
          <Compass className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Phones: the same list as a horizontal strip that unfolds under the search bar.
export function ServerStrip({ open, servers, activeServerId, onSelect, onDiscover }) {
  return (
    <div
      aria-hidden={!open}
      className={`grid px-3 transition-[grid-template-rows,opacity,margin] duration-500 ease-spatial lg:hidden ${
        open ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div className="glass-pill flex items-center gap-2.5 overflow-x-auto rounded-full p-2">
          {servers.map((s) => (
            <ServerButton key={s.id} server={s} active={activeServerId === s.id} onSelect={onSelect} />
          ))}
          <button
            onClick={onDiscover}
            tabIndex={open ? 0 : -1}
            aria-label="Discover servers"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-white/30 text-white/70"
          >
            <Compass className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
