"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { apiRequest, getToken, TOKEN_KEY } from "../lib/api";
import { useMediaQuery } from "../lib/hooks";
import TopBar from "../components/TopBar";
import PrimaryDock from "../components/PrimaryDock";
import { ServerRail, ServerStrip } from "../components/ServerRail";
import GroupRail from "../components/GroupRail";
import GroupsPanel from "../components/GroupsPanel";
import ChatPanel from "../components/ChatPanel";
import BottomDock from "../components/BottomDock";
import NotificationsPopover from "../components/NotificationsPopover";
import SpatialModals from "../components/SpatialModals";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const DEFAULT_BG =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80";

export default function SpatialWorkspacePage() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // ----- who is here, and what the room looks like
  const [currentUser, setCurrentUser] = useState(null);
  const [bgImage, setBgImage] = useState(DEFAULT_BG);

  // ----- layout state machine
  const [view, setView] = useState("server"); // "home" (all servers) | "server"
  const [stage, setStage] = useState("groups"); // which panel owns the centre: "groups" | "chat"
  const [tab, setTab] = useState("chat"); // inside the chat panel: "chat" | "qa"
  const [isServersOpen, setIsServersOpen] = useState(false);

  // ----- servers and groups
  const [allServers, setAllServers] = useState([]);
  const [joinedServers, setJoinedServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);

  // ----- questions
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsVersion, setPostsVersion] = useState(0);
  const [feedSort, setFeedSort] = useState("newest");
  const [selectedTag, setSelectedTag] = useState("");
  const [activePost, setActivePost] = useState(null);
  const [comments, setComments] = useState([]);
  const [answerInput, setAnswerInput] = useState("");
  const [editingPost, setEditingPost] = useState(null);

  // ----- live chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [chatError, setChatError] = useState("");

  // ----- search, notifications, overlays
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState("");

  const socketRef = useRef(null);
  const activeGroupRef = useRef(null);
  const groupRequest = useRef(0);
  const searchInputRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }, []);

  const closeModal = useCallback(() => setActiveModal(null), []);
  const refreshPosts = () => setPostsVersion((v) => v + 1);

  // ---------------------------------------------------------------- data loading

  const loadServers = async () => {
    const res = await apiRequest("/api/servers");
    setAllServers(res.allServers || []);
    setJoinedServers(res.joinedServers || []);
    return res;
  };

  const loadNotifications = async () => {
    try {
      const res = await apiRequest("/api/servers/notifications");
      setNotifications(res.notifications || []);
    } catch {
      /* notifications are a nice-to-have; stay quiet */
    }
  };

  const reloadGroups = async (server = activeServer) => {
    if (!server) return [];
    const res = await apiRequest(`/api/servers/${server.id}/groups`);
    setGroups(res.groups || []);
    return res.groups || [];
  };

  const clearGroup = () => {
    if (activeGroupRef.current) socketRef.current?.emit("leave_group", activeGroupRef.current.id);
    activeGroupRef.current = null;
    groupRequest.current += 1;
    setActiveGroup(null);
    setMessages([]);
    setActivePost(null);
    setComments([]);
  };

  // Opening a group: join its socket room, load its chat, reset anything that belonged to the last group.
  const openGroup = async (group, { focus = false, auto = false } = {}) => {
    const request = ++groupRequest.current;
    activeGroupRef.current = group;
    setActiveGroup(group);
    setSelectedTag("");
    setMessages([]);
    setActivePost(null);
    setComments([]);
    setChatError("");
    setTab("chat");
    socketRef.current?.emit("join_group", group.id);
    // Phones only show one panel, so choosing a group takes you to its chat.
    if (!auto && (focus || !isDesktop)) setStage("chat");

    try {
      const res = await apiRequest(`/api/servers/groups/${group.id}/chat`);
      if (request === groupRequest.current) setMessages(res.messages || []);
    } catch (err) {
      if (request === groupRequest.current) showToast(err.message);
    }
  };

  const openServer = async (server, { groupId } = {}) => {
    setView("server");
    setActiveServer(server);
    setStage("groups");
    try {
      const list = await reloadGroups(server);
      const target = list.find((g) => g.id === groupId) || list[0];
      if (target) await openGroup(target, { auto: true });
      else clearGroup();
    } catch (err) {
      showToast(err.message);
    }
  };

  const openHome = () => {
    clearGroup();
    setView("home");
    setActiveServer(null);
    setGroups([]);
    setSelectedTag("");
    setStage("groups");
    setSearchResults(null);
    setSearchQuery("");
  };

  const openPost = async (post, { focus = false } = {}) => {
    try {
      const res = await apiRequest(`/api/posts/${post.id}`);
      setActivePost(res.post);
      setComments(res.comments || []);
      setTab("qa");
      if (focus || !isDesktop) setStage("chat");
    } catch (err) {
      showToast(err.message);
    }
  };

  const reloadActivePost = async (id = activePost?.id) => {
    if (!id) return;
    try {
      const res = await apiRequest(`/api/posts/${id}`);
      setActivePost(res.post);
      setComments(res.comments || []);
    } catch {
      setActivePost(null);
      setComments([]);
    }
  };

  const openProfile = async (username) => {
    try {
      const res = await apiRequest(`/api/auth/profile/${username}`);
      setViewedProfile(res.profile);
      setActiveModal("USER_PROFILE");
    } catch (err) {
      showToast(err.message);
    }
  };

  // ---------------------------------------------------------------- effects

  // First load: wallpaper, session, servers.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("spatial_bg");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after hydration
      if (saved) setBgImage(saved);
    } catch {
      /* storage can be blocked */
    }

    (async () => {
      if (getToken()) {
        try {
          const me = await apiRequest("/api/auth/me");
          setCurrentUser(me.user);
          loadNotifications();
        } catch {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
      try {
        const res = await loadServers();
        const first = res.joinedServers?.[0] || res.allServers?.[0];
        if (first) await openServer(first);
      } catch (err) {
        showToast("Can’t reach the server right now. It may be waking up, so try again in a moment.");
        console.error(err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One socket for the page. It reconnects with the right token whenever the signed-in user changes.
  useEffect(() => {
    const socket = io(SOCKET_URL, { autoConnect: false, withCredentials: true });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (activeGroupRef.current) socket.emit("join_group", activeGroupRef.current.id);
    });
    socket.on("new_group_message", (msg) => {
      if (msg.groupId !== activeGroupRef.current?.id) return;
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
    });
    socket.on("notification", (n) => setNotifications((prev) => [n, ...prev]));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const userId = currentUser?.id;
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.auth = { token: getToken() };
    if (socket.connected) socket.disconnect();
    socket.connect();
  }, [userId]);

  // The questions list follows the group, sort order and tag filter.
  useEffect(() => {
    if (view === "server" && !activeGroup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no group means no list
      setPosts([]);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ sort: feedSort });
    if (view === "server") params.set("groupId", activeGroup.id);
    if (selectedTag) params.set("tag", selectedTag);

    setPostsLoading(true);
    apiRequest(`/api/posts?${params}`)
      .then((res) => !cancelled && setPosts(res.posts || []))
      .catch((err) => !cancelled && showToast(err.message))
      .finally(() => !cancelled && setPostsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [view, activeGroup, feedSort, selectedTag, postsVersion, showToast]);

  // Debounced search.
  useEffect(() => {
    if (!searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- empty query clears results
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchResults(await apiRequest(`/api/servers/search?q=${encodeURIComponent(searchQuery.trim())}`));
      } catch (err) {
        showToast(err.message);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, showToast]);

  // Press "/" anywhere to search.
  useEffect(() => {
    const onKey = (e) => {
      const typing = /input|textarea|select/i.test(e.target?.tagName || "") || e.target?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------------------------------------------------------------- actions

  const requireSignIn = () => setActiveModal("AUTH");

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const sendChat = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !activeGroup) return;
    setChatError("");
    socketRef.current?.emit(
      "send_group_message",
      { groupId: activeGroup.id, content: text, codeSnippet: showCode ? codeInput : "" },
      (res) => {
        if (!res?.ok) {
          setChatError(res?.message || "Could not send that message.");
          setChatInput(text);
        }
      },
    );
    setChatInput("");
    setCodeInput("");
    setShowCode(false);
  };

  const submitAnswer = async (e) => {
    e.preventDefault();
    if (!activePost || answerInput.trim().length < 2) return;
    try {
      await apiRequest(`/api/posts/${activePost.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body_markdown: answerInput }),
      });
      setAnswerInput("");
      await reloadActivePost();
      refreshPosts();
    } catch (err) {
      showToast(err.message);
    }
  };

  const vote = async (target_type, target_id, vote_value) => {
    if (!currentUser) return requireSignIn();
    try {
      await apiRequest("/api/posts/vote", {
        method: "POST",
        body: JSON.stringify({ target_type, target_id, vote_value }),
      });
      refreshPosts();
      await reloadActivePost();
    } catch (err) {
      showToast(err.message);
    }
  };

  const acceptAnswer = async (commentId) => {
    try {
      await apiRequest(`/api/posts/${activePost.id}/accept/${commentId}`, { method: "PATCH" });
      await reloadActivePost();
      refreshPosts();
    } catch (err) {
      showToast(err.message);
    }
  };

  const askToDeletePost = (post) => {
    setConfirmAction({
      title: "Delete this question?",
      body: "The question and all of its answers will be removed for everyone. This can’t be undone.",
      confirmLabel: "Delete",
      run: async () => {
        try {
          await apiRequest(`/api/posts/${post.id}`, { method: "DELETE" });
          if (activePost?.id === post.id) {
            setActivePost(null);
            setComments([]);
          }
          refreshPosts();
          reloadGroups().catch(() => {});
        } catch (err) {
          showToast(err.message);
        }
      },
    });
    setActiveModal("CONFIRM");
  };

  const editPost = (post) => {
    setEditingPost(post);
    setActiveModal("EDIT_POST");
  };

  const joinServer = async (server) => {
    if (!currentUser) return requireSignIn();
    try {
      await apiRequest(`/api/servers/${server.id}/join`, { method: "POST" });
      await loadServers();
      setIsServersOpen(true);
      showToast(`You joined ${server.name}.`);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleAuthSuccess = async (user, token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* without storage the cookie still keeps the session */
    }
    setCurrentUser(user);
    setActiveModal(null);
    showToast(`Signed in as @${user.username}.`);
    await Promise.all([loadServers(), loadNotifications()]);
  };

  const handleLogout = async () => {
    await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => {});
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    setCurrentUser(null);
    setNotifications([]);
    setActiveModal(null);
    loadServers().catch(() => {});
  };

  const toggleNotifications = () => {
    if (notificationsOpen) return closeNotifications();
    if (!currentUser) return requireSignIn();
    setNotificationsOpen(true);
  };

  const closeNotifications = () => {
    setNotificationsOpen(false);
    if (notifications.some((n) => !n.isRead)) {
      apiRequest("/api/servers/notifications/read", { method: "POST" }).catch(() => {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const openCreate = () => setActiveModal(currentUser ? "CREATE_HUB" : "AUTH");

  const focusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  // ---------------------------------------------------------------- derived

  const joinedIds = new Set(joinedServers.map((s) => s.id));
  const isMember = Boolean(activeServer && joinedIds.has(activeServer.id));
  const railServers = currentUser
    ? activeServer && !isMember
      ? [...joinedServers, activeServer]
      : joinedServers
    : allServers;
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-zinc-950 bg-cover bg-center"
      style={{ backgroundImage: `url(${JSON.stringify(bgImage)})` }}
    >
      <div className="pointer-events-none absolute inset-0 bg-black/30" aria-hidden="true" />

      <div className="relative z-10 flex h-full flex-col">
        <TopBar
          inputRef={searchInputRef}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          results={searchResults}
          onClearSearch={clearSearch}
          stage={stage}
          onToggleStage={() => setStage((s) => (s === "groups" ? "chat" : "groups"))}
          onHome={openHome}
          onPickServer={(s) => {
            clearSearch();
            openServer(s);
          }}
          onPickGroup={(g) => {
            clearSearch();
            const server = allServers.find((s) => s.id === g.server_id);
            if (server) openServer(server, { groupId: g.id }).then(() => !isDesktop && setStage("chat"));
          }}
          onPickPerson={(u) => {
            clearSearch();
            openProfile(u.username);
          }}
          onPickPost={(p) => {
            clearSearch();
            openPost(p, { focus: true });
          }}
        />

        <ServerStrip
          open={isServersOpen}
          servers={railServers}
          activeServerId={activeServer?.id}
          onSelect={openServer}
          onDiscover={() => setActiveModal("DISCOVER")}
        />

        <main className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 lg:flex-row lg:items-center lg:gap-3 lg:px-6 lg:pb-24 lg:pt-4">
          <PrimaryDock
            view={view}
            isServersOpen={isServersOpen}
            onToggleServers={() => setIsServersOpen((v) => !v)}
            hasUnread={hasUnread}
            notificationsOpen={notificationsOpen}
            onHome={openHome}
            onSearch={focusSearch}
            onBell={toggleNotifications}
            onCreate={openCreate}
            onSettings={() => setActiveModal("SETTINGS")}
            currentUser={currentUser}
            onProfile={() => openProfile(currentUser.username)}
            onLogin={requireSignIn}
          />

          <ServerRail
            open={isServersOpen}
            servers={railServers}
            activeServerId={activeServer?.id}
            onSelect={openServer}
            onDiscover={() => setActiveModal("DISCOVER")}
          />

          <GroupRail
            open={stage === "chat"}
            groups={groups}
            activeGroupId={activeGroup?.id}
            onSelect={(g) => openGroup(g, { focus: true })}
            onRestore={() => setStage("groups")}
          />

          <div className="workspace min-h-0 min-w-0 flex-1 lg:h-full lg:max-h-[46rem]" data-stage={stage}>
            <div className="groups-slot" inert={stage === "chat"}>
              <GroupsPanel
                view={view}
                activeServer={activeServer}
                isMember={isMember}
                canJoin={Boolean(activeServer) && !isMember}
                onJoin={() => joinServer(activeServer)}
                servers={allServers}
                groups={groups}
                activeGroup={activeGroup}
                onSelectGroup={(g) => openGroup(g)}
                onSelectServer={openServer}
                posts={posts}
                loading={postsLoading}
                feedSort={feedSort}
                onSortChange={setFeedSort}
                selectedTag={selectedTag}
                onClearTag={() => setSelectedTag("")}
                onTag={setSelectedTag}
                activePostId={activePost?.id}
                onOpenPost={openPost}
                currentUser={currentUser}
                onCompose={openCreate}
                onEditPost={editPost}
                onDeletePost={askToDeletePost}
                onVote={vote}
                onProfile={openProfile}
              />
            </div>

            <div className="chat-slot" inert={!isDesktop && stage === "groups"}>
              <ChatPanel
                stage={stage}
                onFocus={() => setStage("chat")}
                onBack={() => setStage("groups")}
                activeGroup={activeGroup}
                activeServer={activeServer}
                tab={tab}
                onTabChange={setTab}
                messages={messages}
                chatInput={chatInput}
                onChatInput={setChatInput}
                codeInput={codeInput}
                onCodeInput={setCodeInput}
                showCode={showCode}
                onToggleCode={() => setShowCode((v) => !v)}
                chatError={chatError}
                onSendChat={sendChat}
                activePost={activePost}
                comments={comments}
                answerInput={answerInput}
                onAnswerInput={setAnswerInput}
                onSubmitAnswer={submitAnswer}
                onAccept={acceptAnswer}
                onVote={vote}
                onProfile={openProfile}
                currentUser={currentUser}
                onSignIn={requireSignIn}
              />
            </div>
          </div>
        </main>
      </div>

      <BottomDock
        view={view}
        stage={stage}
        isServersOpen={isServersOpen}
        hasUnread={hasUnread}
        notificationsOpen={notificationsOpen}
        onHome={openHome}
        onSearch={focusSearch}
        onToggleServers={() => setIsServersOpen((v) => !v)}
        onBell={toggleNotifications}
        onChat={() => setStage((s) => (s === "chat" ? "groups" : "chat"))}
        onCreate={openCreate}
        onSettings={() => setActiveModal("SETTINGS")}
      />

      <NotificationsPopover open={notificationsOpen} notifications={notifications} onClose={closeNotifications} />

      <SpatialModals
        activeModal={activeModal}
        onClose={closeModal}
        currentUser={currentUser}
        activeServer={activeServer}
        activeGroup={activeGroup}
        editingPost={editingPost}
        bgImage={bgImage}
        setBgImage={setBgImage}
        viewedProfile={viewedProfile}
        allServers={allServers}
        joinedIds={joinedIds}
        confirmAction={confirmAction}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onPostSaved={async () => {
          const editedId = editingPost?.id;
          setEditingPost(null);
          closeModal();
          refreshPosts();
          reloadGroups().catch(() => {});
          if (editedId && editedId === activePost?.id) reloadActivePost(editedId);
        }}
        onGroupCreated={async () => {
          closeModal();
          await reloadGroups();
          showToast("Group created.");
        }}
        onServerCreated={async (server) => {
          closeModal();
          await loadServers();
          setIsServersOpen(true);
          if (server) openServer(server);
          showToast("Server created.");
        }}
        onProfileSaved={(user) => {
          setCurrentUser(user);
          closeModal();
          showToast("Profile saved.");
        }}
        onJoinServer={joinServer}
        onOpenServer={(s) => {
          closeModal();
          openServer(s);
        }}
        onRequireSignIn={requireSignIn}
      />

      <div
        role="status"
        aria-live="polite"
        className={`glass pointer-events-none fixed left-1/2 top-[5.5rem] z-[70] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm transition duration-300 ease-spatial ${
          toast ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        {toast}
      </div>
    </div>
  );
}
