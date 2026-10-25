'use client';
import React, { useState } from 'react';
import { X, Plus, CheckCircle2, Sparkles, User, Image as ImageIcon, Shield, Award } from 'lucide-react';
import { apiRequest } from '../lib/api';

export default function SpatialModals({
  activeModal,
  setActiveModal,
  currentUser,
  setCurrentUser,
  activeServer,
  activeGroup,
  onRefreshData,
  bgImage,
  setBgImage,
  viewedProfile,
}) {
  const [authMode, setAuthMode] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    bio: '',
    skills: '',
    serverName: '',
    serverMonogram: '',
    serverDesc: '',
    groupName: '',
    groupDesc: '',
    postTitle: '',
    postBody: '',
    postTags: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!activeModal) return null;

  const closeModal = () => {
    setError('');
    setActiveModal(null);
  };

  // 1. Handle Login / Register
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        authMode === 'login'
          ? { email: formData.email, password: formData.password }
          : {
              username: formData.username,
              email: formData.email,
              password: formData.password,
              bio: formData.bio,
              skills: formData.skills
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            };

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      localStorage.setItem('spatial_token', res.token);
      setCurrentUser(res.user);
      await onRefreshData();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Create Server
  const handleCreateServer = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequest('/api/servers', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.serverName,
          monogram: formData.serverMonogram.toUpperCase().slice(0, 4),
          description: formData.serverDesc,
        }),
      });
      await onRefreshData();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Create Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!activeServer) return setError('Select a server first.');
    setError('');
    setLoading(true);
    try {
      await apiRequest(`/api/servers/${activeServer.id}/groups`, {
        method: 'POST',
        body: JSON.stringify({
          name: formData.groupName.toLowerCase().replace(/\s+/g, '-'),
          description: formData.groupDesc,
        }),
      });
      await onRefreshData();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Create Post (Question/Topic with Markdown & Code)
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!activeGroup) return setError('Please select a group first.');
    setError('');
    setLoading(true);
    try {
      await apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          group_id: activeGroup.id,
          title: formData.postTitle,
          body_markdown: formData.postBody,
          tags: formData.postTags
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
        }),
      });
      await onRefreshData();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          bio: formData.bio || currentUser.bio,
          skills: formData.skills
            ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
            : currentUser.skills,
        }),
      });
      setCurrentUser(res.user);
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const presetBackgrounds = [
    {
      name: 'VisionOS Concrete Loft (Default)',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80',
    },
    {
      name: 'Dark Alpine Night',
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2000&q=80',
    },
    {
      name: 'Minimalist Dark Studio',
      url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="spatial-glass w-full max-w-lg rounded-3xl p-6 text-white relative border border-white/25 animate-in fade-in zoom-in-95 duration-200 max-h-[88vh] overflow-y-auto">
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* AUTH MODAL */}
        {activeModal === 'AUTH' && (
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {authMode === 'login' ? 'Welcome Back to SpatialDev' : 'Create Developer Account'}
            </h2>
            <p className="text-xs text-white/60 mb-5">
              Join servers, ask technical questions, and collaborate in 3D space.
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authMode === 'register' && (
                <div>
                  <label className="text-xs text-white/70 block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="sufiyan_iiti"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm focus:outline-none focus:border-sky-400"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-white/70 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="developer@iiti.ac.in"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm focus:outline-none focus:border-sky-400"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-white/70 block mb-1">Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm focus:outline-none focus:border-sky-400"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Bio</label>
                    <input
                      type="text"
                      placeholder="CSE @ IIT Indore | Full-Stack & CP"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm focus:outline-none focus:border-sky-400"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">
                      Skills (comma-separated, stored as PostgreSQL TEXT[])
                    </label>
                    <input
                      type="text"
                      placeholder="C++, Next.js, PostgreSQL, Node.js"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm focus:outline-none focus:border-sky-400"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition shadow-lg shadow-sky-500/25"
              >
                {loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-white/60">
              {authMode === 'login' ? "Don't have an account? " : 'Already registered? '}
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-sky-400 hover:underline font-medium"
              >
                {authMode === 'login' ? 'Register now' : 'Sign In'}
              </button>
            </div>
          </div>
        )}

        {/* CREATE HUB MODAL (Server / Group / Post) */}
        {activeModal === 'CREATE_HUB' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" /> Create in Spatial Workspace
              </h2>
              <p className="text-xs text-white/60">
                Launch a new community server, add a channel group, or post a Markdown question.
              </p>
            </div>

            {/* Form 1: New Post in Current Group */}
            {activeGroup && (
              <form onSubmit={handleCreatePost} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h3 className="text-sm font-semibold text-sky-300">
                  1. Ask Question / Create Post in #{activeGroup.name}
                </h3>
                <input
                  type="text"
                  required
                  placeholder="Question title (e.g., How to optimize PostgreSQL GIN index?)"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm"
                  value={formData.postTitle}
                  onChange={(e) => setFormData({ ...formData, postTitle: e.target.value })}
                />
                <textarea
                  rows={4}
                  required
                  placeholder="Write details in Markdown... Wrap code in ```js ... ```"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm font-mono"
                  value={formData.postBody}
                  onChange={(e) => setFormData({ ...formData, postBody: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Tags comma-separated (e.g., postgresql, nextjs, bug)"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs"
                  value={formData.postTags}
                  onChange={(e) => setFormData({ ...formData, postTags: e.target.value })}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold transition"
                >
                  Publish Post
                </button>
              </form>
            )}

            {/* Form 2: New Group in Current Server */}
            {activeServer && (
              <form onSubmit={handleCreateGroup} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <h3 className="text-sm font-semibold text-emerald-300">
                  2. Create Group inside {activeServer.name}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="group-name (e.g. rust-help)"
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs"
                    value={formData.groupName}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Short description"
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs"
                    value={formData.groupDesc}
                    onChange={(e) => setFormData({ ...formData, groupDesc: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 text-xs font-semibold transition"
                >
                  + Add Group to {activeServer.monogram}
                </button>
              </form>
            )}

            {/* Form 3: New Server */}
            <form onSubmit={handleCreateServer} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <h3 className="text-sm font-semibold text-amber-300">3. Launch a Brand New Server</h3>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Server Name"
                  className="col-span-2 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs"
                  value={formData.serverName}
                  onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
                />
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="Monogram (e.g. AI)"
                  className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs uppercase"
                  value={formData.serverMonogram}
                  onChange={(e) => setFormData({ ...formData, serverMonogram: e.target.value })}
                />
              </div>
              <input
                type="text"
                placeholder="Server description..."
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs"
                value={formData.serverDesc}
                onChange={(e) => setFormData({ ...formData, serverDesc: e.target.value })}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-xs font-semibold transition"
              >
                Create Server
              </button>
            </form>
          </div>
        )}

        {/* SETTINGS & PROFILE MODAL (Includes Custom Background Chooser + User Profile Activity) */}
        {activeModal === 'SETTINGS' && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-sky-400" /> Spatial Environment & Profile Settings
            </h2>

            {/* Custom Background Image Chooser */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <label className="text-xs font-semibold text-white/80 block">
                Custom Spatial Background Image URL
              </label>
              <input
                type="text"
                placeholder="Paste any wallpaper URL or /my-bg.jpg from public folder..."
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs"
                value={bgImage}
                onChange={(e) => {
                  setBgImage(e.target.value);
                  localStorage.setItem('spatial_bg', e.target.value);
                }}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {presetBackgrounds.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setBgImage(preset.url);
                      localStorage.setItem('spatial_bg', preset.url);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Edit Current User Profile */}
            {currentUser && (
              <form onSubmit={handleUpdateProfile} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Edit Developer Profile (@{currentUser.username})</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
                    ★ {currentUser.reputation} Rep
                  </span>
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Bio</label>
                  <input
                    type="text"
                    defaultValue={currentUser.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Skills (comma-separated)</label>
                  <input
                    type="text"
                    defaultValue={currentUser.skills?.join(', ')}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-semibold transition"
                >
                  Save Profile Changes
                </button>
              </form>
            )}
          </div>
        )}

        {/* PUBLIC USER PROFILE & ACTIVITY VIEWER (PS 06 Core Requirement) */}
        {activeModal === 'USER_PROFILE' && viewedProfile && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-xl font-bold shadow-lg">
                {viewedProfile.username?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  @{viewedProfile.username}
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs flex items-center gap-1">
                    <Award className="w-3 h-3" /> {viewedProfile.reputation} Rep
                  </span>
                </h2>
                <p className="text-xs text-white/70 mt-0.5">{viewedProfile.bio || 'No bio added yet.'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {viewedProfile.skills?.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[11px]"
                >
                  {skill}
                </span>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Recent Questions & Posts ({viewedProfile.recent_posts?.length || 0})
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {viewedProfile.recent_posts?.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs flex justify-between">
                    <span className="font-medium truncate">{p.title}</span>
                    <span className="text-sky-400 shrink-0 ml-2">+{p.score} votes</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Recent Answers ({viewedProfile.recent_comments?.length || 0})
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {viewedProfile.recent_comments?.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                    <div className="text-white/50 text-[11px] mb-0.5">On: {c.post_title}</div>
                    <div className="truncate text-white/85">{c.body_markdown}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}