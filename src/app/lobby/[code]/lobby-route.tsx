"use client";

import { useParams } from "next/navigation";

import { LobbyPageContent } from "./lobby-page-content";

export function LobbyRoute() {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";

  return <LobbyPageContent code={code} />;
}
