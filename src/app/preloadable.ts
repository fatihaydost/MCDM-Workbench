import { lazy, type ComponentType } from 'react'

export type PageModule<P> = { default: ComponentType<P> }

/**
 * `lazy()` for a chunk that can also be loaded ahead (`preload`). Once loaded, lazy() gets a thenable that resolves
 * synchronously, so React renders the component in its first commit instead of a fallback. main.tsx relies on it to
 * replace a prerendered page (vite.config.ts) without a blank frame; the build-time prerender relies on it to render
 * at all. Pages (App.tsx) and method pictures (src/app/methods/views) use it.
 */
export function preloadable<P>(load: () => Promise<PageModule<P>>) {
  let mod: PageModule<P> | undefined
  const preload = (): Promise<PageModule<P>> => load().then((m) => (mod = m))
  const Component = lazy(() =>
    mod ? ({ then: (resolve: (m: PageModule<P>) => void) => resolve(mod!) } as unknown as Promise<PageModule<P>>) : preload(),
  )
  return { Component, preload }
}

export type Preloadable<P> = ReturnType<typeof preloadable<P>>
