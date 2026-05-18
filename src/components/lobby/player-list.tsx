"use client"

import { useQuery } from "convex/react"
import { useSessionId } from "convex-helpers/react/sessions"
import { Crown, User } from "lucide-react"
import { useTranslations } from "next-intl"
import { SkeletonPlayerList } from "@/components/ui/skeletons"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface PlayerListProps {
  lobbyId: Id<"lobbies">
}

interface Player {
  _creationTime: number
  _id: Id<"players">
  coins: number
  displayName: string
  isHost: boolean
  lobbyId: Id<"lobbies">
  sessionId: string
}

export function PlayerList({ lobbyId }: PlayerListProps): React.ReactNode {
  const t = useTranslations("players")
  const tCommon = useTranslations("common")
  const [currentSessionId] = useSessionId()

  const players = useQuery(api.players.list, { lobbyId })

  if (players === undefined) {
    return <SkeletonPlayerList count={4} />
  }

  if (players.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">{t("noPlayers")}</div>
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg">
        {t("title")} ({players.length})
      </h3>
      <div className="grid gap-2">
        {players.map((player: Player) => {
          const isCurrentUser = player.sessionId === currentSessionId
          return (
            <div
              className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors"
              key={player._id}
            >
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <span className="absolute -right-0.5 -bottom-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">
                    {player.displayName}
                    {isCurrentUser && (
                      <span className="ml-2 text-muted-foreground text-xs">{tCommon("you")}</span>
                    )}
                  </span>
                  {player.isHost && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
                      <Crown className="h-3 w-3" />
                      {t("host")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
