"use client";

import {
  IconCircleInfoFillDuo18,
  IconPen3FillDuo18,
} from "nucleo-ui-essential-fill-duo-18";
import type { ComponentType, FormEvent } from "react";
import { useState, useTransition } from "react";
import { DiscordLogo } from "@/components/logos/discord";
import { SlackLogo } from "@/components/logos/slack";
import { Telegram } from "@/components/logos/telegram";
import { WhatsApp } from "@/components/logos/whatsapp";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OpenCodeEventType } from "@/modules/events/event-types";
import {
  saveSlackIntegration,
  testSlackIntegration,
  updateSlackEnabled,
} from "./slack-actions";
import type { SlackSettings } from "./slack-types";

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  available: boolean;
  initialSettings?: SlackSettings | null;
}

const integrations = [
  {
    name: "Slack",
    description: "Receive OpenCode session updates directly in Slack.",
    icon: SlackLogo,
    available: true,
  },
  {
    name: "Discord",
    description: "Send real-time agent activity to your Discord server.",
    icon: DiscordLogo,
    available: false,
  },
  {
    name: "WhatsApp",
    description: "Receive important agent updates directly in WhatsApp.",
    icon: WhatsApp,
    available: false,
  },
  {
    name: "Telegram",
    description: "Send real-time OpenCode session updates to Telegram.",
    icon: Telegram,
    available: false,
  },
];

const eventOptions = [
  {
    type: "assistant.completed",
    label: "Agent finished",
    description: "When an agent completes its response.",
  },
  {
    type: "question.asked",
    label: "Agent question",
    description: "When an agent needs more information.",
  },
  {
    type: "session.idle",
    label: "Session inactive",
    description: "When a session stops processing work.",
  },
  {
    type: "session.error",
    label: "Session error",
    description: "When a session stops because of an error.",
  },
  {
    type: "session.retry",
    label: "Session retry",
    description: "When a failed session step is retried.",
  },
  {
    type: "session.status.retry",
    label: "Retry scheduled",
    description: "When OpenCode schedules another attempt.",
  },
  {
    type: "tool.failed",
    label: "Tool failed",
    description: "When an agent tool cannot complete its task.",
  },
  {
    type: "permission.asked",
    label: "Permission requested",
    description: "When an agent needs your approval.",
  },
  {
    type: "todo.updated",
    label: "Task list updated",
    description: "When an agent changes its task list.",
  },
  {
    type: "command.executed",
    label: "Command executed",
    description: "When a command runs in the session.",
  },
] as const satisfies readonly {
  type: OpenCodeEventType;
  label: string;
  description: string;
}[];

type EventPreferences = Record<OpenCodeEventType, boolean>;

const defaultEventPreferences = Object.fromEntries(
  eventOptions.map(({ type }) => [type, true]),
) as EventPreferences;

function getEventPreferences(settings: SlackSettings | null) {
  if (!settings) return defaultEventPreferences;

  const enabledEventTypes = new Set(settings.eventTypes);
  return Object.fromEntries(
    eventOptions.map(({ type }) => [type, enabledEventTypes.has(type)]),
  ) as EventPreferences;
}

interface IntegrationConfigDialogProps {
  name: string;
  settings: SlackSettings | null;
  onSaved: (settings: SlackSettings) => void;
}

