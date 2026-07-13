import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SYSTEM_PROMPT =
  "You are an assistant helping an online business coach understand their client relationships. " +
  "Analyze this conversation transcript and provide: " +
  "1. A 2-3 sentence summary of what was discussed " +
  "2. Any commitments or promises made by either party " +
  "3. Action items for the coach " +
  "4. Overall sentiment of the client — positive, neutral, or needs attention. " +
  "Be concise and practical. Format as clean bullet points.";

export async function POST(request: Request) {
  const { video_id: videoId } = await request.json();
  if (!videoId) return NextResponse.json({ error: "video_id is required." }, { status: 400 });

  // Found in security audit: this route previously had no auth check at
  // all and went straight to the admin client — anyone who obtained any
  // video's UUID could trigger (and make us pay Deepgram/Claude for)
  // reprocessing on a video from a workspace they have no relationship to.
  // Require a session, and confirm they can actually see this video under
  // their own RLS-scoped read before touching anything with elevated
  // privileges — reuses the videos SELECT policy (owner/admin/assigned
  // member/client-self) as the single source of truth for "does this
  // person have any business triggering this video's processing."
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: authorizedVideo } = await supabase.from("videos").select("id").eq("id", videoId).maybeSingle();
  if (!authorizedVideo) return NextResponse.json({ error: "Video not found." }, { status: 404 });

  // From here on this is a backend job, not a user-session action — RLS
  // deliberately has no update policy for transcript/ai_summary/
  // transcription_status (see migration 0001's comment), so writing the
  // result requires the service-role client. Authorization was already
  // established above via the session-scoped read.
  const admin = createAdminClient();

  const { data: video } = await admin
    .from("videos")
    .select("storage_url, transcription_status")
    .eq("id", videoId)
    .maybeSingle();

  if (!video) return NextResponse.json({ error: "Video not found." }, { status: 404 });

  // Idempotency guard: a video already processing/complete shouldn't be
  // reprocessed just because this route got called again (e.g. a retried
  // client request) — that would burn Deepgram/Claude spend for nothing.
  // "failed" is allowed through so a genuine failure can be retried.
  if (video.transcription_status !== "pending" && video.transcription_status !== "failed") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await admin.from("videos").update({ transcription_status: "processing" }).eq("id", videoId);

  try {
    const deepgramResponse = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: video.storage_url }),
      },
    );

    if (!deepgramResponse.ok) {
      throw new Error(`Deepgram request failed: ${deepgramResponse.status} ${await deepgramResponse.text()}`);
    }

    const deepgramResult = await deepgramResponse.json();
    const transcript: string | undefined =
      deepgramResult?.results?.channels?.[0]?.alternatives?.[0]?.transcript;

    if (!transcript) {
      throw new Error("Deepgram returned no transcript.");
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const summaryResponse = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 512,
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: transcript }],
    });

    const summaryBlock = summaryResponse.content.find((block) => block.type === "text");
    const aiSummary = summaryBlock && summaryBlock.type === "text" ? summaryBlock.text.trim() : null;

    if (!aiSummary) {
      throw new Error("Claude returned no summary text.");
    }

    await admin
      .from("videos")
      .update({ transcript, ai_summary: aiSummary, transcription_status: "complete" })
      .eq("id", videoId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`process-video failed for video ${videoId}:`, error);
    await admin.from("videos").update({ transcription_status: "failed" }).eq("id", videoId);
    return NextResponse.json({ error: "Video processing failed." }, { status: 500 });
  }
}
