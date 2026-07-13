// A curated palette (not raw HSL random) so avatar colors stay legible and
// on-brand against the dark navy background instead of clashing or muddying.
const AVATAR_COLORS = [
  "#3B6FE8", // accent blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#F97316", // orange
  "#6366F1", // indigo
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function avatarColorFor(name: string): string {
  return AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function timeAgo(isoDate: string | null): string {
  if (!isoDate) return "No activity yet";

  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

// Whole days between now and a future ISO date, rounded up (1 day remaining
// shows "1" until it actually passes, not "0"). Negative once isoDate is past.
export function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export type EngagementLevel = "active" | "cooling" | "at-risk";

export function engagementLevel(lastActiveAt: string | null): EngagementLevel {
  if (!lastActiveAt) return "at-risk";

  const days = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 7) return "active";
  if (days <= 14) return "cooling";
  return "at-risk";
}

export const ENGAGEMENT_COLOR: Record<EngagementLevel, string> = {
  active: "#10B981",
  cooling: "#F59E0B",
  "at-risk": "#EF4444",
};

// Simple recency heuristic — decays linearly to 0 over 30 days of
// inactivity. Placeholder until the real engagement model (Session 9,
// last message + video + file activity via Claude) replaces it.
export function engagementScore(lastActiveAt: string | null): number {
  if (!lastActiveAt) return 0;
  const days = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(100 - (days / 30) * 100));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatClockTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
