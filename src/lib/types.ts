export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Client = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  assigned_member_id: string | null;
  name: string;
  email: string;
  status: "active" | "inactive";
  last_active_at: string | null;
  created_at: string;
  ai_relationship_summary: string | null;
  ai_relationship_summary_generated_at: string | null;
};

export type Message = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  sender_id: string;
  content: string;
  video_id: string | null;
  pinned_at: string | null;
  created_at: string;
};

export type Video = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  sender_id: string;
  storage_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  ai_summary: string | null;
  transcription_status: "pending" | "processing" | "complete" | "failed";
  created_at: string;
};

export type FileRow = {
  id: string;
  workspace_id: string;
  client_id: string | null;
  uploader_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_url: string;
  created_at: string;
};

export type ClientNote = {
  id: string;
  client_id: string;
  workspace_id: string;
  content: string;
  updated_at: string;
};
