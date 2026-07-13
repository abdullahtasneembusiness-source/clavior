export type PlanId = "solo" | "team" | "studio";

export const TRIAL_DAYS = 30;
export const TRIAL_FEE_CENTS = 100;

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceCents: number;
  clientLimit: number | null; // null = unlimited
  teamMemberLimit: number | null; // null = unlimited
  communityChat: boolean;
  aiIntelligence: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, PlanConfig> = {
  solo: {
    id: "solo",
    name: "Solo",
    priceCents: 4900,
    clientLimit: 10,
    teamMemberLimit: 0,
    communityChat: false,
    aiIntelligence: false,
    features: [
      "Up to 10 clients",
      "Unlimited messages, videos & files",
      "AI video transcripts & summaries",
      "No team members",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    priceCents: 9900,
    clientLimit: null,
    teamMemberLimit: 5,
    communityChat: true,
    aiIntelligence: false,
    features: [
      "Unlimited clients",
      "Up to 5 team members",
      "Community group chat",
      "Everything in Solo",
    ],
  },
  studio: {
    id: "studio",
    name: "Studio",
    priceCents: 19900,
    clientLimit: null,
    teamMemberLimit: null,
    communityChat: true,
    aiIntelligence: true,
    features: [
      "Unlimited clients & team members",
      "AI client intelligence dashboard",
      "Community group chat",
      "Everything in Team",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["solo", "team", "studio"];

export function isPlanId(value: unknown): value is PlanId {
  return value === "solo" || value === "team" || value === "studio";
}

export function nextPlan(plan: PlanId): PlanConfig | null {
  const index = PLAN_ORDER.indexOf(plan);
  const next = PLAN_ORDER[index + 1];
  return next ? PLANS[next] : null;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
