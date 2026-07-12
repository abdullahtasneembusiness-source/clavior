export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent you a confirmation link. Click it to activate your account,
          then sign in.
        </p>
      </div>
    </main>
  );
}
