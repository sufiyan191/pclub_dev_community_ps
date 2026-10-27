"use client";
import { PanelLeftOpen } from "lucide-react";
import { groupMonogram } from "../lib/format";

// What the groups panel shrinks into when the chat takes the centre.
export default function GroupRail({ open, groups, activeGroupId, onSelect, onRestore }) {
  return (
    <div
      data-open={open}
      aria-hidden={!open}
      className="rail glass-pill hidden h-[min(100%,32rem)] self-center rounded-full lg:block"
    >
      <div className="flex h-full w-14 flex-col items-center gap-2.5 overflow-y-auto py-4">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => onSelect(g)}
            aria-label={`#${g.name}`}
            title={`#${g.name}`}
            tabIndex={open ? 0 : -1}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-mono text-xs font-medium transition duration-300 ease-spatial active:scale-90 ${
              activeGroupId === g.id
                ? "scale-105 bg-accent text-accent-ink"
                : "bg-white/12 text-white/80 hover:bg-white/22 hover:text-white"
            }`}
          >
            {groupMonogram(g.name)}
          </button>
        ))}
        <button
          onClick={onRestore}
          tabIndex={open ? 0 : -1}
          aria-label="Bring the groups panel back to the centre"
          title="Bring groups back to the centre"
          className="mt-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
