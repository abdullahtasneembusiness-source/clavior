import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { createClient } from "@/lib/supabase/server";
import { createR2Client, publicUrlFor } from "@/lib/r2";

// Per spec: any file type is allowed, capped at 100MB. Unlike the video
// upload route (presigned PUT, no enforceable size limit — flagged in the
// security audit as a follow-up), this uses a presigned POST with a
// content-length-range condition, which R2 enforces at the storage layer
// itself: an upload over the cap is rejected by R2, not just by client-side
// UI that a direct API call could bypass.
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { workspaceId, clientId, fileName, fileType } = await request.json();

  if (!workspaceId || !clientId || !fileName || typeof fileType !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Same equivalent-gate reasoning as the video upload-url route: R2
  // uploads bypass Supabase/RLS entirely, so re-check thread access via the
  // clients SELECT policy before issuing a presigned post.
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
  const objectKey = `files/${workspaceId}/${clientId}/${randomUUID()}-${safeName}`;

  const r2 = createR2Client();
  const { url, fields } = await createPresignedPost(r2, {
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: objectKey,
    Conditions: [
      ["content-length-range", 0, MAX_FILE_SIZE_BYTES],
      ["eq", "$Content-Type", fileType],
    ],
    Fields: { "Content-Type": fileType },
    Expires: 600,
  });

  return NextResponse.json({ url, fields, publicUrl: publicUrlFor(objectKey), maxFileSizeBytes: MAX_FILE_SIZE_BYTES });
}
