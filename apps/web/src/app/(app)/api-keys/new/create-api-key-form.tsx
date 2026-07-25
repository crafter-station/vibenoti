"use client";

import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function CreateApiKeyForm() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      const { data, error } = await authClient.apiKey.create({ name });

      if (error || !data?.key) {
        setError(error?.message || "Unable to create the API key.");
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

  if (apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API key created</CardTitle>
          <CardDescription>
            Use this key to authenticate the VibeNoti OpenCode plugin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Alert>
              <ShieldAlert />
              <AlertTitle>Copy this key now</AlertTitle>
              <AlertDescription>
                For security, VibeNoti will not show the full key again.
              </AlertDescription>
            </Alert>

            <Field>
              <FieldLabel htmlFor="api-key">API key</FieldLabel>
              <Input
                id="api-key"
                value={apiKey}
                readOnly
                className="font-mono"
                onFocus={(event) => event.currentTarget.select()}
              />
              <FieldDescription>
                Set it as <code>VIBENOTI_API_KEY</code> before starting
                OpenCode.
              </FieldDescription>
            </Field>

            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="button" onClick={copyApiKey}>
            {copied ? (
              <Check data-icon="inline-start" />
            ) : (
              <Copy data-icon="inline-start" />
            )}
            <span aria-live="polite">{copied ? "Copied" : "Copy key"}</span>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Create API key</CardTitle>
          <CardDescription>
            Give the key a recognizable name so you know where it is used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
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
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <KeyRound data-icon="inline-start" />
            )}
            {isPending ? "Creating..." : "Create API key"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
