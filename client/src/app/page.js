'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Search,
  Bell,
  Plus,
  Settings,
  ChevronRight,
  Maximize2,
  Minimize2,
  Send,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Hash,
  MessageSquare,
  Code2,
  Sparkles,
  LogIn,
  LogOut,
  Trash2,
  Edit3,
  Users,
  Bookmark,
  Layers,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { apiRequest, renderMarkdownElements } from '../lib/api';
import SpatialModals from '../components/SpatialModals';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SpatialWorkspacePage() {
  // 1. User & Environment State
  const [currentUser, setCurrentUser] = useState(null);
  const [bgImage, setBgImage] = useState(
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80'
  );

  // 2. Spatial Navigation Choreography State (Your Exact Discord + VisionOS Spec)
  const [isServersExpanded, setIsServersExpanded] = useState(true); // Controls ▸ vs ▾ arrow & Server Monogram Bar
  const [focusedStage, setFocusedStage] = useState('GROUPS_IN_CENTER'); // 'GROUPS_IN_CENTER' | 'CHAT_IN_CENTER'
  const [rightPanelTab, setRightPanelTab] = useState('LIVE_CHAT'); // 'LIVE_CHAT' | 'QA_THREAD'

  // 3. Data State (Servers, Groups, Posts, Comments, Live Chat, Notifications)
  const [allServers, setAllServers] = useState([]);
  const [joinedServers, setJoinedServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [serverGroups, setServerGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);

  // Posts & Feed Filtering (PS 06 Core Requirements)
  const [posts, setPosts] = useState([]);
  const [feedSort, setFeedSort] = useState('newest'); // 'newest' | 'top'
  const [selectedTag, setSelectedTag] = useState('');
  const [activePost, setActivePost] = useState(null);
  const [postComments, setPostComments] = useState([]);

  // Live Group Chat (MongoDB + Socket.io)
  const [groupMessages, setGroupMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [showCodeBox, setShowCodeBox] = useState(false);
  const [answerInput, setAnswerInput] = useState('');

  // Omni-Search & Notifications
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Modals & Profile Viewer
  const [activeModal, setActiveModal] = useState(null);
  const [viewedProfile, setViewedProfile] = useState(null);

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  // Initial Boot: Load Saved Wallpaper, Current User, and Servers
  useEffect(() => {
    const savedBg = localStorage.getItem('spatial_bg');
    if (savedBg) setBgImage(savedBg);

    fetchInitialWorkspace();

    // Connect Socket.io
    socketRef.current = io(SOCKET_URL, { withCredentials: true });
    socketRef.current.on('new_group_message', (msg) => {
      setGroupMessages((prev) => [...prev, msg]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const fetchInitialWorkspace = async () => {
    try {
      // Check if logged in
      const token = localStorage.getItem('spatial_token');
      if (token) {
        try {
          const meRes = await apiRequest('/api/auth/me');
          setCurrentUser(meRes.user);
          const notifRes = await apiRequest('/api/servers/notifications');
          setNotifications(notifRes.notifications || []);
        } catch {
          localStorage.removeItem('spatial_token');
        }
      }

      const srvRes = await apiRequest('/api/servers');
      setAllServers(srvRes.allServers || []);
      setJoinedServers(srvRes.joinedServers?.length ? srvRes.joinedServers : srvRes.allServers || []);

      if (srvRes.allServers?.length > 0 && !activeServer) {
        handleSelectServer(srvRes.allServers[0]);
      }
    } catch (err) {
      console.error('Workspace Init Error:', err.message);
    }
  };

  // When a Server is clicked in the Left Monogram Bar -> Load its Groups in Center
  const handleSelectServer = async (server) => {
    setActiveServer(server);
    setFocusedStage('GROUPS_IN_CENTER'); // Bring Groups list to Center Stage
    try {
      const grpRes = await apiRequest(`/api/servers/${server.id}/groups`);
      const groups = grpRes.groups || [];
      setServerGroups(groups);
      if (groups.length > 0) {
        handleSelectGroup(groups[0], false);
      } else {
        setActiveGroup(null);
        setPosts([]);
      }
    } catch (err) {
      console.error('Error loading groups:', err.message);
    }
  };

  // When a Group is clicked -> Load its Posts & open its People Chat on the Right Spatial Wing!
  const handleSelectGroup = async (group, bringChatToCenter = false) => {
    setActiveGroup(group);
    if (bringChatToCenter) {
      setFocusedStage('CHAT_IN_CENTER');
    }

    // Join WebSocket room for this Group
    socketRef.current?.emit('join_group', group.id);

    try {
      const [postsRes, chatRes] = await Promise.all([
        apiRequest(`/api/posts?groupId=${group.id}&sort=${feedSort}${selectedTag ? `&tag=${selectedTag}` : ''}`),
        apiRequest(`/api/servers/groups/${group.id}/chat`),
      ]);

      const fetchedPosts = postsRes.posts || [];
      setPosts(fetchedPosts);
      setGroupMessages(chatRes.messages || []);

      if (fetchedPosts.length > 0) {
        handleSelectPost(fetchedPosts[0]);
      } else {
        setActivePost(null);
        setPostComments([]);
      }
    } catch (err) {
      console.error('Error selecting group:', err.message);
    }
  };

  // Reload posts when sort ('newest' vs 'top') or tag filter changes
  useEffect(() => {
    if (!activeGroup) return;
    apiRequest(
      `/api/posts?groupId=${activeGroup.id}&sort=${feedSort}${selectedTag ? `&tag=${selectedTag}` : ''}`
    )
      .then((res) => setPosts(res.posts || []))
      .catch(() => {});
  }, [feedSort, selectedTag]);

  // Load a specific Post's Answers/Comments for the Q&A Thread tab
  const handleSelectPost = async (post) => {
    try {
      const res = await apiRequest(`/api/posts/${post.id}`);
      setActivePost(res.post);
      setPostComments(res.comments || []);
    } catch (err) {
      console.error('Error loading post details:', err.message);
    }
  };

  // Global Omni-Search Handler (Top Floating Bar)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults(null);
        return;
      }
      try {
        const res = await apiRequest(`/api/servers/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Send Live Chat Message in Right Spatial Panel (Socket.io + MongoDB)
  const handleSendGroupChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (!currentUser) return setActiveModal('AUTH');

    socketRef.current?.emit('send_group_message', {
      groupId: activeGroup.id,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      content: chatInput,
      codeSnippet: codeInput,
    });

    setChatInput('');
    setCodeInput('');
    setShowCodeBox(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Submit Structured Markdown Answer on a Post (PostgreSQL)
  const handleAddAnswer = async (e) => {
    e.preventDefault();
    if (!answerInput.trim() || !activePost) return;
    if (!currentUser) return setActiveModal('AUTH');

    try {
      await apiRequest(`/api/posts/${activePost.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body_markdown: answerInput }),
      });
      setAnswerInput('');
      await handleSelectPost(activePost);
    } catch (err) {
      alert(err.message);
    }
  };

  // Upvote / Downvote Handler (Calls Atomic PostgreSQL Transaction)
  const handleVote = async (target_type, target_id, vote_value) => {
    if (!currentUser) return setActiveModal('AUTH');
    try {
      await apiRequest('/api/posts/vote', {
        method: 'POST',
        body: JSON.stringify({ target_type, target_id, vote_value }),
      });
      if (activeGroup) {
        const postsRes = await apiRequest(`/api/posts?groupId=${activeGroup.id}&sort=${feedSort}`);
        setPosts(postsRes.posts || []);
      }
      if (activePost) {
        await handleSelectPost(activePost);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Mark Accepted Answer (Post Author Only)
  const handleAcceptAnswer = async (commentId) => {
    if (!currentUser || !activePost) return;
    try {
      await apiRequest(`/api/posts/${activePost.id}/accept/${commentId}`, {
        method: 'PATCH',
      });
      await handleSelectPost(activePost);
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Own Post (Access Control Requirement)
  const handleDeletePost = async (postId) => {
    if (!confirm('Delete your post permanently?')) return;
    try {
      await apiRequest(`/api/posts/${postId}`, { method: 'DELETE' });
      handleSelectGroup(activeGroup);
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Any Developer's Profile & Activity Modal
  const openUserProfile = async (username) => {
    try {
      const res = await apiRequest(`/api/auth/profile/${username}`);
      setViewedProfile(res.profile);
      setActiveModal('USER_PROFILE');
    } catch (err) {
      console.error(err);
    }
  };

  const displayedServers = joinedServers.length > 0 ? joinedServers : allServers;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none bg-zinc-950 text-white font-sans"
      style={{
        backgroundImage: `url('${bgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Subtle Ambient Vignette Overlay for Glass Contrast */}
      <div className="absolute inset-0 bg-black/35 pointer-events-none" />

      {/* =====================================================================
          1. TOP FLOATING SPATIAL SEARCH BAR (Mirrors Reference Image Top Pill)
      ====================================================================== */}
      <header className="relative z-30 pt-5 flex justify-center px-4">
        <div className="spatial-glass-pill w-full max-w-xl h-14 rounded-full px-4 flex items-center justify-between gap-3">
          {/* Left Community Brand Icon */}
          <button
            onClick={() => setFocusedStage('GROUPS_IN_CENTER')}
            className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center shadow-md shadow-sky-500/40 shrink-0 hover:scale-105 transition"
            title="Reset Spatial View"
          >
            <Code2 className="w-5 h-5 text-white" />
          </button>

          {/* Center Omni-Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people, groups, servers, or #tags..."
              className="w-full pl-9 pr-4 py-1.5 rounded-full bg-black/25 border border-white/15 text-xs text-white placeholder-white/50 focus:outline-none focus:border-white/40"
            />

            {/* Live Omni-Search Dropdown Results */}
            {searchResults && (
              <div className="absolute top-11 left-0 right-0 spatial-glass rounded-2xl p-3 space-y-3 max-h-80 overflow-y-auto z-50 border border-white/25">
                <div className="flex justify-between items-center text-[11px] text-white/50 px-1">
                  <span>GLOBAL OMNI-SEARCH RESULTS</span>
                  <button onClick={() => setSearchResults(null)} className="text-sky-400">
                    Close
                  </button>
                </div>

                {searchResults.servers?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-amber-300 uppercase px-1 mb-1">Servers</div>
                    {searchResults.servers.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          handleSelectServer(s);
                          setSearchResults(null);
                        }}
                        className="p-2 rounded-xl hover:bg-white/10 cursor-pointer flex items-center gap-2 text-xs"
                      >
                        <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center font-bold text-[10px]">
                          {s.monogram}
                        </span>
                        <span>{s.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.groups?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-emerald-300 uppercase px-1 mb-1">Groups</div>
                    {searchResults.groups.map((g) => (
                      <div
                        key={g.id}
                        onClick={() => {
                          handleSelectGroup(g, true);
                          setSearchResults(null);
                        }}
                        className="p-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs flex justify-between"
                      >
                        <span>#{g.name}</span>
                        <span className="text-white/40 text-[10px]">{g.server_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.people?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-sky-300 uppercase px-1 mb-1">Developers</div>
                    {searchResults.people.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => {
                          openUserProfile(u.username);
                          setSearchResults(null);
                        }}
                        className="p-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs flex justify-between"
                      >
                        <span>@{u.username}</span>
                        <span className="text-amber-300 text-[10px]">★ {u.reputation}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.posts?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-purple-300 uppercase px-1 mb-1">Posts & Questions</div>
                    {searchResults.posts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          handleSelectPost(p);
                          setRightPanelTab('QA_THREAD');
                          setFocusedStage('CHAT_IN_CENTER');
                          setSearchResults(null);
                        }}
                        className="p-2 rounded-xl hover:bg-white/10 cursor-pointer text-xs truncate"
                      >
                        {p.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action: Swap Focus / Expand Stage Button */}
          <button
            onClick={() =>
              setFocusedStage(
                focusedStage === 'GROUPS_IN_CENTER' ? 'CHAT_IN_CENTER' : 'GROUPS_IN_CENTER'
              )
            }
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0"
            title="Swap Center & Right Spatial Panels"
          >
            {focusedStage === 'GROUPS_IN_CENTER' ? (
              <Maximize2 className="w-4 h-4 text-white/80" />
            ) : (
              <Minimize2 className="w-4 h-4 text-sky-400" />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. MAIN SPATIAL 3D STAGE (Left Docks + Center Panel + Right Tilted Wing)
      ====================================================================== */}
      <main className="spatial-stage relative z-20 flex items-center justify-center gap-4 px-6 pt-4 pb-20 h-[calc(100vh-88px)] max-w-[1600px] mx-auto">
        {/* -------------------------------------------------------------------
            A. LEFT FLOATING VERTICAL DOCKS (Primary Dock + Server Bar + Collapsed Group Bar)
        -------------------------------------------------------------------- */}
        <div className="flex items-center gap-2.5 shrink-0 h-full max-h-[560px]">
          {/* Dock 1: Primary Navigation Pill (Home, Search, Notifications, Create, Joined Servers Arrow, Settings) */}
          <aside className="spatial-glass-pill w-14 py-5 rounded-full flex flex-col items-center justify-between h-full">
            <div className="flex flex-col items-center gap-4">
              {/* Home Button */}
              <button
                onClick={() => setFocusedStage('GROUPS_IN_CENTER')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  focusedStage === 'GROUPS_IN_CENTER'
                    ? 'bg-white/25 text-white shadow-inner'
                    : 'text-white/65 hover:text-white hover:bg-white/10'
                }`}
                title="Home / Groups View"
              >
                <Home className="w-4 h-4" />
              </button>

              {/* My Joined Servers Toggle (Arrow turns ▸ to ▾ and opens Server Monogram Bar!) */}
              <button
                onClick={() => setIsServersExpanded(!isServersExpanded)}
                className={`w-10 h-10 rounded-full flex flex-col items-center justify-center transition ${
                  isServersExpanded ? 'bg-sky-500/30 text-sky-300 border border-sky-400/40' : 'text-white/65 hover:bg-white/10'
                }`}
                title="My Joined Servers (Toggle Vertical Server Bar)"
              >
                <Layers className="w-3.5 h-3.5" />
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    isServersExpanded ? 'rotate-90 text-sky-300' : 'rotate-0'
                  }`}
                />
              </button>

              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/65 hover:text-white hover:bg-white/10 transition"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2.5" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute left-14 top-0 w-72 spatial-glass rounded-2xl p-3 z-50 space-y-2 border border-white/25">
                    <div className="text-xs font-semibold text-white/80 px-1">Live Notifications</div>
                    {notifications.length === 0 ? (
                      <div className="text-xs text-white/50 p-2">No notifications yet.</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n._id} className="p-2 rounded-xl bg-white/5 text-xs text-white/85">
                          {n.message}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Create Server / Group / Post (+) */}
              <button
                onClick={() => setActiveModal(currentUser ? 'CREATE_HUB' : 'AUTH')}
                className="w-10 h-10 rounded-full bg-sky-500/20 hover:bg-sky-500/40 border border-sky-400/30 flex items-center justify-center text-sky-300 transition"
                title="Create Server, Group, or Post"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Icons: Profile / Settings / Auth */}
            <div className="flex flex-col items-center gap-3">
              {currentUser ? (
                <button
                  onClick={() => openUserProfile(currentUser.username)}
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 text-xs font-bold flex items-center justify-center shadow-md"
                  title={`Logged in as @${currentUser.username}`}
                >
                  {currentUser.username.slice(0, 2).toUpperCase()}
                </button>
              ) : (
                <button
                  onClick={() => setActiveModal('AUTH')}
                  className="w-10 h-10 rounded-full bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300 hover:bg-emerald-500/40 transition"
                  title="Login / Register"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={() => setActiveModal('SETTINGS')}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/65 hover:text-white hover:bg-white/10 transition"
                title="Settings & Custom Background"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </aside>

          {/* Dock 2: Collapsible Server Monogram Vertical Bar (Appears when arrow points down ▾) */}
          <div
            className={`spatial-glass-pill rounded-full flex flex-col items-center py-4 gap-3 overflow-y-auto spatial-panel-transition h-full ${
              isServersExpanded
                ? 'w-14 opacity-100 translate-x-0 px-2'
                : 'w-0 opacity-0 -translate-x-4 px-0 pointer-events-none border-0'
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
              Srv
            </span>
            {displayedServers.map((srv) => {
              const isSelected = activeServer?.id === srv.id;
              return (
                <button
                  key={srv.id}
                  onClick={() => handleSelectServer(srv)}
                  className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center transition-all shrink-0 ${
                    isSelected
                      ? 'bg-sky-500 text-white ring-2 ring-white/70 scale-105 shadow-lg shadow-sky-500/30'
                      : 'bg-white/10 text-white/75 hover:bg-white/20 hover:text-white'
                  }`}
                  title={srv.name}
                >
                  {srv.monogram}
                </button>
              );
            })}
          </div>

          {/* Dock 3: Adjacent Collapsed Groups Monogram Bar!
              (Appears automatically when Right Chat Panel comes to Center Stage!) */}
          <div
            className={`spatial-glass-pill rounded-full flex flex-col items-center py-4 gap-2.5 overflow-y-auto spatial-panel-transition h-full ${
              focusedStage === 'CHAT_IN_CENTER'
                ? 'w-14 opacity-100 translate-x-0 px-2'
                : 'w-0 opacity-0 -translate-x-4 px-0 pointer-events-none border-0'
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300/70">
              Grp
            </span>
            {serverGroups.map((grp) => {
              const isSelected = activeGroup?.id === grp.id;
              const grpMonogram = grp.name
                .split('-')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 3);
              return (
                <button
                  key={grp.id}
                  onClick={() => handleSelectGroup(grp, true)}
                  className={`w-10 h-10 rounded-2xl font-mono font-bold text-[11px] flex items-center justify-center transition-all shrink-0 ${
                    isSelected
                      ? 'bg-emerald-500 text-white ring-2 ring-white/60 scale-105'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  title={`#${grp.name} (Click to switch group, double-click to expand groups to center)`}
                  onDoubleClick={() => setFocusedStage('GROUPS_IN_CENTER')}
                >
                  #{grpMonogram}
                </button>
              );
            })}
            <button
              onClick={() => setFocusedStage('GROUPS_IN_CENTER')}
              className="mt-auto w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/70 text-xs"
              title="Restore Groups Panel to Center Stage"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            B. CENTER STAGE PANEL
            When focusedStage === 'GROUPS_IN_CENTER': Shows Server's Groups & Questions Feed
            When focusedStage === 'CHAT_IN_CENTER': The Group's People Chat / Q&A Thread glides here!
        -------------------------------------------------------------------- */}
        {focusedStage === 'GROUPS_IN_CENTER' ? (
          /* === CENTER STATE 1: SERVER GROUPS & QUESTIONS FEED === */
          <section className="spatial-glass spatial-panel-transition flex-1 max-w-3xl h-full rounded-[34px] flex flex-col overflow-hidden">
            {/* Panel Header (Mirrors "Home | For you | Following" in VisionOS Reference) */}
            <div className="px-6 pt-5 pb-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/25 border border-sky-400/30 text-sky-300 text-xs font-bold">
                    {activeServer?.monogram || 'SRV'}
                  </span>
                  <h1 className="text-lg font-bold tracking-tight">
                    {activeServer?.name || 'Select a Community'}
                  </h1>
                </div>
                <p className="text-xs text-white/55 mt-0.5">{activeServer?.description}</p>
              </div>

              {/* Feed Sorting Tabs (Newest vs Top - Required by PS 06) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFeedSort('newest')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    feedSort === 'newest'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setFeedSort('top')}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    feedSort === 'top'
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  Top Voted
                </button>
              </div>
            </div>

            {/* Horizontal Discord-Style Groups Pill Bar inside the Server */}
            <div className="px-6 py-3 bg-black/20 border-b border-white/10 flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mr-1">
                Groups:
              </span>
              {serverGroups.map((grp) => {
                const isSelected = activeGroup?.id === grp.id;
                return (
                  <button
                    key={grp.id}
                    onClick={() => handleSelectGroup(grp, false)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition shrink-0 ${
                      isSelected
                        ? 'bg-white text-zinc-900 font-semibold shadow'
                        : 'bg-white/10 text-white/75 hover:bg-white/20'
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5 opacity-70" />
                    <span>{grp.name}</span>
                    <span className="text-[10px] opacity-60">({grp.post_count || 0})</span>
                  </button>
                );
              })}

              <button
                onClick={() => setActiveModal(currentUser ? 'CREATE_HUB' : 'AUTH')}
                className="px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-xs font-medium shrink-0 ml-auto"
              >
                + New Group / Post
              </button>
            </div>

            {/* Active Tag Filter Banner */}
            {selectedTag && (
              <div className="px-6 py-1.5 bg-sky-500/20 flex items-center justify-between text-xs">
                <span>
                  Filtering by tag: <strong>#{selectedTag}</strong>
                </span>
                <button onClick={() => setSelectedTag('')} className="text-sky-300 hover:underline">
                  Clear filter
                </button>
              </div>
            )}

            {/* Quick Composer Bar (Mirrors "What is Happening?" in VisionOS Reference) */}
            <div className="px-6 py-3 border-b border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser ? currentUser.username.slice(0, 2).toUpperCase() : '?'}
              </div>
              <button
                onClick={() => setActiveModal(currentUser ? 'CREATE_HUB' : 'AUTH')}
                className="flex-1 text-left px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white/60 transition"
              >
                Ask a technical question or share code in #{activeGroup?.name || 'group'}...
              </button>
            </div>

            {/* Scrollable Posts & Questions Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-white/50 text-sm">
                  No questions posted in <strong>#{activeGroup?.name}</strong> yet. Click above to post the first one!
                </div>
              ) : (
                posts.map((post) => (
                  <article
                    key={post.id}
                    onClick={() => {
                      handleSelectPost(post);
                      setRightPanelTab('QA_THREAD');
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      activePost?.id === post.id
                        ? 'bg-white/15 border-sky-400/50 shadow-lg'
                        : 'bg-black/25 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openUserProfile(post.author_username);
                          }}
                          className="font-semibold text-white hover:text-sky-300 cursor-pointer"
                        >
                          @{post.author_username}
                        </span>
                        <span className="text-amber-300/90 text-[11px]">★ {post.author_reputation}</span>
                        <span>•</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {post.accepted_comment_id && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Solved
                          </span>
                        )}
                        {currentUser?.id === post.author_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost(post.id);
                            }}
                            className="text-rose-400 hover:text-rose-300 p-1"
                            title="Delete Own Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h2 className="text-base font-semibold text-white mb-2">{post.title}</h2>

                    {/* Render Markdown & Syntax Code Blocks */}
                    <div className="line-clamp-4">{renderMarkdownElements(post.body_markdown)}</div>

                    {/* Tags & Voting Footer */}
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags?.map((tag) => (
                          <button
                            key={tag}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(tag);
                            }}
                            className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-sky-500/30 text-[11px] text-sky-200 transition"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote('POST', post.id, 1);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-emerald-500/30 transition"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-300" />
                          <span>{post.score}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote('POST', post.id, -1);
                          }}
                          className="p-1 rounded-full bg-white/10 hover:bg-rose-500/30 transition"
                        >
                          <ThumbsDown className="w-3.5 h-3.5 text-rose-300" />
                        </button>
                        <span className="flex items-center gap-1 text-white/60">
                          <MessageSquare className="w-3.5 h-3.5" /> {post.comment_count || 0} answers
                        </span>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : (
          /* === CENTER STATE 2: RIGHT GROUP CHAT & ANSWERS PANEL GLIDED TO CENTER STAGE! === */
          <section className="spatial-glass spatial-panel-transition flex-1 max-w-4xl h-full rounded-[34px] flex flex-col overflow-hidden border-sky-400/30">
            <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFocusedStage('GROUPS_IN_CENTER')}
                  className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs flex items-center gap-1.5 transition"
                >
                  ← Back to Groups
                </button>
                <div>
                  <h2 className="text-base font-bold flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-emerald-400" />
                    {activeGroup?.name || 'group-chat'}
                    <span className="text-xs font-normal text-white/50 ml-1">
                      ({activeServer?.name})
                    </span>
                  </h2>
                </div>
              </div>

              {/* Mode Switcher: Live Group Chat vs Structured Q&A Answers */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRightPanelTab('LIVE_CHAT')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                    rightPanelTab === 'LIVE_CHAT' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  Live People Chat ({groupMessages.length})
                </button>
                <button
                  onClick={() => setRightPanelTab('QA_THREAD')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                    rightPanelTab === 'QA_THREAD' ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  Q&A Answers ({postComments.length})
                </button>
              </div>
            </div>

            {/* Body of Expanded Center Chat / Q&A */}
            {rightPanelTab === 'LIVE_CHAT' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  {groupMessages.length === 0 ? (
                    <div className="text-center py-12 text-white/40 text-xs">
                      Start the live conversation in #{activeGroup?.name}! Messages sync in real time via Socket.io + MongoDB.
                    </div>
                  ) : (
                    groupMessages.map((m, i) => (
                      <div key={m._id || i} className="p-3.5 rounded-2xl bg-black/30 border border-white/10">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span
                            onClick={() => openUserProfile(m.senderUsername)}
                            className="font-semibold text-emerald-300 hover:underline cursor-pointer"
                          >
                            @{m.senderUsername}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-white/90">{m.content}</p>
                        {m.codeSnippet && (
                          <pre className="mt-2 p-2.5 rounded-xl bg-black/70 border border-white/10 text-xs font-mono text-sky-300 overflow-x-auto">
                            <code>{m.codeSnippet}</code>
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Live Chat Input Bar */}
                <form onSubmit={handleSendGroupChat} className="p-4 bg-black/30 border-t border-white/10 space-y-2">
                  {showCodeBox && (
                    <textarea
                      rows={3}
                      placeholder="Paste code snippet here..."
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-emerald-300"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCodeBox(!showCodeBox)}
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-sky-300"
                      title="Attach Code Snippet"
                    >
                      <Code2 className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Message everyone in #${activeGroup?.name || 'group'}...`}
                      className="flex-1 px-4 py-2.5 rounded-full bg-black/40 border border-white/15 text-xs focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Structured Q&A Answers View with Upvote/Downvote & Accepted Answer */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {activePost ? (
                    <>
                      <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-400/30">
                        <div className="text-xs text-sky-300 mb-1">
                          Question by @{activePost.author_username} • Score: {activePost.score}
                        </div>
                        <h3 className="text-base font-bold mb-2">{activePost.title}</h3>
                        {renderMarkdownElements(activePost.body_markdown)}
                      </div>

                      <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">
                        {postComments.length} Community Answers
                      </h4>

                      {postComments.map((c) => {
                        const isAccepted = activePost.accepted_comment_id === c.id;
                        return (
                          <div
                            key={c.id}
                            className={`p-4 rounded-2xl border ${
                              isAccepted
                                ? 'bg-emerald-500/15 border-emerald-400/50'
                                : 'bg-black/30 border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  onClick={() => openUserProfile(c.author_username)}
                                  className="font-semibold text-white hover:underline cursor-pointer"
                                >
                                  @{c.author_username}
                                </span>
                                {isAccepted && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Accepted Answer
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {currentUser?.id === activePost.author_id && !isAccepted && (
                                  <button
                                    onClick={() => handleAcceptAnswer(c.id)}
                                    className="px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-[11px]"
                                  >
                                    ✓ Mark Accepted
                                  </button>
                                )}
                                <button
                                  onClick={() => handleVote('COMMENT', c.id, 1)}
                                  className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-emerald-500/30 text-xs flex items-center gap-1"
                                >
                                  ▲ {c.score}
                                </button>
                                <button
                                  onClick={() => handleVote('COMMENT', c.id, -1)}
                                  className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-rose-500/30 text-xs"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>

                            {renderMarkdownElements(c.body_markdown)}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-12 text-white/40 text-xs">
                      Select a question from the group feed to view or post answers.
                    </div>
                  )}
                </div>

                {activePost && (
                  <form onSubmit={handleAddAnswer} className="p-4 bg-black/30 border-t border-white/10 flex gap-2">
                    <textarea
                      rows={2}
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      placeholder="Write a helpful Markdown answer (use ``` for code blocks)..."
                      className="flex-1 px-3.5 py-2 rounded-2xl bg-black/40 border border-white/15 text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-2xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold shrink-0"
                    >
                      Post Answer
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>
        )}

        {/* -------------------------------------------------------------------
            C. RIGHT 3D-TILTED SPATIAL WING PANEL (Mirrors "Messages" Panel in Reference Image)
            Clicking anywhere on this panel smoothly glides it to Center Stage!
        -------------------------------------------------------------------- */}
        {focusedStage === 'GROUPS_IN_CENTER' && (
          <aside
            onClick={() => setFocusedStage('CHAT_IN_CENTER')}
            className="spatial-glass spatial-right-wing w-80 lg:w-96 h-full max-h-[560px] rounded-[32px] flex flex-col overflow-hidden cursor-pointer shrink-0"
            title="Click to bring Group Chat & Thread to Center Stage!"
          >
            {/* Right Wing Header (Mirrors "Messages" + Expand Icon in Reference Image) */}
            <div className="px-5 pt-5 pb-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
                  <span>#{activeGroup?.name || 'Select Group'}</span>
                </h2>
                <p className="text-[11px] text-sky-300">
                  Click panel to bring to Center Stage ⤢
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRightPanelTab(rightPanelTab === 'LIVE_CHAT' ? 'QA_THREAD' : 'LIVE_CHAT');
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  title="Toggle Chat vs Q&A Answers"
                >
                  <MessageSquare className="w-3.5 h-3.5"/>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusedStage('CHAT_IN_CENTER');
                  }}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-sky-500 flex items-center justify-center transition"
                  title="Bring to Center Stage"
                >
                  <Maximize2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>

            {/* Right Wing Content Preview (People Chatting in Selected Group) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {rightPanelTab === 'LIVE_CHAT' ? (
                groupMessages.length > 0 ? (
                  groupMessages.map((msg, idx) => (
                    <div
                      key={msg._id || idx}
                      className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/10 transition border-b border-white/5"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-zinc-950 font-bold text-xs flex items-center justify-center shrink-0">
                        {msg.senderUsername?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white truncate">
                            {msg.senderUsername}
                          </span>
                          <span className="text-[10px] text-white/45">
                            {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-white/70 truncate mt-0.5">{msg.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  /* If no live chat messages yet, show active Post Answers in the Group */
                  postComments.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-white/10 transition border-b border-white/5"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {c.author_username?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">@{c.author_username}</span>
                          <span className="text-[10px] text-emerald-300">+{c.score}</span>
                        </div>
                        <p className="text-xs text-white/70 line-clamp-2 mt-0.5">{c.body_markdown}</p>
                      </div>
                    </div>
                  ))
                )
              ) : (
                postComments.map((c) => (
                  <div key={c.id} className="p-3 rounded-2xl bg-black/25 border border-white/10 text-xs">
                    <div className="font-semibold text-sky-300 mb-1">@{c.author_username}</div>
                    <div className="line-clamp-3 text-white/80">{c.body_markdown}</div>
                  </div>
                ))
              )}

              {groupMessages.length === 0 && postComments.length === 0 && (
                <div className="text-center py-12 px-4 text-xs text-white/50">
                  Click this 3D panel to bring <strong>#{activeGroup?.name}</strong> to Center Stage and start chatting or answering!
                </div>
              )}
            </div>
          </aside>
        )}
      </main>

      {/* =====================================================================
          3. BOTTOM FLOATING DOCK (Mirrors Bottom Warm Glass Pill in Reference Image)
      ====================================================================== */}
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="spatial-Bottom-Dock px-7 py-2.5 rounded-full flex items-center gap-7">
          <button
            onClick={() => setFocusedStage('GROUPS_IN_CENTER')}
            className="text-white/80 hover:text-white transition"
            title="Home Stage"
          >
            <Home className="w-4 h-4"/>
          </button>
          <button
            onClick={() => document.querySelector('input[placeholder*="Search"]')?.focus()}
            className="text-white/80 hover:text-white transition"
            title="Omni-Search"
          >
            <Search className="w-4 h-4"/>
          </button>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-white/80 hover:text-white transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4"/>
          </button>
          <button
            onClick={() => setFocusedStage('CHAT_IN_CENTER')}
            className="text-white/80 hover:text-white transition"
            title="Focus Group Chat"
          >
            <MessageSquare className="w-4 h-4"/>
          </button>
          <button
            onClick={() => setActiveModal(currentUser ? 'CREATE_HUB' : 'AUTH')}
            className="text-white/80 hover:text-white transition"
            title="Create Post / Group / Server"
          >
            <Plus className="w-4 h-4"/>
          </button>
          <button
            onClick={() => setActiveModal('SETTINGS')}
            className="text-white/80 hover:text-white transition"
            title="Environment & Profile Settings"
          >
            <Settings className="w-4 h-4"/>
          </button>
        </div>
      </footer>

      {/* Modals for Auth, Create Server/Group/Post, Settings & User Profiles */}
      <SpatialModals activeGroup="{activeGroup}" activeModal="{activeModal}" activeServer="{activeServer}" bgImage="{bgImage}" currentUser="{currentUser}" onRefreshData="{fetchInitialWorkspace}" setActiveModal="{setActiveModal}" setBgImage="{setBgImage}" setCurrentUser="{setCurrentUser}" viewedProfile="{viewedProfile}"/>
    </div>
  );
}