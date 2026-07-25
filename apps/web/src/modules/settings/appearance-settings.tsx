"use client";

import { useTheme } from "next-themes";
import {
  IconComputerFillDuo18,
  IconDarkLightFillDuo18,
  IconLightbulb3FillDuo18,
} from "nucleo-ui-essential-fill-duo-18";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const themes = [
  { value: "light", label: "Light", icon: IconLightbulb3FillDuo18 },
  { value: "dark", label: "Dark", icon: IconDarkLightFillDuo18 },
  { value: "system", label: "System", icon: IconComputerFillDuo18 },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose how VibeNoti looks on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ToggleGroup
          value={[theme ?? "system"]}
          onValueChange={(value) => {
            if (value[0]) setTheme(value[0]);
          }}
          variant="outline"
          spacing={2}
          aria-label="Color theme"
          className="grid w-full grid-cols-3"
        >
          {themes.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={`Use ${label.toLowerCase()} theme`}
              className="h-16 flex-col gap-1.5"
            >
              <Icon />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardContent>
    </Card>
  );
}