function IntegrationConfigDialog({
  name,
  settings,
  onSaved,
}: IntegrationConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [slackUserId, setSlackUserId] = useState(settings?.slackUserId ?? "");
  const [draft, setDraft] = useState(() => getEventPreferences(settings));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isTesting, startTesting] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSlackUserId(settings?.slackUserId ?? "");
      setDraft(getEventPreferences(settings));
      setError(null);
      setSuccess(null);
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const eventTypes = eventOptions
      .filter(({ type }) => draft[type])
      .map(({ type }) => type);

    startSaving(async () => {
      const result = await saveSlackIntegration({
        enabled: settings?.enabled ?? true,
        eventTypes,
        slackUserId,
      });

      if (result.error || !result.settings) {
        setError(result.error ?? "Unable to save Slack settings.");
        return;
      }

      onSaved(result.settings);
      setOpen(false);
    });
  }

  function handleTest() {
    setError(null);
    setSuccess(null);

    startTesting(async () => {
      const result = await testSlackIntegration(slackUserId);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(result.success ?? "Test notification sent.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" />}>
        <IconPen3FillDuo18 data-icon="inline-start" />
        Configure integration
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] min-w-xl">
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>Configure {name}</DialogTitle>
            <DialogDescription>
              Choose when you want to receive a notification.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="slack-member-id">Slack Member ID</FieldLabel>
              <Input
                id="slack-member-id"
                value={slackUserId}
                onChange={(event) =>
                  setSlackUserId(event.target.value.toUpperCase())
                }
                placeholder="U012ABCDEF"
                maxLength={32}
                autoComplete="off"
                spellCheck={false}
                required
                disabled={isSaving || isTesting}
                aria-invalid={Boolean(error)}
              />
              <FieldDescription>
                In Slack, open your profile and choose Copy member ID.
              </FieldDescription>
              {error && <FieldError>{error}</FieldError>}
              {success && (
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {success}
                </p>
              )}
            </Field>
          </FieldGroup>

          <div className="grid min-w-0 max-h-[min(60dvh,24rem)] gap-x-4 gap-y-1 overflow-y-auto sm:grid-cols-2">
            {eventOptions.map(({ type, label, description }) => (
              <div
                key={type}
                className="flex min-h-11 items-center justify-between gap-2 px-1"
              >
                <div className="flex min-w-0 items-center gap-1">
                  <span className="font-medium">{label}</span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`About ${label}`}
                        />
                      }
                    >
                      <IconCircleInfoFillDuo18 />
                    </TooltipTrigger>
                    <TooltipContent>{description}</TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  label={`Notify on ${label}`}
                  checked={draft[type]}
                  onToggle={() =>
                    setDraft((current) => ({
                      ...current,
                      [type]: !current[type],
                    }))
                  }
                  disabled={isSaving || isTesting}
                  className="shrink-0 py-3 pr-0 pl-3 [&>span:last-child]:sr-only"
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving || isTesting}
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              disabled={isSaving || isTesting || !slackUserId.trim()}
            >
              {isTesting && <Spinner data-icon="inline-start" />}
              {isTesting ? "Sending..." : "Send test"}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || isTesting || !slackUserId.trim()}
            >
              {isSaving && <Spinner data-icon="inline-start" />}
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IntegrationCard({
  name,
  description,
  icon: Icon,
  available,
  initialSettings = null,
}: IntegrationCardProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [enabled, setEnabled] = useState(initialSettings?.enabled ?? false);
  const [isUpdating, startUpdating] = useTransition();

  function handleEnabledToggle() {
    if (!settings) return;

    const nextEnabled = !enabled;
    startUpdating(async () => {
      const result = await updateSlackEnabled(nextEnabled);
      if (!result.error) {
        setEnabled(nextEnabled);
        setSettings((current) =>
          current ? { ...current, enabled: nextEnabled } : current,
        );
      }
    });
  }

  function handleSaved(nextSettings: SlackSettings) {
    setSettings(nextSettings);
    setEnabled(nextSettings.enabled);
  }

  return (
    <Card className="h-full gap-0 py-0">
      <CardHeader className="gap-x-3 gap-y-1 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border"
            aria-hidden="true"
          >
            <Icon className="size-6" />
          </div>

          <CardTitle>{name}</CardTitle>
        </div>

        <CardAction className="self-center">
          <Switch
            label={`Enable ${name} notifications`}
            checked={enabled}
            onToggle={handleEnabledToggle}
            disabled={!available || !settings || isUpdating}
            className="-m-3 [&>span:last-child]:sr-only"
          />
        </CardAction>

        <CardDescription className="col-span-1 min-h-10 leading-5">
          {description}
        </CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto px-2.5 py-1">
        {available ? (
          <IntegrationConfigDialog
            name={name}
            settings={settings}
            onSaved={handleSaved}
          />
        ) : (
          <Button variant="ghost" disabled>
            <IconPen3FillDuo18 data-icon="inline-start" />
            Configure integration
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function IntegrationsGrid({
  slackSettings,
}: {
  slackSettings: SlackSettings | null;
}) {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2"
      aria-label="Available integrations"
    >
      {integrations.map((integration) => (
        <IntegrationCard
          key={integration.name}
          {...integration}
          initialSettings={integration.name === "Slack" ? slackSettings : null}
        />
      ))}
    </section>
  );
}
