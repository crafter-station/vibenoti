"use client";

import {
  IconCircleInfoFillDuo18,
  IconPen3FillDuo18,
} from "nucleo-ui-essential-fill-duo-18";
import type { ComponentType } from "react";
import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IntegrationCardProps {
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  available: boolean;
}

const integrations = [
  {
    name: "Slack",
    description: "Receive OpenCode session updates directly in Slack channels.",
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
] as const;

type EventType = (typeof eventOptions)[number]["type"];
type EventPreferences = Record<EventType, boolean>;

const defaultEventPreferences = Object.fromEntries(
  eventOptions.map(({ type }) => [type, true]),
) as EventPreferences;

function IntegrationConfigDialog({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(defaultEventPreferences);
  const [draft, setDraft] = useState(defaultEventPreferences);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(preferences);
    }
    setOpen(nextOpen);
  }

  function handleSave() {
    setPreferences(draft);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" />}>
        <IconPen3FillDuo18 data-icon="inline-start" />
        Configure integration
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] min-w-xl">
        <DialogHeader>
          <DialogTitle>Configure {name}</DialogTitle>
          <DialogDescription>
            Choose when you want to receive a notification.
          </DialogDescription>
        </DialogHeader>

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
                className="shrink-0 py-3 pr-0 pl-3 [&>span:last-child]:sr-only"
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IntegrationCard({
  name,
  description,
  icon: Icon,
  available,
}: IntegrationCardProps) {
  const [enabled, setEnabled] = useState(available);

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
            onToggle={() => setEnabled((current) => !current)}
            disabled={!available}
            className="-m-3 [&>span:last-child]:sr-only"
          />
        </CardAction>

        <CardDescription className="col-span-1 min-h-10 leading-5">
          {description}
        </CardDescription>
      </CardHeader>

      <CardFooter className="mt-auto px-2.5 py-1">
        {available ? (
          <IntegrationConfigDialog name={name} />
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

export function IntegrationsGrid() {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2"
      aria-label="Available integrations"
    >
      {integrations.map((integration) => (
        <IntegrationCard key={integration.name} {...integration} />
      ))}
    </section>
  );
}
