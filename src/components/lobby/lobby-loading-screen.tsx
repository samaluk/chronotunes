"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { LobbyHeader } from "@/components/lobby/lobby-header";
import { SkeletonLobbyCode, SkeletonPlayerList } from "@/components/ui/skeletons";

export function LobbyLoadingScreen(): ReactNode {
  const t = useTranslations("lobby");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <LobbyHeader subtitle={t("subtitle")} title={t("title")} />
          </div>
        </div>
      </header>
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <SkeletonLobbyCode />
          <SkeletonPlayerList count={4} />
        </div>
      </main>
    </div>
  );
}
