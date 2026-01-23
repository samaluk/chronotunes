"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ToggleSettingProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
}: ToggleSettingProps): React.ReactNode {
  const toggleId = `toggle-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={toggleId} className="text-sm cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={toggleId} checked={enabled} onCheckedChange={onChange} />
    </div>
  );
}
