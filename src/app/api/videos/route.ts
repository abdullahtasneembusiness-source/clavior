import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { workspaceId, clientId, storageUrl, durationSeconds } = await request.json();

  if (!workspaceId || !clientId || !storageUrl) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // RLS enforces sender_id = auth.uid() and thread access on both inserts —
  // no manual authorization check needed here, unlike the upload-url route.
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      sender_id: user.id,
      storage_url: storageUrl,
      duration_seconds: durationSeconds ?? null,
    })
    .select("*")
    .single();

  if (videoError || !video) {
    return NextResponse.json({ error: "Could not save video." }, { status: 500 });
  }

  const { error: messageError } = await supabase.from("messages").insert({
    workspace_id: workspaceId,
    client_id: clientId,
    sender_id: user.id,
    content: "Sent a video",
    video_id: video.id,
  });

  if (messageError) {
    return NextResponse.json({ error: "Video saved, but the message failed to send." }, { status: 500 });
  }

  return NextResponse.json({ video });
}
