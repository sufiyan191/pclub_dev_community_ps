"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { apiRequest } from "../lib/api";
import Avatar from "./Avatar";
import { plural } from "../lib/format";

const BACKGROUNDS = [
  {
    name: "Concrete loft",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80",
  },
  {
    name: "Alpine night",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2000&q=80",
  },
  {
    name: "Dark studio",
    url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80",
  },
];

const splitList = (text = "") =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const primaryButton =
  "rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition hover:brightness-110 active:scale-95 disabled:opacity-50";
const quietButton =
  "rounded-full bg-white/10 px-4 py-2 text-sm text-white/85 transition hover:bg-white/20 active:scale-95";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-white/75">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/50">{hint}</span>}
    </label>
  );
}

function ErrorLine({ message }) {
  return message ? (
    <p role="alert" className="rounded-xl bg-bad/15 px-3 py-2 text-sm text-bad">
      {message}
    </p>
  ) : null;
}

/* Each form owns its state, so closing and reopening a modal always starts clean. */

function useSubmit(action) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", email: "", password: "", bio: "", skills: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const { error, busy, run } = useSubmit(async () => {
    const isLogin = mode === "login";
    const res = await apiRequest(isLogin ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      body: JSON.stringify(
        isLogin
          ? { email: f.email, password: f.password }
          : { username: f.username, email: f.email, password: f.password, bio: f.bio, skills: splitList(f.skills) },
      ),
    });
    await onAuthSuccess(res.user, res.token);
  });

  return (
    <form onSubmit={run} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
        <p className="mt-1 text-sm text-white/60">
          {mode === "login" ? "Sign in to ask, answer and chat." : "It takes a few seconds."}
        </p>
      </div>

      {mode === "register" && (
        <Field label="Username" hint="Letters, numbers and underscores.">
          <input className="field" required autoComplete="username" value={f.username} onChange={set("username")} />
        </Field>
      )}
      <Field label="Email">
        <input className="field" type="email" required autoComplete="email" value={f.email} onChange={set("email")} />
      </Field>
      <Field label="Password" hint={mode === "register" ? "At least 8 characters." : undefined}>
        <input
          className="field"
          type="password"
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={f.password}
          onChange={set("password")}
        />
      </Field>
      {mode === "register" && (
        <>
          <Field label="Bio (optional)">
            <input className="field" maxLength={300} value={f.bio} onChange={set("bio")} />
          </Field>
          <Field label="Skills (optional)" hint="Separate with commas, for example C++, React, PostgreSQL.">
            <input className="field" value={f.skills} onChange={set("skills")} />
          </Field>
        </>
      )}

      <ErrorLine message={error} />
      <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
        {busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-white/60">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-accent hover:underline">
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </form>
  );
}

function PostForm({ groupId, post, onDone }) {
  const editing = Boolean(post);
  const [f, setF] = useState({
    title: post?.title ?? "",
    body: post?.body_markdown ?? "",
    tags: (post?.tags ?? []).join(", "),
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const { error, busy, run } = useSubmit(async () => {
    const payload = { title: f.title, body_markdown: f.body, tags: splitList(f.tags).map((t) => t.toLowerCase()) };
    await apiRequest(editing ? `/api/posts/${post.id}` : "/api/posts", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(editing ? payload : { ...payload, group_id: groupId }),
    });
    await onDone();
  });

  return (
    <form onSubmit={run} className="space-y-4">
      <Field label="Title" hint="At least 5 characters.">
        <input className="field" required minLength={5} maxLength={255} autoFocus value={f.title} onChange={set("title")} />
      </Field>
      <Field label="Details" hint="Markdown works. Put code in fenced blocks, for example ```js.">
        <textarea className="field font-mono" rows={7} required minLength={10} value={f.body} onChange={set("body")} />
      </Field>
      <Field label="Tags" hint="Up to 6, separated by commas.">
        <input className="field" value={f.tags} onChange={set("tags")} />
      </Field>
      <ErrorLine message={error} />
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Saving…" : editing ? "Save changes" : "Post question"}
      </button>
    </form>
  );
}

function GroupForm({ server, onDone }) {
  const [f, setF] = useState({ name: "", description: "" });
  const { error, busy, run } = useSubmit(async () => {
    await apiRequest(`/api/servers/${server.id}/groups`, {
      method: "POST",
      body: JSON.stringify({ name: f.name.trim().toLowerCase().replace(/\s+/g, "-"), description: f.description }),
    });
    await onDone();
  });

  return (
    <form onSubmit={run} className="space-y-4">
      <Field label="Group name" hint="Lowercase letters, numbers and hyphens, for example react-help.">
        <input className="field" required autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      </Field>
      <Field label="Description (optional)">
        <input className="field" maxLength={250} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </Field>
      <ErrorLine message={error} />
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Creating…" : `Add to ${server.name}`}
      </button>
    </form>
  );
}

function ServerForm({ onDone }) {
  const [f, setF] = useState({ name: "", monogram: "", description: "" });
  const { error, busy, run } = useSubmit(async () => {
    const res = await apiRequest("/api/servers", {
      method: "POST",
      body: JSON.stringify({ name: f.name, monogram: f.monogram.toUpperCase().slice(0, 4), description: f.description }),
    });
    await onDone(res.server);
  });

  return (
    <form onSubmit={run} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Server name">
            <input className="field" required minLength={3} autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
        </div>
        <Field label="Monogram">
          <input
            className="field uppercase"
            required
            maxLength={4}
            value={f.monogram}
            onChange={(e) => setF({ ...f, monogram: e.target.value })}
          />
        </Field>
      </div>
      <Field label="What is it for? (optional)">
        <input className="field" maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </Field>
      <ErrorLine message={error} />
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy ? "Creating…" : "Create server"}
      </button>
    </form>
  );
}

