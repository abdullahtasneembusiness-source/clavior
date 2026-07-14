import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

// One short, plain-language sentence a founder can read at a glance on the
// dashboard grid, and in full on the client detail panel — deliberately a
// single summary reused in both places rather than generating two, to keep
// Claude spend to one call per client per run.
const SYSTEM_PROMPT =
  "You are an assistant helping an online business coach quickly understand where each client " +
  "relationship stands. Based on the recent activity below (chat messages and video call summaries), " +
  "write exactly ONE short sentence — no more than 25 words — capturing the client's current status: " +
  "their engagement level, sentiment, and anything that needs the coach's attention. Be specific and " +
  "practical, not generic. Do not hedge or use filler like 'it seems' or 'overall'. Output only the " +
  "sentence itself, nothing else.";

const MAX_MESSAGES = 15;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Scoped to Studio-plan workspaces only — this is a paid, opt-in feature
  // (see plans.ts aiIntelligence flag), and running it for every workspace
  // would burn Claude spend on customers who aren't paying for the feature.
  // Filtered in JS rather than via a PostgREST "not in" filter string so
  // this stays in exact lockstep with effectivePlan()'s own semantics
  // (including status === null, e.g. never-checked-out, counting as active).
  const { data: studioSubs, error: subsError } = await admin
    .from("subscriptions")
    .select("workspace_id, status")
    .eq("plan", "studio");

  if (subsError) {
    console.error("generate-client-summaries: failed to load Studio subscriptions:", subsError);
    return NextResponse.json({ error: "Failed to load subscriptions." }, { status: 500 });
  }

  const workspaceIds = (studioSubs ?? [])
    .filter((s) => s.status !== "canceled" && s.status !== "unpaid")
    .map((s) => s.workspace_id);
  if (workspaceIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, failed: 0 });
  }

  const { data: clients, error: clientsError } = await admin
    .from("clients")
    .select("id, user_id, workspace_id, name")
    .in("workspace_id", workspaceIds)
    .eq("status", "active");

  if (clientsError) {
    console.error("generate-client-summaries: failed to load clients:", clientsError);
    return NextResponse.json({ error: "Failed to load clients." }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let processed = 0;
  let failed = 0;

  for (const client of clients ?? []) {
    try {
      const [{ data: messages }, { data: videos }] = await Promise.all([
        admin
          .from("messages")
          .select("content, sender_id, created_at")
          .eq("client_id", client.id)
          .order("created_at", { ascending: false })
          .limit(MAX_MESSAGES),
        admin
          .from("videos")
          .select("ai_summary, created_at")
          .eq("client_id", client.id)
          .not("ai_summary", "is", null)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const hasActivity = (messages && messages.length > 0) || (videos && videos.length > 0);
      if (!hasActivity) continue;

      const lines: string[] = [];
      for (const message of (messages ?? []).slice().reverse()) {
        const label = client.user_id && message.sender_id === client.user_id ? "Client" : "Coach";
        lines.push(`${label}: ${message.content}`);
      }
      for (const video of videos ?? []) {
        lines.push(`Video call summary: ${video.ai_summary}`);
      }

      const response = await anthropic.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 120,
        output_config: { effort: "low" },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: lines.join("\n") }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      const summary = textBlock && textBlock.type === "text" ? textBlock.text.trim() : null;
      if (!summary) throw new Error("Claude returned no summary text.");

      await admin
        .from("clients")
        .update({ ai_relationship_summary: summary, ai_relationship_summary_generated_at: new Date().toISOString() })
        .eq("id", client.id);

      processed++;
    } catch (error) {
      failed++;
      console.error(`generate-client-summaries failed for client ${client.id}:`, error);
    }
  }

  return NextResponse.json({ ok: true, processed, failed });
}
