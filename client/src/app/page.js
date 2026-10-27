"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import {
  Home,
  Search,
  Bell,
  Mail,
  Bookmark,
  Settings,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  Code2,
  ListFilter,
  Smile,
  Calendar,
  MessageCircle,
  Repeat2,
  Heart,
  BarChart2,
  Share,
  CheckCircle2,
  Plus,
  Send,
  Hash,
  Users,
  ArrowLeft,
  Sparkles,
  Trash2,
  Edit3,
  LogOut,
  User as UserIcon,
  ChevronUp,
  ChevronDown,
  Check,
} from "lucide-react";
import { apiRequest, renderMarkdownElements } from "../lib/api";
import SpatialModals from "../components/SpatialModals";

const DEFAULT_BG =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85";

// Safe time formatter: never calls Date.now(), so it is OK during prerender.
function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// NOTE: fixed ISO timestamps (no Date.now()) so the build/prerender is deterministic.
const FALLBACK_POSTS = [
  {
    id: "demo-1",
    title: "VisionOS Spatial Rendering in Next.js App Router",
    content:
      "Vision Pro features an ultra-high-resolution display system across two displays. For web spatial UIs, combining `perspective(1350px) rotateY(-15deg)` with `backdrop-filter: blur(44px)` gives authentic depth without WebGL overhead.\n```js\nconst transform = 'perspective(1350px) rotateY(-15deg)';\n```",
    author_name: "Sufiyan Ahmad",
    author_username: "sufiyan",
    created_at: "2026-01-20T10:00:00.000Z",
    tags: ["visionos", "nextjs", "webgl"],
    upvotes: 42,
    comment_count: 2,
    media_urls: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
    ],
    comments: [
      {
        id: "c-101",
        author_name: "Aarav Mehta",
        author_username: "aarav_dev",
        content: "Using persistent flex containers with cubic-bezier(0.22, 1, 0.36, 1) completely fixes the layout jump on state change!",
        is_accepted: true,
        created_at: "2026-01-20T11:00:00.000Z",
      },
    ],
  },
  {
    id: "demo-2",
    title: "PostgreSQL + MongoDB Polyglot Persistence for PClub Community",
    content:
      "Using PostgreSQL for ACID-compliant user reputation, posts, and atomic vote transactions while offloading high-throughput room chat streams to MongoDB keeps latency under 12ms.",
    author_name: "PClub Software Div",
    author_username: "pclub_iiti",
    created_at: "2026-01-20T06:00:00.000Z",
    tags: ["postgres", "mongodb", "system-design"],
    upvotes: 89,
    comment_count: 1,
    media_urls: [],
    comments: [],
  },
];

const FALLBACK_SERVERS = [
  {
    id: "srv-1",
    name: "PClub IIT Indore",
    description: "Official Software Division Community",
    groups: [
      { id: "grp-1", name: "general-dev", lastMsg: "Deployed the polyglot backend API 🚀", time: "11m", verified: true },
      { id: "grp-2", name: "cp-algorithms", lastMsg: "Anyone upsolving Div. 2 D with segment trees?", time: "1h", verified: true },
      { id: "grp-3", name: "fullstack-nextjs", lastMsg: "Check the new spatial glass transitions", time: "3h", verified: true },
      { id: "grp-4", name: "dbms-internals", lastMsg: "Indexed CTE queries are running 4x faster", time: "1d", verified: false },
    ],
  },
  {
    id: "srv-2",
    name: "Open Source Guild",
    description: "GSOC & Linux Kernel Contributors",
    groups: [
      { id: "grp-5", name: "pr-reviews", lastMsg: "Merged PR #42 into main branch", time: "2h", verified: true },
      { id: "grp-6", name: "rust-systems", lastMsg: "Zero-copy deserialization benchmarks", time: "5h", verified: false },
    ],
  },
];

const DIRECT_PEOPLE = [
  { id: "dm-1", name: "Aarav Sharma", handle: "@aarav_s", time: "11 Jan", preview: "Reviewed your PostgreSQL schema migration...", avatar: "https://i.pravatar.cc/150?img=11" },
  { id: "dm-2", name: "Riya Verma", handle: "@riyaverma", time: "15 Jan", preview: "The VisionOS blur tokens look super clean now!", avatar: "https://i.pravatar.cc/150?img=32" },
  { id: "dm-3", name: "Kabir Nair", handle: "@kabir_cp", time: "17 Jan", preview: "Let's test WebSocket room broadcasting.", avatar: "https://i.pravatar.cc/150?img=15" },
  { id: "dm-4", name: "Ananya Gupta", handle: "@ananya_ml", time: "21 Jan", preview: "Pushed the Docker Compose config for local dev.", avatar: "https://i.pravatar.cc/150?img=47" },
  { id: "dm-5", name: "Devansh Joshi", handle: "@devansh_j", time: "25 Jan", preview: "Can we mark accepted answers on Q&A threads?", avatar: "https://i.pravatar.cc/150?img=53" },
];

