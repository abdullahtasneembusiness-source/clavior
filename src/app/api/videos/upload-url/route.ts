import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase/server";
import { createR2Client, publicUrlFor } from "@/lib/r2";

const ALLOWED_CONTENT_TYPES = ["video/webm", "video/mp4"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { workspaceId, clientId, contentType } = await request.json();

  if (!workspaceId || !clientId || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // R2 uploads bypass Supabase entirely, so RLS can't gate them the way it
  // gates DB writes. Re-check thread access the same way the `clients`
  // select policy would: can this user read this client row at all? Every
  // actor who can insert into this client's video thread (owner, admin,
  // assigned member, or the client themself) can also read the client row,
  // so this is an equivalent gate for who gets to upload here.
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const extension = contentType === "video/mp4" ? "mp4" : "webm";
  const objectKey = `videos/${workspaceId}/${clientId}/${randomUUID()}.${extension}`;

  const r2 = createR2Client();
  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn: 600 },
  );

  return NextResponse.json({ uploadUrl, publicUrl: publicUrlFor(objectKey) });
}
