const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const TOKEN_KEY = "spatial_token";

export const getToken = () => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
  });

  // Hosting platforms can return an HTML error page; do not crash on that.
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.message || data.errors?.[0]?.message || "Something went wrong. Please try again.",
    );
  }
  return data;
};
