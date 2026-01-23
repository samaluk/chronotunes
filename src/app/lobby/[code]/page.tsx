"use client"

import { useParams } from "next/navigation"
import type { ReactNode } from "react"
import { LobbyPageContent } from "./LobbyPageContent"

export default function LobbyPage(): ReactNode {
  const params = useParams()
  const code = typeof params.code === "string" ? params.code.toUpperCase() : ""

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">Invalid lobby code</p>
        </div>
      </div>
    )
  }

  return <LobbyPageContent code={code} />
}
