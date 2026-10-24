import type { CSSProperties } from 'react'
import { cn } from './cn'

export type SkeletonProps = {
  /** CSS width (number = px). Default 100%. */
  width?: number | string | undefined
  /** CSS height (number = px). Default 16. */
  height?: number | string | undefined
  className?: string | undefined
}

/**
 * Static placeholder block shaped like the content it replaces. No shimmer or pulse (motion is
 * only for state change); size it so nothing shifts when the content arrives.
 */
export function Skeleton({ width = '100%', height = 16, className }: SkeletonProps) {
  const style: CSSProperties = { width, height }
  return <span aria-hidden className={cn('block max-w-full rounded-control bg-surface-2', className)} style={style} />
}
