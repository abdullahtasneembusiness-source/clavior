import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const SUMMARY_PROMPT = `Summarize this conversation transcript in 3-5 bullet points, highlighting key topics discussed, any commitments made, and action items. Output only the bullet points, one per line, each starting with "-". No preamble, no heading.

Transcript:
`;

export async function POST(request: Request, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;

  // This is a backend job, not a user-session action — RLS deliberately has
  // no update policy for transcript/ai_summary/transcription_status (see
  // migration 0001's comment), so this must use the service-role client.
  const admin = createAdminClient();

  const { data: video } = await admin.from("videos").select("storage_url").eq("id", videoId).maybeSingle();
  if (!video) return NextResponse.json({ error: "Video not found." }, { status: 404 });

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
      throw new Error(`Deepgram request failed: ${deepgramResponse.status}`);
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
      messages: [{ role: "user", content: `${SUMMARY_PROMPT}${transcript}` }],
    });

    const summaryBlock = summaryResponse.content.find((block) => block.type === "text");
    const aiSummary = summaryBlock && summaryBlock.type === "text" ? summaryBlock.text.trim() : null;

    await admin
      .from("videos")
      .update({
        transcript,
        ai_summary: aiSummary,
        transcription_status: "complete",
      })
      .eq("id", videoId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Transcription pipeline failed", error);
    await admin.from("videos").update({ transcription_status: "failed" }).eq("id", videoId);
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
}
