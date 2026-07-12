"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/lib/auth-actions";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";

export default function LoginPage() {
  const [state, formAction] = useActionState(signIn, null);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Clovior
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your client world, in one place.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
          />

          {state?.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}

          <SubmitButton label="Sign in" />
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
