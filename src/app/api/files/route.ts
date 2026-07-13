import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { workspaceId, clientId, storageUrl, fileName, fileSize, fileType } = await request.json();

  if (!workspaceId || !clientId || !storageUrl || !fileName || !fileSize || !fileType) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // RLS enforces uploader_id = auth.uid() and thread access on insert — no
  // manual authorization check needed here, same as the videos route.
  const { data: file, error } = await supabase
    .from("files")
    .insert({
      workspace_id: workspaceId,
      client_id: clientId,
      uploader_id: user.id,
      storage_url: storageUrl,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
    })
    .select("*")
    .single();

  if (error || !file) {
    return NextResponse.json({ error: "Could not save file." }, { status: 500 });
  }

  return NextResponse.json({ file });
}
