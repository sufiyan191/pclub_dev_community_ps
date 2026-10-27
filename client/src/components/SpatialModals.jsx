"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Sparkles, LogOut } from "lucide-react";
import { apiRequest } from "../lib/api";

const ENVIRONMENT_PRESETS = [
  {
    name: "Minimal Concrete Loft (VisionOS Default)",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85",
  },
  {
    name: "Warm Architectural Lounge",
    url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2000&q=85",
  },
  {
    name: "Nordic Studio Daylight",
    url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=85",
  },
  {
    name: "Yosemite Dusk Horizon",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=85",
  },
];

export default function SpatialModals({
  activeModal,
  setActiveModal,
  currentUser,
  setCurrentUser,
  activeServer,
  editingPost,
  viewedProfile,
  bgImage,
  setBgImage,
  onRefreshData,
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    bio: "",
    skills: "",
    title: "",
    content: "",
    tags: "",
    serverName: "",
    serverDesc: "",
    groupName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    if (activeModal === "editPost" && editingPost) {
      setForm((f) => ({
        ...f,
        title: editingPost.title || "",
        content: editingPost.content || "",
        tags: (editingPost.tags || []).join(", "),
      }));
    } else if (activeModal === "profile" && currentUser) {
      setForm((f) => ({
        ...f,
        bio: currentUser.bio || "B.Tech CSE Developer building spatial web architectures.",
        skills: (currentUser.skills || ["C++", "Next.js", "PostgreSQL", "Node.js"]).join(", "),
      }));
    }
  }, [activeModal, editingPost, currentUser]);

  if (!activeModal) return null;

  const close = () => setActiveModal(null);

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const res = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });
      if (res?.token) localStorage.setItem("token", res.token);
      setCurrentUser(
        res?.user || {
          username: form.username || form.email.split("@")[0],
          email: form.email,
        }
      );
      onRefreshData?.();
      close();
    } catch (err) {
      // Allow local demo login if backend isn't running
      const fallbackUser = {
        id: "local-user",
        username: form.username || form.email.split("@")[0] || "sufiyan",
        email: form.email,
      };
      setCurrentUser(fallbackUser);
      close();
    } finally {
      setLoading(false);
    }
  }

  async function handlePostSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const endpoint =
        activeModal === "editPost" && editingPost
          ? `/posts/${editingPost.id}`
          : "/posts";
      const method = activeModal === "editPost" ? "PUT" : "POST";
      await apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          tags,
        }),
      });
      onRefreshData?.();
      close();
    } catch {
      close();
    } finally {
      setLoading(false);
    }
  }

  async function handleServerOrGroupSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeModal === "createServer") {
        await apiRequest("/servers", {
          method: "POST",
          body: JSON.stringify({
            name: form.serverName,
            description: form.serverDesc,
          }),
        });
      } else if (activeModal === "createGroup" && activeServer) {
        await apiRequest(`/servers/${activeServer.id}/groups`, {
          method: "POST",
          body: JSON.stringify({ name: form.groupName }),
        });
      }
      onRefreshData?.();
      close();
    } catch {
      close();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fadeIn">
      <div className="vision-window w-full max-w-md rounded-[32px] p-6 text-white space-y-5 relative">
        <button
          onClick={close}
          className="vision-btn absolute right-5 top-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/75"
        >
          <X className="w-4 h-4" />
        </button>

        {/* AUTH MODAL */}
        {activeModal === "auth" && (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <h3 className="text-lg font-bold">
                {isLogin ? "Sign in to SpatialDev" : "Create Developer Account"}
              </h3>
              <p className="text-xs text-white/55 mt-0.5">
                JWT session authentication for PClub Community
              </p>
            </div>

            {!isLogin && (
              <input
                type="text"
                required
                placeholder="Username (e.g. sufiyan)"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full bg-black/30 rounded-2xl px-4 py-2.5 text-sm border border-white/14 outline-none focus:border-white/35"
              />
            )}
            <input
              type="email"
              required
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-black/30 rounded-2xl px-4 py-2.5 text-sm border border-white/14 outline-none focus:border-white/35"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-black/30 rounded-2xl px-4 py-2.5 text-sm border border-white/14 outline-none focus:border-white/35"
            />

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="vision-btn w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-semibold text-sm py-2.5 rounded-full"
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Register"}
            </button>

            <p className="text-xs text-center text-white/60">
              {isLogin ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#58b9ff] hover:underline font-medium"
              >
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </p>
          </form>
        )}

        {/* CREATE / EDIT POST MODAL */}
        {(activeModal === "createPost" || activeModal === "editPost") && (
          <form onSubmit={handlePostSubmit} className="space-y-4">
            <h3 className="text-lg font-bold">
              {activeModal === "editPost" ? "Edit Post" : "Publish Technical Post"}
            </h3>
            <input
              type="text"
              required
              placeholder="Question or Post Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-black/30 rounded-2xl px-4 py-2.5 text-sm border border-white/14 outline-none"
            />
            <textarea
              rows={5}
              required
              placeholder="Write markdown or paste code inside ``` blocks..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full bg-black/30 rounded-2xl px-4 py-2.5 text-sm border border-white/14 outline-none font-mono"
            />
            <input
              type="text"
              placeholder="Tags (comma-separated: nextjs, postgres, algorithms)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full bg-black/30 rounded-2xl px-4 py-2.5 text-sm border border-white/14 outline-none"
            />
            <button
              type="submit"
              className="vision-btn w-full bg-[#1d9bf0] text-white font-semibold text-sm py-2.5 rounded-full"
            >
              {activeModal === "editPost" ? "Save Changes" : "Publish Post"}
            </button>
          </form>
        )}

        {/* CREATE SERVER / GROUP MODAL */}
        {(activeModal === "createServer" || activeModal === "createGroup") && (
          <form onSubmit={handleServerOrGroupSubmit} className="space-y-4">
            <h3 className="text-lg font-bold">
              {activeModal === "createServer"
                ? "Create Community Server"
                : `New Channel in ${activeServer?.name || "Server"}`}
            </h3>
            {activeModal === "createServer" ? (
              <>
                <input
                  type="text"
                  required
                  placeholder="Server Name (e.g. IIT Indore Systems)"
                  value={form.serverName}
                  onChange={(e) =>
                    setForm({ ...form, serverName: e.target.value })
                  }
                  className="w-full bg-black/30 rounded-2xl px-4 py-2.5 text-sm border border-white/14 outline-none"
                />
                <input
                  type="text"
                  placeholder="Short description"
                  value={form.serverDesc}
                  onChange={(e) =>
                    setForm({ ...form, serverDesc: e.target.value })
                  }
                  className="w-full bg-black/30 rounded-2xl px-4 py-2.5 text-sm border border-white/14 outline-none"
                />
              </>
            ) : (
              <input
                type="text"
                required
                placeholder="Channel Name (e.g. backend-architecture)"
                value={form.groupName}
                onChange={(e) =>
                  setForm({ ...form, groupName: e.target.value })
                }
                className="w-full bg-black/30 rounded-2xl px-4 py-2.5 text-sm border border-white/14 outline-none"
              />
            )}
            <button
              type="submit"
              className="vision-btn w-full bg-[#1d9bf0] text-white font-semibold text-sm py-2.5 rounded-full"
            >
              Create
            </button>
          </form>
        )}

        {/* PROFILE MODAL */}
        {activeModal === "profile" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <img
                src={`[https://api.dicebear.com/7.x/avataaars/svg?seed=$](https://api.dicebear.com/7.x/avataaars/svg?seed=$){
                  viewedProfile?.username || currentUser?.username || "sufiyan"
                }`}
                alt="Profile"
                className="w-14 h-14 rounded-full bg-white/15 border border-white/20"
              />
              <div>
                <h3 className="text-lg font-bold">
                  {viewedProfile?.username || currentUser?.username || "Developer"}
                </h3>
                <p className="text-xs text-white/55">
                  {viewedProfile?.email || currentUser?.email || "Member · PClub IIT Indore"}
                </p>
              </div>
            </div>
            <p className="text-xs text-white/80 leading-relaxed bg-black/25 p-3.5 rounded-2xl border border-white/10">
              {form.bio}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {form.skills
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((skill) => (
                  <span
                    key={skill}
                    className="text-xs bg-white/10 px-3 py-1 rounded-full border border-white/12"
                  >
                    {skill}
                  </span>
                ))}
            </div>
            {currentUser && (
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  setCurrentUser(null);
                  close();
                }}
                className="vision-btn w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold py-2.5 rounded-full flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4"/> Log Out
              </button>
            )}
          </div>
        )}

        {/* SPATIAL ENVIRONMENT BACKGROUND CHOOSER */}
        {activeModal === "background" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold">Spatial Environment</h3>
              <p className="text-xs text-white/55">
                Choose the ambient room backdrop behind your visionOS glass windows
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ENVIRONMENT_PRESETS.map((env) => (
                <button
                  key={env.url}
                  onClick={() => setBgImage(env.url)}
                  className={`group relative rounded-2xl overflow-hidden border text-left transition-all aspect-video ${
                    bgImage === env.url
                      ? "border-[#1d9bf0] ring-2 ring-[#1d9bf0]/50"
                      : "border-white/15 hover:border-white/40"
                  }`}
                >
                  <img
                    src={env.url}
                    alt={env.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex items-end">
                    <span className="text-[11px] font-medium text-white leading-tight">
                      {env.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}