import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { avatarColorFor, initialsFor } from "@/lib/dashboard-utils";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, email")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) notFound();

  return (
    <main className="flex flex-1 flex-col px-8 py-8">
      <div className="flex items-center gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
          style={{ background: avatarColorFor(client.name) }}
        >
          {initialsFor(client.name)}
        </span>
        <div>
          <h1 className="text-xl font-semibold text-white">{client.name}</h1>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </div>
      </div>

      <div className="card mt-8 flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Messages, videos, and files for this client will live here.
        </p>
      </div>
    </main>
  );
}
