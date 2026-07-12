"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, ClientsIcon, CommunityIcon, SettingsIcon } from "./icons";
import { avatarColorFor, initialsFor } from "@/lib/dashboard-utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/dashboard/clients", label: "Clients", icon: ClientsIcon },
  { href: "/dashboard/community", label: "Community", icon: CommunityIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 flex w-[240px] flex-col border-r border-border"
      style={{ background: "#0D1321" }}
    >
      <div className="flex items-center gap-2 px-6 py-6">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "#3B6FE8", boxShadow: "0 0 8px #3B6FE8" }}
        />
        <span className="text-base font-semibold tracking-tight text-white">Clovior</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors"
              style={{
                borderLeft: isActive ? "2px solid #3B6FE8" : "2px solid transparent",
                background: isActive ? "rgba(59,111,232,0.08)" : "transparent",
                color: isActive ? "#ffffff" : "#8892A4",
                marginLeft: isActive ? 0 : 0,
              }}
            >
              <Icon />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/dashboard/settings"
        className="flex items-center gap-3 border-t border-border px-4 py-4 transition-colors hover:bg-white/[0.03]"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: avatarColorFor(userName || userEmail) }}
        >
          {initialsFor(userName || userEmail)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{userName || "Your account"}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <SettingsIcon size={16} className="shrink-0 text-muted-foreground" />
      </Link>
    </aside>
  );
}
