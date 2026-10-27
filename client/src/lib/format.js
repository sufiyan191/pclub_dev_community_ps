export const initials = (name = "") => name.slice(0, 2).toUpperCase() || "?";

// "react-help" -> "RH", "general" -> "GE"
export const groupMonogram = (name = "") => {
  const parts = name.split("-").filter(Boolean);
  const letters =
    parts.length > 1 ? parts.map((p) => p[0]).join("") : name.slice(0, 2);
  return letters.toUpperCase().slice(0, 3);
};

export const clock = (value) =>
  new Date(value || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export const timeAgo = (value) => {
  const seconds = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const plural = (n, one, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
