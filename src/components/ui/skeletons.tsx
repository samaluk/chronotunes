import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={cn("h-32 w-full rounded-xl", className)} />
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-24 rounded-md", className)} />
}

export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 w-full", className)} />
}

export function SkeletonParagraph({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  )
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />
}

export function SkeletonPlayerCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-lg border bg-card p-3", className)}>
      <SkeletonAvatar />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function SkeletonPlayerList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonPlayerCard key={`player-${i}`} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonPlayersBar({ count = 4 }: { count?: number }) {
  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            className="flex min-w-[140px] items-center gap-2 rounded-lg border bg-card px-3 py-2"
            key={`player-bar-${i}`}
          >
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonGameHeader({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="mx-auto h-4 w-40" />
    </div>
  )
}

export function SkeletonRoundPanel({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-5 w-40" />
            <Skeleton className="mx-auto h-4 w-56" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonTimeline({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="h-6 w-32" />
      <div className="flex gap-2 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton className="h-20 w-16 flex-shrink-0 rounded-lg" key={`timeline-${i}`} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonLobbyCode({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-between gap-4 rounded-xl border bg-primary/5 p-6 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <SkeletonButton />
    </div>
  )
}

export function SkeletonBettingPanel({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="border-b bg-muted/50 px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="space-y-4 p-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton className="h-10 w-full" key={`bet-${i}`} />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export function SkeletonResults({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <div className="border-b bg-muted/50 px-4 py-3">
        <Skeleton className="mx-auto h-5 w-32" />
      </div>
      <div className="space-y-4 p-6">
        <div className="flex flex-col items-center space-y-4 py-8">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton className="h-16 w-full rounded-lg" key={`result-${i}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonPage({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-screen items-center justify-center", className)}>
      <div className="space-y-4 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <Skeleton className="mx-auto h-4 w-32" />
      </div>
    </div>
  )
}
