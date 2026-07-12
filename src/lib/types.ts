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
};
