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
