import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Base Skeleton Component
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/**
 * Video Card Skeleton Loader
 * Mimics the loading state of a video card in the feed
 */
export function VideoCardSkeleton() {
  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      {/* Video placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/5" />
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Bottom overlay skeleton */}
      <div className="absolute bottom-0 left-0 right-20 p-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
          <Skeleton className="h-4 w-48 bg-white/10" />
        </div>
      </div>

      {/* Interaction buttons skeleton */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
            <Skeleton className="h-3 w-8 bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Video Grid Skeleton Loader
 * For explore page grid layout
 */
export function VideoGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[9/16] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/**
 * List Skeleton Loader
 * For search results or comment lists
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-4">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact Loading Spinner
 */
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("relative w-10 h-10", className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <div className="absolute inset-0 border-4 border-primary/30 rounded-full" />
      <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full" />
    </motion.div>
  );
}
