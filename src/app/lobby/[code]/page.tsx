"use client";

import { Suspense } from "react";
import type { ReactNode } from "react";

import { LobbyLoadingScreen } from "@/components/lobby/lobby-loading-screen";

import { LobbyRoute } from "./lobby-route";

export default function LobbyPage(): ReactNode {
  return (
    <Suspense fallback={<LobbyLoadingScreen />}>
      <LobbyRoute />
    </Suspense>
  );
}