export default function SpatialCommunityApp() {
  // Core Auth & Environment State
  const [currentUser, setCurrentUser] = useState(null);
  const [bgImage, setBgImage] = useState(DEFAULT_BG);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Navigation & Spatial Mode
  // navTab: 'home' | 'search' | 'notifications' | 'messages' | 'bookmarks'
  const [navTab, setNavTab] = useState("home");
  // centerMode: 'feed' | 'chat' (when a group/DM is brought to center stage)
  const [centerMode, setCenterMode] = useState("feed");
  // feedFilter: 'foryou' | 'following'
  const [feedFilter, setFeedFilter] = useState("foryou");
  // rightPanelTab: 'groups' | 'people'
  const [rightPanelTab, setRightPanelTab] = useState("groups");
  // Mobile drawer state for right panel
  const [mobileWingOpen, setMobileWingOpen] = useState(false);

  // Community Data State
  const [posts, setPosts] = useState(FALLBACK_POSTS);
  const [servers, setServers] = useState(FALLBACK_SERVERS);
  const [activeServer, setActiveServer] = useState(FALLBACK_SERVERS[0]);
  const [activeGroup, setActiveGroup] = useState(FALLBACK_SERVERS[0].groups[0]);
  const [notifications, setNotifications] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Inline Post Composer State
  const [quickText, setQuickText] = useState("");
  const [quickTags, setQuickTags] = useState("");
  const [quickCodeMode, setQuickCodeMode] = useState(false);
  const [quickImageUrl, setQuickImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);

  // Post Comments / Accepted Answer Drawer
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");

  // Live Chat & Socket State (fixed timestamps: no Date.now() during render)
  const [messages, setMessages] = useState([
    {
      _id: "m-1",
      sender_name: "Aarav Sharma",
      content: "Welcome to the spatial developer channel! Click any group on the right wing to bring it center stage.",
      createdAt: "2026-01-20T10:00:00.000Z",
    },
    {
      _id: "m-2",
      sender_name: "Riya Verma",
      content: "Notice how the servers and channels smoothly morph into the left monogram bar when chatting.",
      createdAt: "2026-01-20T10:20:00.000Z",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  // Modals State
  const [activeModal, setActiveModal] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [viewedProfile, setViewedProfile] = useState(null);

  // Load saved preferences & initial backend data
  useEffect(() => {
    const savedBg = localStorage.getItem("spatial_bg");
    if (savedBg) setBgImage(savedBg);
    const savedBookmarks = localStorage.getItem("spatial_bookmarks");
    if (savedBookmarks) {
      try {
        setBookmarkedIds(JSON.parse(savedBookmarks));
      } catch {}
    }
    fetchInitialData();
  }, []);

  // Connect Socket.io
  useEffect(() => {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
    const socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 3,
    });
    socketRef.current = socket;

    socket.on("new_group_message", (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => socket.disconnect();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, centerMode]);

  async function fetchInitialData() {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const me = await apiRequest("/auth/me").catch(() => null);
        if (me?.user || me?.id) setCurrentUser(me.user || me);
      }

      const [postsRes, serversRes] = await Promise.all([
        apiRequest("/posts").catch(() => null),
        apiRequest("/servers").catch(() => null),
      ]);

      if (Array.isArray(postsRes) && postsRes.length > 0) {
        setPosts(postsRes);
      } else if (postsRes?.posts?.length > 0) {
        setPosts(postsRes.posts);
      }

      if (Array.isArray(serversRes) && serversRes.length > 0) {
        setServers(serversRes);
        setActiveServer(serversRes[0]);
        if (serversRes[0].groups?.length > 0) {
          setActiveGroup(serversRes[0].groups[0]);
        }
      }
    } catch {
      // Gracefully retain fallback spatial data when backend is offline
    }
  }

  // Open a Group or DM in Center Stage smoothly
  async function handleSelectGroup(group, serverObj = activeServer) {
    if (serverObj) setActiveServer(serverObj);
    setActiveGroup(group);
    setCenterMode("chat");
    setMobileWingOpen(false);

    if (socketRef.current && group?.id) {
      socketRef.current.emit("join_group", group.id);
    }

    try {
      const res = await apiRequest(`/servers/groups/${group.id}/chat`);
      if (Array.isArray(res)) setMessages(res);
      else if (Array.isArray(res?.messages)) setMessages(res.messages);
    } catch {
      // Keep existing or demo messages if endpoint is unreachable
    }
  }

  // Send Live Chat Message
  async function handleSendChat(e) {
    e.preventDefault();
    if (!chatInput.trim() || !activeGroup) return;

    const optimisticMsg = {
      _id: `local-${Date.now()}`,
      group_id: activeGroup.id,
      sender_id: currentUser?.id || "guest",
      sender_name: currentUser?.username || currentUser?.name || "You",
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setChatInput("");

    if (socketRef.current?.connected) {
      socketRef.current.emit("send_group_message", {
        groupId: activeGroup.id,
        senderId: currentUser?.id || "guest",
        senderName: currentUser?.username || "Developer",
        content: optimisticMsg.content,
      });
    }

    try {
      await apiRequest(`/servers/groups/${activeGroup.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ content: optimisticMsg.content }),
      });
    } catch {}
  }

  // Inline Quick Post Creation
  async function handleQuickPost(e) {
    e.preventDefault();
    if (!quickText.trim()) return;

    const firstLine = quickText.trim().split("\n")[0].slice(0, 72);
    const parsedTags = quickTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const newPost = {
      id: `post-${Date.now()}`,
      title: firstLine,
      content: quickCodeMode ? `${quickText}\n` : quickText,
      author_name: currentUser?.name || currentUser?.username || "Sufiyan Ahmad",
      author_username: currentUser?.username || "sufiyan",
      created_at: new Date().toISOString(),
      tags: parsedTags.length ? parsedTags : ["general"],
      upvotes: 1,
      comment_count: 0,
      media_urls: quickImageUrl.trim() ? [quickImageUrl.trim()] : [],
      comments: [],
    };

    setPosts((prev) => [newPost, ...prev]);
    setQuickText("");
    setQuickTags("");
    setQuickImageUrl("");
    setShowImageInput(false);

    try {
      await apiRequest("/posts", {
        method: "POST",
        body: JSON.stringify({
          title: newPost.title,
          content: newPost.content,
          tags: newPost.tags,
          media_urls: newPost.media_urls,
        }),
      });
      fetchInitialData();
    } catch {}
  }

  // Upvote / Downvote Post
  async function handleVote(postId, delta = 1) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, upvotes: (Number(p.upvotes) || 0) + delta } : p
      )
    );
    try {
      await apiRequest("/posts/vote", {
        method: "POST",
        body: JSON.stringify({ postId, voteType: delta > 0 ? "upvote" : "downvote" }),
      });
    } catch {}
  }

  // Add Comment / Answer to Post
  async function handleAddComment(postId) {
    if (!commentDraft.trim()) return;
    const newComment = {
      id: `c-${Date.now()}`,
      author_name: currentUser?.name || currentUser?.username || "Sufiyan Ahmad",
      author_username: currentUser?.username || "sufiyan",
      content: commentDraft.trim(),
      is_accepted: false,
      created_at: new Date().toISOString(),
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updatedComments = [...(p.comments || []), newComment];
        return {
          ...p,
          comments: updatedComments,
          comment_count: updatedComments.length,
        };
      })
    );
    setCommentDraft("");
  }

  // Mark Accepted Answer (Problem Statement 6 Requirement)
  function handleToggleAccepted(postId, commentId) {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: (p.comments || []).map((c) => ({
            ...c,
            is_accepted: c.id === commentId ? !c.is_accepted : false,
          })),
        };
      })
    );
  }

  // Toggle Bookmark
  function toggleBookmark(postId) {
    setBookmarkedIds((prev) => {
      const next = prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId];
      localStorage.setItem("spatial_bookmarks", JSON.stringify(next));
      return next;
    });
  }

  // Delete Post
  async function handleDeletePost(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await apiRequest(`/posts/${postId}`, { method: "DELETE" });
    } catch {}
  }

  // Filtered & Sorted Posts
  const visiblePosts = useMemo(() => {
    let list = [...posts];

    if (navTab === "bookmarks") {
      list = list.filter((p) => bookmarkedIds.includes(p.id));
    }
    if (selectedTag) {
      list = list.filter((p) =>
        (p.tags || []).some((t) => t.toLowerCase() === selectedTag.toLowerCase())
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.content?.toLowerCase().includes(q) ||
          p.author_name?.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    if (feedFilter === "following") {
      list.sort((a, b) => (Number(b.upvotes) || 0) - (Number(a.upvotes) || 0));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    }
    return list;
  }, [posts, navTab, bookmarkedIds, selectedTag, searchQuery, feedFilter]);

  const allTags = useMemo(() => {
    const set = new Set();
    posts.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [posts]);

  return (
    <div className="relative w-screen h-dvh overflow-hidden select-none flex flex-col items-center justify-between py-3 px-3 sm:px-6">
      {/* Immersive Room Background with Natural Vignette */}
      <div
        className="fixed inset-0 bg-cover bg-center transition-all duration-700 scale-105"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="fixed inset-0 bg-black/35 backdrop-blur-[2px] pointer-events-none" />

      {/* =========================================================
          1. TOP FLOATING VISIONOS SEARCH PILL (Matches spatialui.webp)
         ========================================================= */}
      <header className="relative z-30 w-full max-w-[660px] vision-pill rounded-full px-3.5 py-2 flex items-center justify-between gap-3">
        {/* Left Blue Circular App Badge */}
        <button
          onClick={() => {
            setCenterMode("feed");
            setNavTab("home");
            setSelectedTag(null);
          }}
          className="vision-btn w-9 h-9 rounded-full bg-[#1d9bf0] flex items-center justify-center text-white shadow-md shrink-0"
          title="Home Feed"
        >
          <Code2 className="w-5 h-5" />
        </button>

        {/* Centered Pill Search Input */}
        <div className="relative flex-1 max-w-[380px]">
          <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search on SpatialDev..."
            className="w-full bg-black/25 hover:bg-black/35 focus:bg-black/45 text-sm text-white placeholder:text-white/55 rounded-full pl-9 pr-4 py-1.5 border border-white/12 focus:border-white/30 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right Fullscreen / Auth Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {currentUser ? (
            <button
              onClick={() => {
                setViewedProfile(currentUser);
                setActiveModal("profile");
              }}
              className="vision-btn hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/18 px-3 py-1.5 rounded-full text-xs font-medium border border-white/10"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {currentUser.username || currentUser.name}
            </button>
          ) : (
            <button
              onClick={() => setActiveModal("auth")}
              className="vision-btn bg-white/14 hover:bg-white/22 text-white text-xs font-medium px-3.5 py-1.5 rounded-full border border-white/15"
            >
              Sign in
            </button>
          )}

          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="vision-btn w-9 h-9 rounded-full bg-white/12 hover:bg-white/20 flex items-center justify-center text-white/85 border border-white/10"
            title="Toggle Expanded Stage"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* =========================================================
          2. MAIN SPATIAL 3D WORKSPACE (Left Dock + Monogram + Center + Right 3D Wing)
         ========================================================= */}
      <main
        className={`relative z-20 w-full flex-1 min-h-0 flex items-center justify-center gap-4 lg:gap-6 my-2 spatial-stage ${
          isFullscreen ? "max-w-[1600px]" : "max-w-[1360px]"
        }`}
      >
        {/* 2A. LEFT FLOATING VERTICAL ICON PILL (Desktop - Matches spatialui.webp) */}
        <aside className="hidden md:flex flex-col items-center gap-2.5 vision-pill rounded-full py-3.5 px-2.5 shrink-0">
          {[
            { id: "home", icon: Home, label: "Home", action: () => { setNavTab("home"); setCenterMode("feed"); } },
            { id: "search", icon: Search, label: "Explore Tags", action: () => { setNavTab("search"); setCenterMode("feed"); } },
            { id: "notifications", icon: Bell, label: "Notifications", action: () => setNavTab("notifications") },
            { id: "messages", icon: Mail, label: "Spatial Channels", action: () => setCenterMode(centerMode === "chat" ? "feed" : "chat") },
            { id: "bookmarks", icon: Bookmark, label: "Saved Posts", action: () => { setNavTab("bookmarks"); setCenterMode("feed"); } },
            { id: "settings", icon: Settings, label: "Environment", action: () => setActiveModal("background") },
          ].map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.id === "messages" && centerMode === "chat") ||
              (item.id !== "messages" && navTab === item.id && centerMode === "feed");
            return (
              <button
                key={item.id}
                onClick={item.action}
                title={item.label}
                className={`vision-btn w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-white/24 text-white shadow-inner border border-white/25"
                    : "text-white/65 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-[19px] h-[19px]" />
              </button>
            );
          })}
        </aside>

        {/* 2B. SMOOTH MORPHING MONOGRAM SIDEBAR (Glides open when a Group/Chat is active) */}
        <div
          className={`hidden sm:flex flex-col items-center vision-window rounded-[28px] overflow-hidden shrink-0 transition-all duration-500 ${
            centerMode === "chat"
              ? "w-16 py-4 px-2 opacity-100 translate-x-0"
              : "w-0 py-0 px-0 opacity-0 -translate-x-4 pointer-events-none border-0"
          }`}
        >
          {/* Back to Feed Monogram Button */}
          <button
            onClick={() => setCenterMode("feed")}
            className="vision-btn w-11 h-11 rounded-2xl bg-[#1d9bf0] text-white flex items-center justify-center font-semibold text-xs mb-3 shadow-md"
            title="Return to Feed"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-white/15 mb-3" />

          {/* Server & Channel Monograms */}
          <div className="flex flex-col gap-2.5 overflow-y-auto items-center w-full">
            {servers.map((srv) => {
              const initials = srv.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const isCurrentServer = activeServer?.id === srv.id;
              return (
                <button
                  key={srv.id}
                  onClick={() => {
                    setActiveServer(srv);
                    if (srv.groups?.[0]) handleSelectGroup(srv.groups[0], srv);
                  }}
                  title={srv.name}
                  className={`vision-btn w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrentServer
                      ? "bg-white text-black shadow-lg scale-105"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {initials}
                </button>
              );
            })}

            <div className="w-6 h-[1px] bg-white/15 my-1" />

            {(activeServer?.groups || []).map((grp) => {
              const mono = grp.name.slice(0, 2).toUpperCase();
              const isSelected = activeGroup?.id === grp.id;
              return (
                <button
                  key={grp.id}
                  onClick={() => handleSelectGroup(grp, activeServer)}
                  title={`#${grp.name}`}
                  className={`vision-btn w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-semibold border transition-all ${
                    isSelected
                      ? "bg-[#1d9bf0]/30 border-[#1d9bf0] text-white"
                      : "bg-black/25 border-white/10 text-white/65 hover:text-white"
                  }`}
                >
                  {mono}
                </button>
              );
            })}

            <button
              onClick={() => setActiveModal("createGroup")}
              className="vision-btn w-10 h-10 rounded-full bg-white/8 hover:bg-white/16 flex items-center justify-center text-white/70 mt-1"
              title="Create Channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2C. CENTER MAIN VISIONOS WINDOW (Persistent Container — Smoothly Crossfades Feed <-> Chat) */}
        <section
          className={`vision-window spatial-center-stage rounded-[32px] h-full flex flex-col overflow-hidden flex-1 ${
            isFullscreen ? "max-w-[960px]" : "max-w-[680px]"
          }`}
        >
          {centerMode === "feed" ? (
            /* ==================== COMMUNITY FEED VIEW ==================== */
            <div className="flex flex-col h-full animate-fadeIn">
              {/* Header Bar — Matches spatialui.webp ("Home", "For you" blue pill + underline, "Following") */}
              <div className="px-6 pt-5 pb-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    {navTab === "bookmarks"
                      ? "Bookmarks"
                      : navTab === "notifications"
                      ? "Activity"
                      : "Home"}
                  </h1>
                  {selectedTag && (
                    <span className="inline-flex items-center gap-1.5 text-xs bg-[#1d9bf0]/25 text-[#68bfff] px-2.5 py-0.5 rounded-full border border-[#1d9bf0]/40">
                      #{selectedTag}
                      <button
                        onClick={() => setSelectedTag(null)}
                        className="hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>

                {/* "For you" and "Following" Pills */}
                <div className="flex items-center gap-3">
                  <div className="relative flex flex-col items-center">
                    <button
                      onClick={() => setFeedFilter("foryou")}
                      className={`vision-btn px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        feedFilter === "foryou"
                          ? "bg-[#1d9bf0] text-white shadow-sm"
                          : "bg-white/8 text-white/70 hover:bg-white/14"
                      }`}
                    >
                      For you
                    </button>
                    {feedFilter === "foryou" && (
                      <span className="w-10 h-[3px] bg-[#1d9bf0] rounded-full mt-1.5" />
                    )}
                  </div>

                  <div className="relative flex flex-col items-center">
                    <button
                      onClick={() => setFeedFilter("following")}
                      className={`vision-btn px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        feedFilter === "following"
                          ? "bg-[#1d9bf0] text-white shadow-sm"
                          : "bg-white/8 text-white/70 hover:bg-white/14 border border-white/10"
                      }`}
                    >
                      Top Voted
                    </button>
                    {feedFilter === "following" && (
                      <span className="w-10 h-[3px] bg-[#1d9bf0] rounded-full mt-1.5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Tag Filter Strip (Shown when Explore/Search tab is active or tags exist) */}
              {navTab === "search" && (
                <div className="px-6 py-2.5 bg-black/15 border-b border-white/[0.08] flex items-center gap-2 overflow-x-auto shrink-0">
                  <span className="text-xs text-white/50 shrink-0">Topics:</span>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setSelectedTag(selectedTag === tag ? null : tag)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                        selectedTag === tag
                          ? "bg-[#1d9bf0] text-white"
                          : "bg-white/8 text-white/75 hover:bg-white/15"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Scrollable Feed Content */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.08]">
                {/* Inline "What is happening?" Composer (Matches spatialui.webp) */}
                <form
                  onSubmit={handleQuickPost}
                  className="px-6 py-4 space-y-3 bg-white/[0.01]"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                        currentUser?.username || "sufiyan"
                      }`}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full bg-white/15 border border-white/20 shrink-0"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={quickText}
                        onChange={(e) => setQuickText(e.target.value)}
                        placeholder="What is happening in your codebase?"
                        className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.11] text-sm text-white placeholder:text-white/60 rounded-full px-5 py-2.5 border border-white/14 focus:border-white/30 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Optional Media / Tag / Code Drawer */}
                  {(showImageInput || quickCodeMode) && (
                    <div className="pl-13 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <input
                        type="text"
                        value={quickTags}
                        onChange={(e) => setQuickTags(e.target.value)}
                        placeholder="Tags (e.g. nextjs, postgres, cpp)"
                        className="bg-black/25 text-xs text-white rounded-xl px-3 py-2 border border-white/12 outline-none"
                      />
                      <input
                        type="url"
                        value={quickImageUrl}
                        onChange={(e) => setQuickImageUrl(e.target.value)}
                        placeholder="Optional image URL (https://...)"
                        className="bg-black/25 text-xs text-white rounded-xl px-3 py-2 border border-white/12 outline-none"
                      />
                    </div>
                  )}

                  {/* Composer Action Icons Row (Matches spatialui.webp) */}
                  <div className="flex items-center justify-between pl-13">
                    <div className="flex items-center gap-4 text-white/65">
                      <button
                        type="button"
                        onClick={() => setShowImageInput((v) => !v)}
                        className="hover:text-white transition-colors"
                        title="Attach Image or Tags"
                      >
                        <ImageIcon className="w-[18px] h-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickCodeMode((v) => !v)}
                        className={`transition-colors ${
                          quickCodeMode ? "text-[#1d9bf0]" : "hover:text-white"
                        }`}
                        title="Format as Code Block"
                      >
                        <Code2 className="w-[18px] h-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveModal("createPost")}
                        className="hover:text-white transition-colors"
                        title="Open Full Markdown Editor"
                      >
                        <ListFilter className="w-[18px] h-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickText((t) => `${t} 🚀`)}
                        className="hover:text-white transition-colors"
                        title="Add Reaction"
                      >
                        <Smile className="w-[18px] h-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setNavTab("search")}
                        className="hover:text-white transition-colors"
                        title="Filter Topics"
                      >
                        <Calendar className="w-[18px] h-[18px]" />
                      </button>
                    </div>

                    {quickText.trim() && (
                      <button
                        type="submit"
                        className="vision-btn bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow"
                      >
                        Post
                      </button>
                    )}
                  </div>
                </form>

                {/* Feed Posts List */}
                {visiblePosts.map((post) => {
                  const isBookmarked = bookmarkedIds.includes(post.id);
                  const isExpanded = expandedPostId === post.id;
                  const hasAccepted = (post.comments || []).some(
                    (c) => c.is_accepted
                  );

                  return (
                    <article
                      key={post.id}
                      className="px-6 py-4 hover:bg-white/[0.03] transition-colors space-y-2.5"
                    >
                      {/* Post Author Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                              post.author_username || post.author_name || "user"
                            }`}
                            alt={post.author_name}
                            className="w-8 h-8 rounded-full bg-white/10 border border-white/15"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm text-white">
                              {post.author_name || "Developer"}
                            </span>
                            <CheckCircle2 className="w-4 h-4 text-[#1d9bf0] fill-[#1d9bf0]/20" />
                            <span className="text-xs text-white/50">
                              @{post.author_username || "dev"} ·{" "}
                              <time suppressHydrationWarning>
                                {formatTime(post.created_at)}
                              </time>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasAccepted && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                              <Check className="w-3 h-3" /> Solved
                            </span>
                          )}
                          {currentUser &&
                            (currentUser.username === post.author_username ||
                              currentUser.id === post.user_id) && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingPost(post);
                                    setActiveModal("editPost");
                                  }}
                                  className="p-1 text-white/45 hover:text-white"
                                  title="Edit Post"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-1 text-white/45 hover:text-rose-400"
                                  title="Delete Post"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Post Body & Markdown */}
                      <div className="pl-10 space-y-2">
                        {post.title &&
                          !post.content?.startsWith(post.title) && (
                            <h2 className="text-[15px] font-semibold text-white">
                              {post.title}
                            </h2>
                          )}
                        <div className="text-[13.5px] leading-relaxed text-white/88 space-y-1.5">
                          {renderMarkdownElements
                            ? renderMarkdownElements(post.content || "")
                            : post.content}
                        </div>

                        {/* Tags */}
                        {post.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {post.tags.map((tag) => (
                              <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className="text-xs text-[#58b9ff] hover:underline"
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Two-Column Media Grid (Matches spatialui.webp) */}
                        {post.media_urls?.length > 0 && (
                          <div
                            className={`grid gap-2.5 pt-2 ${
                              post.media_urls.length > 1
                                ? "grid-cols-2"
                                : "grid-cols-1"
                            }`}
                          >
                            {post.media_urls.map((url, idx) => (
                              <div
                                key={idx}
                                className="rounded-2xl overflow-hidden border border-white/15 bg-black/30 aspect-video"
                              >
                                <img
                                  src={url}
                                  alt="Post attachment"
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bottom Metrics Row (Matches spatialui.webp) */}
                        <div className="flex items-center justify-between pt-2 text-xs text-white/55">
                          <div className="flex items-center gap-6">
                            <button
                              onClick={() =>
                                setExpandedPostId(isExpanded ? null : post.id)
                              }
                              className="flex items-center gap-1.5 hover:text-white transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>
                                {(post.comments || []).length ||
                                  post.comment_count ||
                                  0}
                              </span>
                            </button>

                            <button
                              onClick={() => handleVote(post.id, 1)}
                              className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
                              title="Upvote"
                            >
                              <ChevronUp className="w-4 h-4" />
                              <span>{post.upvotes || 0}</span>
                            </button>

                            <button
                              onClick={() => handleVote(post.id, -1)}
                              className="flex items-center gap-1 hover:text-rose-400 transition-colors"
                              title="Downvote"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>

                            <span className="hidden sm:flex items-center gap-1.5">
                              <BarChart2 className="w-4 h-4" />
                              <span>
                                {((Number(post.upvotes) || 12) * 34).toLocaleString()}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleBookmark(post.id)}
                              className={`hover:text-white transition-colors ${
                                isBookmarked ? "text-[#1d9bf0]" : ""
                              }`}
                              title="Bookmark"
                            >
                              <Bookmark className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                navigator.clipboard?.writeText(
                                  window.location.href
                                )
                              }
                              className="hover:text-white transition-colors"
                              title="Share Link"
                            >
                              <Share className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Answers / Comments Drawer */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                            {(post.comments || []).map((c) => (
                              <div
                                key={c.id}
                                className={`p-3 rounded-2xl border text-xs space-y-1 ${
                                  c.is_accepted
                                    ? "bg-emerald-500/12 border-emerald-500/40"
                                    : "bg-black/25 border-white/10"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-white">
                                    {c.author_name}{" "}
                                    <span className="text-white/45 font-normal">
                                      @{c.author_username}
                                    </span>
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleToggleAccepted(post.id, c.id)
                                    }
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                                      c.is_accepted
                                        ? "bg-emerald-500 text-black font-semibold"
                                        : "bg-white/10 text-white/60 hover:text-white"
                                    }`}
                                  >
                                    {c.is_accepted
                                      ? "✓ Accepted Answer"
                                      : "Mark Accepted"}
                                  </button>
                                </div>
                                <p className="text-white/85 leading-relaxed">
                                  {c.content}
                                </p>
                              </div>
                            ))}

                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                value={commentDraft}
                                onChange={(e) =>
                                  setCommentDraft(e.target.value)
                                }
                                placeholder="Write an answer or comment..."
                                className="flex-1 bg-black/30 text-xs text-white rounded-full px-4 py-2 border border-white/15 outline-none focus:border-white/35"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddComment(post.id)}
                                className="vision-btn bg-[#1d9bf0] text-white text-xs font-semibold px-4 py-2 rounded-full"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ==================== SPATIAL LIVE ROOM CHAT VIEW ==================== */
            <div className="flex flex-col h-full animate-fadeIn">
              {/* Chat Room Header */}
              <div className="px-6 py-4 border-b border-white/[0.09] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCenterMode("feed")}
                    className="vision-btn w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                    title="Back to Community Feed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-[#1d9bf0]" />
                      <h2 className="font-bold text-base text-white">
                        {activeGroup?.name || "general-dev"}
                      </h2>
                      <span className="text-[11px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                        {activeServer?.name}
                      </span>
                    </div>
                    <p className="text-xs text-white/55">
                      Real-time spatial WebSocket stream · Click left monograms to switch rooms
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModal("createGroup")}
                  className="vision-btn bg-white/10 hover:bg-white/18 text-xs font-medium px-3 py-1.5 rounded-full border border-white/12 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New Room
                </button>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {messages.map((msg, i) => {
                  const isMe =
                    msg.sender_name ===
                      (currentUser?.username || currentUser?.name || "You") ||
                    msg.sender_id === "guest";
                  return (
                    <div
                      key={msg._id || i}
                      className={`flex items-start gap-3 ${
                        isMe ? "flex-row-reverse" : ""
                      }`}
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                          msg.sender_name || "dev"
                        }`}
                        alt={msg.sender_name}
                        className="w-8 h-8 rounded-full bg-white/10 border border-white/15 shrink-0"
                      />
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMe
                            ? "bg-[#1d9bf0] text-white"
                            : "bg-white/10 text-white/90 border border-white/12"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold opacity-90">
                            {msg.sender_name || "Developer"}
                          </span>
                          <span className="text-[10px] opacity-60">
                            <time suppressHydrationWarning>
                              {formatTime(msg.createdAt)}
                            </time>
                          </span>
                        </div>
                        <p className="leading-relaxed break-words">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input Bar */}
              <form
                onSubmit={handleSendChat}
                className="px-6 py-3.5 border-t border-white/[0.09] flex items-center gap-3 bg-black/15"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Message #${activeGroup?.name || "channel"}...`}
                  className="flex-1 bg-white/8 focus:bg-white/12 text-sm text-white placeholder:text-white/50 rounded-full px-5 py-2.5 border border-white/14 outline-none"
                />
                <button
                  type="submit"
                  className="vision-btn w-10 h-10 rounded-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white flex items-center justify-center shrink-0 shadow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </section>

        {/* 2D. RIGHT 3D TILTED MESSAGES / GROUPS PANEL (Matches spatialui.webp) */}
        <aside
          className={`vision-window spatial-right-wing rounded-[32px] h-full w-[330px] xl:w-[360px] flex-col overflow-hidden shrink-0 ${
            mobileWingOpen
              ? "fixed inset-x-4 top-16 bottom-20 z-50 flex w-auto"
              : "hidden lg:flex"
          }`}
        >
          {/* Header Row ("Messages" + Top-Right Circular Icons matching spatialui.webp) */}
          <div className="px-5 pt-5 pb-3 border-b border-white/[0.08] flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-white">
              {rightPanelTab === "groups" ? "Messages" : "People"}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setRightPanelTab(
                    rightPanelTab === "groups" ? "people" : "groups"
                  )
                }
                className="vision-btn w-8 h-8 rounded-full bg-white/12 hover:bg-white/20 flex items-center justify-center text-white/85 border border-white/12"
                title="Switch between Group Channels and People"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCenterMode(centerMode === "chat" ? "feed" : "chat")
                }
                className="vision-btn w-8 h-8 rounded-full bg-white/12 hover:bg-white/20 flex items-center justify-center text-white/85 border border-white/12"
                title="Expand Chat into Center Window"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subtle Mode Switcher Pills (Groups vs Direct People) */}
          <div className="px-5 py-2.5 flex items-center justify-between gap-2 border-b border-white/[0.06]">
            <div className="flex gap-1.5">
              <button
                onClick={() => setRightPanelTab("groups")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  rightPanelTab === "groups"
                    ? "bg-white/20 text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                Groups ({activeServer?.groups?.length || 0})
              </button>
              <button
                onClick={() => setRightPanelTab("people")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  rightPanelTab === "people"
                    ? "bg-white/20 text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                People ({DIRECT_PEOPLE.length})
              </button>
            </div>

            <button
              onClick={() => setActiveModal("createServer")}
              className="text-xs text-[#58b9ff] hover:underline flex items-center gap-0.5"
            >
              <Plus className="w-3.5 h-3.5" /> Server
            </button>
          </div>

          {/* Scrollable List matching spatialui.webp */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.07]">
            {rightPanelTab === "groups"
              ? servers.flatMap((srv) =>
                  (srv.groups || []).map((grp) => {
                    const isSelected =
                      centerMode === "chat" && activeGroup?.id === grp.id;
                    return (
                      <button
                        key={grp.id}
                        onClick={() => handleSelectGroup(grp, srv)}
                        className={`w-full px-5 py-3.5 flex items-center gap-3.5 text-left transition-all ${
                          isSelected
                            ? "bg-white/14"
                            : "hover:bg-white/[0.06]"
                        }`}
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/shapes/svg?seed=${grp.name}`}
                          alt={grp.name}
                          className="w-11 h-11 rounded-full bg-white/10 border border-white/15 shrink-0 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-white truncate">
                              {grp.name}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-white/80 fill-white/20 shrink-0" />
                            <span className="text-xs text-white/45 truncate">
                              @{srv.name.toLowerCase().replace(/\s+/g, "")} ·{" "}
                              {grp.time || "now"}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 truncate mt-0.5">
                            {grp.lastMsg ||
                              "Click to open live group room in center stage..."}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )
              : DIRECT_PEOPLE.map((person) => (
                  <button
                    key={person.id}
                    onClick={() =>
                      handleSelectGroup(
                        { id: person.id, name: person.name },
                        { id: "dm", name: "Direct Message", groups: [] }
                      )
                    }
                    className="w-full px-5 py-3.5 flex items-center gap-3.5 text-left hover:bg-white/[0.06] transition-all"
                  >
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="w-11 h-11 rounded-full bg-white/10 border border-white/15 shrink-0 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-white truncate">
                          {person.name}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white/85 fill-white/20 shrink-0" />
                        <span className="text-xs text-white/45 truncate">
                          {person.handle} · {person.time}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 truncate mt-0.5">
                        {person.preview}
                      </p>
                    </div>
                  </button>
                ))}
          </div>
        </aside>
      </main>

      {/* =========================================================
          3. BOTTOM FLOATING VISIONOS ORNAMENT DOCK (Matches spatialui.webp)
         ========================================================= */}
      <footer className="relative z-30 vision-dock-bottom rounded-full px-7 py-2.5 flex items-center gap-7 sm:gap-10">
        {[
          {
            id: "home",
            icon: Home,
            label: "Home",
            onClick: () => {
              setNavTab("home");
              setCenterMode("feed");
              setMobileWingOpen(false);
            },
          },
          {
            id: "search",
            icon: Search,
            label: "Explore",
            onClick: () => {
              setNavTab("search");
              setCenterMode("feed");
              setMobileWingOpen(false);
            },
          },
          {
            id: "notifications",
            icon: Bell,
            label: "Activity",
            onClick: () => {
              setCenterMode("feed");
              setActiveModal("createPost");
            },
          },
          {
            id: "messages",
            icon: Mail,
            label: "Messages & Groups",
            onClick: () => {
              if (window.innerWidth < 1024) {
                setMobileWingOpen((v) => !v);
              } else {
                setCenterMode((m) => (m === "chat" ? "feed" : "chat"));
              }
            },
          },
          {
            id: "bookmarks",
            icon: Bookmark,
            label: "Bookmarks",
            onClick: () => {
              setNavTab("bookmarks");
              setCenterMode("feed");
              setMobileWingOpen(false);
            },
          },
          {
            id: "settings",
            icon: Settings,
            label: "Spatial Environment",
            onClick: () => setActiveModal("background"),
          },
        ].map((item) => {
          const Icon = item.icon;
          const active =
            (item.id === "messages" && (centerMode === "chat" || mobileWingOpen)) ||
            (item.id !== "messages" && navTab === item.id && centerMode === "feed");
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              title={item.label}
              className={`vision-btn p-1.5 rounded-full transition-all ${
                active
                  ? "text-white scale-110"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </footer>

      {/* Spatial Glass Modals */}
      <SpatialModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        activeServer={activeServer}
        activeGroup={activeGroup}
        editingPost={editingPost}
        viewedProfile={viewedProfile}
        bgImage={bgImage}
        setBgImage={(url) => {
          setBgImage(url);
          localStorage.setItem("spatial_bg", url);
        }}
        onRefreshData={fetchInitialData}
      />
    </div>
  );
}