function CreateHub({ activeServer, activeGroup, onPostDone, onGroupDone, onServerDone }) {
  const tabs = [
    activeGroup && { id: "post", label: "Question" },
    activeServer && { id: "group", label: "Group" },
    { id: "server", label: "Server" },
  ].filter(Boolean);
  const [tab, setTab] = useState(tabs[0].id);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold">Create</h2>
      <div className="flex rounded-full bg-black/30 p-0.5" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition duration-200 ${
              tab === t.id ? "bg-white text-zinc-900" : "text-white/70 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-white/60">
        {tab === "post" && `Ask a question in #${activeGroup.name}.`}
        {tab === "group" && `Add a group to ${activeServer?.name}.`}
        {tab === "server" && "Start a new community. You’ll be its owner."}
      </p>
      {tab === "post" && <PostForm groupId={activeGroup.id} onDone={onPostDone} />}
      {tab === "group" && <GroupForm server={activeServer} onDone={onGroupDone} />}
      {tab === "server" && <ServerForm onDone={onServerDone} />}
    </div>
  );
}

function SettingsPanel({ bgImage, setBgImage, currentUser, onProfileSaved, onLogout }) {
  const [bg, setBg] = useState(bgImage);
  const [profile, setProfile] = useState({
    bio: currentUser?.bio ?? "",
    skills: (currentUser?.skills ?? []).join(", "),
  });

  const applyBackground = (url) => {
    setBg(url);
    setBgImage(url);
    try {
      localStorage.setItem("spatial_bg", url);
    } catch {
      /* private mode: the choice just won't be remembered */
    }
  };

  const { error, busy, run } = useSubmit(async () => {
    const res = await apiRequest("/api/auth/profile", {
      method: "PUT",
      // Sent as typed, so an emptied field really clears the old value.
      body: JSON.stringify({ bio: profile.bio, skills: splitList(profile.skills) }),
    });
    onProfileSaved(res.user);
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-white/80">Background</h3>
        <div className="flex flex-wrap gap-2">
          {BACKGROUNDS.map((b) => (
            <button key={b.name} onClick={() => applyBackground(b.url)} className={quietButton}>
              {b.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="field"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            placeholder="Paste an image address"
            aria-label="Custom background image address"
          />
          <button onClick={() => applyBackground(bg.trim())} className={quietButton}>
            Apply
          </button>
        </div>
      </section>

      {currentUser && (
        <form onSubmit={run} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/80">Profile · @{currentUser.username}</h3>
            <span className="text-sm text-white/60">{currentUser.reputation} rep</span>
          </div>
          <Field label="Bio">
            <input className="field" maxLength={300} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
          </Field>
          <Field label="Skills" hint="Separate with commas.">
            <input className="field" value={profile.skills} onChange={(e) => setProfile({ ...profile, skills: e.target.value })} />
          </Field>
          <ErrorLine message={error} />
          <div className="flex items-center justify-between">
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? "Saving…" : "Save profile"}
            </button>
            <button type="button" onClick={onLogout} className="text-sm text-bad hover:underline">
              Sign out
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ProfileView({ profile }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={profile.username} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">@{profile.username}</h2>
          <p className="text-sm text-white/60">{profile.reputation} reputation</p>
        </div>
      </div>
      <p className="text-sm text-white/80">{profile.bio || "No bio yet."}</p>

      {profile.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map((s) => (
            <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/85">
              {s}
            </span>
          ))}
        </div>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-white/70">Questions ({profile.recent_posts?.length ?? 0})</h3>
        {profile.recent_posts?.length ? (
          profile.recent_posts.map((p) => (
            <div key={p.id} className="flex justify-between gap-3 rounded-xl bg-white/6 px-3 py-2 text-sm">
              <span className="truncate">{p.title}</span>
              <span className="shrink-0 text-white/55">{p.score} votes</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/50">Nothing asked yet.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-white/70">Answers ({profile.recent_comments?.length ?? 0})</h3>
        {profile.recent_comments?.length ? (
          profile.recent_comments.map((c) => (
            <div key={c.id} className="rounded-xl bg-white/6 px-3 py-2 text-sm">
              <p className="text-xs text-white/50">On {c.post_title}</p>
              <p className="truncate text-white/85">{c.body_markdown}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/50">No answers yet.</p>
        )}
      </section>
    </div>
  );
}

function Discover({ servers, joinedIds, currentUser, onJoin, onOpen, onSignIn }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Discover servers</h2>
        <p className="mt-1 text-sm text-white/60">Join a community to see it in your list.</p>
      </div>
      <div className="space-y-2">
        {servers.map((s) => {
          const joined = joinedIds.has(s.id);
          return (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-white/6 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/14 text-sm font-medium">
                {s.monogram}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="truncate text-xs text-white/55">
                  {plural(s.member_count ?? 0, "member")}
                  {s.description ? ` · ${s.description}` : ""}
                </p>
              </div>
              {joined ? (
                <button onClick={() => onOpen(s)} className={quietButton}>
                  Open
                </button>
              ) : (
                <button onClick={() => (currentUser ? onJoin(s) : onSignIn())} className={primaryButton}>
                  Join
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Confirm({ action, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{action.title}</h2>
      <p className="text-sm text-white/70">{action.body}</p>
      <div className="flex gap-3">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await action.run();
            onClose();
          }}
          className="rounded-full bg-bad px-5 py-2.5 text-sm font-medium text-zinc-900 transition active:scale-95 disabled:opacity-50"
        >
          {busy ? "Working…" : action.confirmLabel}
        </button>
        <button onClick={onClose} className={quietButton}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function SpatialModals({
  activeModal,
  onClose,
  currentUser,
  activeServer,
  activeGroup,
  editingPost,
  bgImage,
  setBgImage,
  viewedProfile,
  allServers,
  joinedIds,
  confirmAction,
  onAuthSuccess,
  onLogout,
  onPostSaved,
  onGroupCreated,
  onServerCreated,
  onProfileSaved,
  onJoinServer,
  onOpenServer,
  onRequireSignIn,
}) {
  // Keep the last modal rendered while the sheet animates out, and give every opening a fresh form state.
  const [shown, setShown] = useState(activeModal);
  const [previous, setPrevious] = useState(null);
  const [openCount, setOpenCount] = useState(0);
  if (activeModal !== previous) {
    setPrevious(activeModal);
    if (activeModal) {
      setShown(activeModal);
      setOpenCount((n) => n + 1);
    }
  }

  useEffect(() => {
    if (!activeModal) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeModal, onClose]);

  const open = Boolean(activeModal);
  const key = `${shown}-${openCount}`;

  return (
    <div
      data-open={open}
      aria-hidden={!open}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className={`modal-layer fixed inset-0 z-[60] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4 ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="modal-sheet glass relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-[2rem] sm:p-6"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>

        <div key={key} className="pr-10">
          {shown === "AUTH" && <AuthForm onAuthSuccess={onAuthSuccess} />}

          {shown === "EDIT_POST" && editingPost && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Edit your question</h2>
              <PostForm post={editingPost} onDone={onPostSaved} />
            </div>
          )}

          {shown === "CREATE_HUB" && (
            <CreateHub
              activeServer={activeServer}
              activeGroup={activeGroup}
              onPostDone={onPostSaved}
              onGroupDone={onGroupCreated}
              onServerDone={onServerCreated}
            />
          )}

          {shown === "SETTINGS" && (
            <SettingsPanel
              bgImage={bgImage}
              setBgImage={setBgImage}
              currentUser={currentUser}
              onProfileSaved={onProfileSaved}
              onLogout={onLogout}
            />
          )}

          {shown === "USER_PROFILE" && viewedProfile && <ProfileView profile={viewedProfile} />}

          {shown === "DISCOVER" && (
            <Discover
              servers={allServers}
              joinedIds={joinedIds}
              currentUser={currentUser}
              onJoin={onJoinServer}
              onOpen={onOpenServer}
              onSignIn={onRequireSignIn}
            />
          )}

          {shown === "CONFIRM" && confirmAction && <Confirm action={confirmAction} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}
