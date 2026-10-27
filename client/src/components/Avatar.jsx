import { initials } from "../lib/format";

const SIZES = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-base",
};

// Muted solid tones so a list of people is easy to tell apart without gradients.
const TONES = [
  "bg-stone-500/55",
  "bg-slate-500/55",
  "bg-zinc-500/55",
  "bg-neutral-500/55",
  "bg-gray-500/55",
  "bg-amber-800/55",
];

const toneFor = (name = "") => {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
};

export default function Avatar({ name, size = "md", className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${SIZES[size]} ${toneFor(name)} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
