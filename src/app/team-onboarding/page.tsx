import Link from "next/link";

export default function TeamOnboardingPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Welcome to Clovior
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Let&apos;s set up your workspace. Name it, add your first client, and
          send your first message.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue to dashboard
        </Link>
      </div>
    </main>
  );
}
