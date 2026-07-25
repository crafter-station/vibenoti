import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CreateApiKeyForm } from "./create-api-key-form";

export default function NewApiKeyPage() {
  return (
    <main className="min-h-dvh bg-muted/30 px-4 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-fit",
          )}
        >
          <ArrowLeft data-icon="inline-start" />
          Dashboard
        </Link>

        <header className="flex flex-col gap-3">
          <KeyRound className="text-muted-foreground" aria-hidden />
          <div className="flex flex-col gap-2">
            <h1 className="text-balance text-3xl font-semibold tracking-tight">
              Connect a new client
            </h1>
            <p className="max-w-lg text-pretty text-muted-foreground">
              Create a personal API key for OpenCode. Each key is stored hashed
              and receives only permission to send events.
            </p>
          </div>
        </header>

        <CreateApiKeyForm />
      </div>
    </main>
  );
}
