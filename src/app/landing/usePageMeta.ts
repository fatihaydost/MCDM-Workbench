import { useEffect } from 'react'

const META = [
  ['name', 'description', 'description'],
  ['property', 'og:title', 'title'],
  ['property', 'og:description', 'description'],
] as const

/** Sets a <meta> and returns its previous content (null when it did not exist). */
function setMeta(attr: 'name' | 'property', key: string, content: string): string | null {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  const prev = el ? el.content : null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
  return prev
}

/**
 * Page title and description for the current route and language. App sets the default title in a
 * layout effect, which runs before this passive effect, so the page's own title wins. Leaving the
 * page puts the previous values back, so the workbench does not keep a method page's title.
 */
export function usePageMeta(title: string, description: string): void {
  useEffect(() => {
    const prevTitle = document.title
    const values = { title, description }
    const prev = META.map(([attr, key, field]) => [attr, key, setMeta(attr, key, values[field])] as const)
    document.title = title
    return () => {
      document.title = prevTitle
      for (const [attr, key, content] of prev) if (content !== null) setMeta(attr, key, content)
    }
  }, [title, description])
}

/** Underlined text link in the body copy (with comfortable vertical tap padding on small touch screens). */
export const textLink = 'underline decoration-line-strong underline-offset-2 transition-colors hover:decoration-text max-sm:inline-block max-sm:py-1'
