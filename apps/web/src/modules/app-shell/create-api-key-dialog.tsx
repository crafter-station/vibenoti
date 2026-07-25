"use client";

import {
  IconCheckFillDuo18,
  IconClipboardFillDuo18,
  IconCryptographyFillDuo18,
  IconShieldCheckFillDuo18,
} from "nucleo-ui-essential-fill-duo-18";
import { type FormEvent, useState, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/modules/auth/auth-client";

export function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setApiKey(null);
      setCopied(false);
      setError(null);
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name")).trim();

    if (!name) {
      setError("Enter a name for this API key.");
      return;
    }

    startTransition(async () => {
      const { data, error: createError } = await authClient.apiKey.create({
        name,
      });

      if (createError || !data?.key) {
        setError(createError?.message || "Unable to create the API key.");
        return;
      }

      setApiKey(data.key);
    });
  }

  async function copyApiKey() {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setError(null);
    } catch {
      setError("Copy failed. Select the key and copy it manually.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" aria-label="Create API key" />
        }
      >
        <IconCryptographyFillDuo18 data-icon="inline-start" />
        <span className="hidden sm:inline">API key</span>
      </DialogTrigger>

      <DialogContent>
        {apiKey ? (
          <>
            <DialogHeader>
              <DialogTitle>API key created</DialogTitle>
              <DialogDescription>
                Use this key to authenticate the VibeNoti OpenCode plugin.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Alert>
                <IconShieldCheckFillDuo18 />
                <AlertTitle>Copy this key now</AlertTitle>
                <AlertDescription>
                  For security, VibeNoti will not show the full key again.
                </AlertDescription>
              </Alert>

              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="new-api-key">API key</FieldLabel>
                <Input
                  id="new-api-key"
                  value={apiKey}
                  readOnly
                  className="font-mono"
                  onFocus={(event) => event.currentTarget.select()}
                  aria-invalid={Boolean(error)}
                />
                <FieldDescription>
                  Set it as <code>VIBENOTI_API_KEY</code> before starting
                  OpenCode.
                </FieldDescription>
                {error && <FieldError>{error}</FieldError>}
              </Field>
            </FieldGroup>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Done
              </DialogClose>
              <Button type="button" onClick={copyApiKey}>
                {copied ? (
                  <IconCheckFillDuo18 data-icon="inline-start" />
                ) : (
                  <IconClipboardFillDuo18 data-icon="inline-start" />
                )}
                <span aria-live="polite">{copied ? "Copied" : "Copy key"}</span>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="contents">
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Give the key a recognizable name so you know where it is used.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="api-key-name">Name</FieldLabel>
                <Input
                  id="api-key-name"
                  name="name"
                  placeholder="OpenCode on MacBook"
                  maxLength={32}
                  autoComplete="off"
                  required
                  autoFocus
                  aria-invalid={Boolean(error)}
                  disabled={isPending}
                />
                <FieldDescription>
                  Up to 32 characters. You can revoke this key later.
                </FieldDescription>
                {error && <FieldError>{error}</FieldError>}
              </Field>
            </FieldGroup>

            <DialogFooter>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                  />
                }
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <IconCryptographyFillDuo18 data-icon="inline-start" />
                )}
                {isPending ? "Creating..." : "Create API key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
