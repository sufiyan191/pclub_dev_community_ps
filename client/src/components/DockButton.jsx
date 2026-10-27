export default function DockButton({ label, active = false, badge = false, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition duration-200 active:scale-90 ${
        active ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      {children}
      {badge && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-zinc-900/80" />}
    </button>
  );
}
