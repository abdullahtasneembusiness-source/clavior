import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userName = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const userEmail = user?.email ?? "";

  return (
    <div className="min-h-screen">
      <Sidebar userName={userName} userEmail={userEmail} />
      <div className="pl-[240px]">{children}</div>
    </div>
  );
}
