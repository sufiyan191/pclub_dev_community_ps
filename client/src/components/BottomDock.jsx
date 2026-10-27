"use client";
import { Bell, Home, MessageSquare, Plus, Search, Server, Settings } from "lucide-react";
import DockButton from "./DockButton";

// The warm pill from the reference. On phones it doubles as the main navigation.
export default function BottomDock({
  view,
  stage,
  isServersOpen,
  hasUnread,
  notificationsOpen,
  onHome,
  onSearch,
  onToggleServers,
  onBell,
  onChat,
  onCreate,
  onSettings,
}) {
  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <nav
        aria-label="Quick actions"
        className="glass-warm pointer-events-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 sm:gap-3 sm:px-4"
      >
        <DockButton label="Home feed" active={view === "home"} onClick={onHome}>
          <Home className="h-[18px] w-[18px]" />
        </DockButton>
        <DockButton label="Search" onClick={onSearch}>
          <Search className="h-[18px] w-[18px]" />
        </DockButton>
        <DockButton
          label={isServersOpen ? "Hide my servers" : "Show my servers"}
          active={isServersOpen}
          onClick={onToggleServers}
          className="lg:hidden"
        >
          <Server className="h-[18px] w-[18px]" />
        </DockButton>
        <DockButton label="Notifications" active={notificationsOpen} badge={hasUnread} onClick={onBell}>
          <Bell className="h-[18px] w-[18px]" />
        </DockButton>
        <DockButton label="Group chat" active={stage === "chat"} onClick={onChat}>
          <MessageSquare className="h-[18px] w-[18px]" />
        </DockButton>
        <DockButton label="Create" onClick={onCreate}>
          <Plus className="h-5 w-5" />
        </DockButton>
        <DockButton label="Settings and profile" onClick={onSettings}>
          <Settings className="h-[18px] w-[18px]" />
        </DockButton>
      </nav>
    </footer>
  );
}
