import Link from "next/link";

export default function ClientsIndexPage() {
  return (
    <main className="flex flex-1 flex-col px-8 py-8">
      <h1 className="text-xl font-semibold text-white">Clients</h1>
      <div className="card mt-6 flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <p className="text-sm text-muted-foreground">
            A dedicated client list and filters are coming soon.
          </p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
