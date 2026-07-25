"use client";

import { Hashvatar } from "hashvatar/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconGauge3FillDuo18,
  IconGear2FillDuo18,
  IconPlug2FillDuo18,
} from "nucleo-ui-essential-fill-duo-18";
import { TabsSubtle, TabsSubtleItem } from "@/components/ui/tabs-subtle";
import { CreateApiKeyDialog } from "./create-api-key-dialog";

const tabs = [
  { href: "/dashboard", icon: IconGauge3FillDuo18, label: "Analytics" },
  {
    href: "/integrations",
    icon: IconPlug2FillDuo18,
    label: "Integrations",
  },
  { href: "/settings", icon: IconGear2FillDuo18, label: "Settings" },
];

interface AppHeaderProps {
  avatarHash: string;
}

export function AppHeader({ avatarHash }: AppHeaderProps) {
  const pathname = usePathname();
  const selectedIndex = tabs.findIndex(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );

  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4  py-3">
      <nav aria-label="Primary navigation" className="min-w-0">
        <TabsSubtle selectedIndex={selectedIndex} className="min-w-0">
          {tabs.map((tab, index) => (
            <TabsSubtleItem
              key={tab.href}
              index={index}
              icon={tab.icon}
              label={tab.label}
              render={<Link href={tab.href} prefetch={true} />}
              nativeButton={false}
            />
          ))}
        </TabsSubtle>
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <CreateApiKeyDialog />
        <span
          className="size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-border"
          role="img"
          aria-label="User avatar"
        >
          <Hashvatar
            hash={avatarHash}
            size={32}
            mode="dither"
            className="rounded-full"
          />
        </span>
      </div>
    </header>
  );
}
