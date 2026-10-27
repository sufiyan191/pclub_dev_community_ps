"use client";
import { Bell, ChevronRight, Home, LogIn, Plus, Search, Server, Settings } from "lucide-react";
import DockButton from "./DockButton";
import Avatar from "./Avatar";

export default function PrimaryDock({
  view,
  isServersOpen,
  onToggleServers,
  hasUnread,
  notificationsOpen,
  onHome,
  onSearch,
  onBell,
  onCreate,
  onSettings,
  currentUser,
  onProfile,
  onLogin,
}) {
  return (
    <nav
      aria-label="Primary"
      className="glass-pill hidden h-[min(100%,32rem)] w-14 shrink-0 flex-col items-center justify-between self-center rounded-full py-4 lg:flex"
    >
      <div className="flex flex-col items-center gap-2">
        <DockButton label="Home feed" active={view === "home"} onClick={onHome}>
          <Home className="h-[18px] w-[18px]" />
        </DockButton>
        <DockButton label="Search" onClick={onSearch}>
          <Search className="h-[18px] w-[18px]" />
        </DockButton>
        <DockButton label="Notifications" active={notificationsOpen} badge={hasUnread} onClick={onBell}>
          <Bell className="h-[18px] w-[18px]" />
        </DockButton>
        <DockButton label="Create a post, group or server" onClick={onCreate}>
          <Plus className="h-5 w-5" />
        </DockButton>
        <DockButton
          label={isServersOpen ? "Hide my servers" : "Show my servers"}
          active={isServersOpen}
          onClick={onToggleServers}
          className="gap-0.5"
        >
          <Server className="h-4 w-4" />
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-300 ease-spatial ${isServersOpen ? "rotate-90" : ""}`}
          />
        </DockButton>
      </div>

      <div className="flex flex-col items-center gap-2">
        {currentUser ? (
          <button
            onClick={onProfile}
            aria-label={`Your profile, signed in as ${currentUser.username}`}
            title={`@${currentUser.username}`}
            className="rounded-full transition active:scale-90"
          >
            <Avatar name={currentUser.username} />
          </button>
        ) : (
          <DockButton label="Sign in" onClick={onLogin}>
            <LogIn className="h-[18px] w-[18px]" />
          </DockButton>
        )}
        <DockButton label="Settings" onClick={onSettings}>
          <Settings className="h-[18px] w-[18px]" />
        </DockButton>
      </div>
    </nav>
  );
}
