"use client";

import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import type { ReactNode } from "react";

export interface JoinFormProps {
  joinCode: string;
  onCodeChange: (value: string) => void;
  onCancel: () => void;
  onJoin: () => void;
  isJoining: boolean;
  canAct: boolean;
  labels: {
    cancel: string;
    codeLabel: string;
    join: string;
    joinBusy: string;
  };
}

export function JoinForm({
  joinCode,
  onCodeChange,
  onCancel,
  onJoin,
  isJoining,
  canAct,
  labels,
}: JoinFormProps): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label className="font-medium text-foreground text-sm" htmlFor="joinCode">
          {labels.codeLabel}
        </Label>
        <div className="flex w-full items-center justify-center">
          <InputOTP
            className="w-full"
            containerClassName="w-full"
            id="joinCode"
            inputMode="text"
            maxLength={6}
            onChange={onCodeChange}
            value={joinCode}
          >
            <InputOTPGroup className="w-full">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <InputOTPSlot
                  className="aspect-square h-auto w-auto flex-1 text-3xl"
                  index={index}
                  key={index}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>
      <div className="flex justify-between gap-4">
        <Button className="h-12 flex-1" onClick={onCancel} type="button" variant={"outline"}>
          {labels.cancel}
        </Button>
        <Button
          className="h-12 flex-1"
          disabled={isJoining || !canAct}
          onClick={onJoin}
          type="button"
          variant={"default"}
        >
          {isJoining ? labels.joinBusy : labels.join}
        </Button>
      </div>
    </div>
  );
}
