"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ToggleSettingProps {
  description: string;
  enabled: boolean;
  label: string;
  onChange: (value: boolean) => void;
}

export function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
}: ToggleSettingProps): React.ReactNode {
  const toggleId = `toggle-${label.replaceAll(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label className="cursor-pointer text-sm" htmlFor={toggleId}>
          {label}
        </Label>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch checked={enabled} id={toggleId} onCheckedChange={onChange} />
    </div>
  );
}
