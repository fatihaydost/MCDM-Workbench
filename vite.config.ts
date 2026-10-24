import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { build, searchForWorkspaceRoot, type Plugin, type Rollup } from 'vite'
import { defineConfig } from 'vitest/config'

type RouteMeta = { path: string; title: string; description: string; prerender: boolean }
type Prerender = {
  render: (lang: 'en' | 'tr', path: string) => Promise<string>
  routes: () => RouteMeta[]
  notFoundTitle: () => string
}

const escapeAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Title, description, og tags and canonical of one route in the built index.html. */
function withMeta(html: string, m: { title: string; description?: string; url?: string; noindex?: boolean }): string {
  const set = (re: RegExp, tag: string) => {
    if (!re.test(html)) throw new Error(`route meta: ${re} not found in index.html`)
    html = html.replace(re, tag)
  }
  set(/<title>[^<]*<\/title>/, `<title>${escapeAttr(m.title)}</title>`)
  set(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeAttr(m.title)}" />`)
  if (m.description !== undefined) {
    set(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeAttr(m.description)}" />`)
    set(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeAttr(m.description)}" />`)
  }
  if (m.url !== undefined) {
    set(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${m.url}" />\n    <link rel="canonical" href="${m.url}" />`)
  }
  if (m.noindex) html = html.replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>')
  return html
}

/**
 * GitHub Pages has no SPA fallback and answers an unknown path with 404.html and HTTP 404. So every
 * static route gets its own `dist/<route>/index.html` (HTTP 200, its own title, description,
 * canonical and og tags): `/`, `/app`, `/methods` and `/methods/<id>`. 404.html (the bare app with
 * a "not found" title and noindex) is left for unknown addresses; it boots the app, which shows its
 * 404 page. Assets use the absolute base path, so the copies work at any depth.
 *
 * The home page, /methods and each method page are prerendered in both languages
 * (src/app/prerender.tsx, through an SSR build of the same config): English in #root, Turkish in a
 * <template> that an inline script swaps in before the first paint when the page opens in Turkish.
 * main.tsx loads that page's chunk first and replaces the HTML with the live app. The workbench is
 * not prerendered (it shows the visitor's saved matrix); its copy preloads the workbench chunk.
 * A sitemap lists the routes.
 */
function spaFallback(): Plugin {
  let outDir = 'dist'
  let root = process.cwd()
  let base = '/'
  let isSsr = false
  let bundle: Rollup.OutputBundle | undefined
  return {
    name: 'spa-routes-and-prerender',
    apply: 'build',
    configResolved(config) {
      root = config.root
      base = config.base
      outDir = resolve(config.root, config.build.outDir)
      isSsr = !!config.build.ssr
    },
    writeBundle(_options, output) {
      bundle = output
    },
    async closeBundle() {
      if (isSsr || !bundle) return
      const index = resolve(outDir, 'index.html')
      if (!existsSync(index)) return
      const shell = readFileSync(index, 'utf8')
      const home = (JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { homepage: string }).homepage.replace(/\/?$/, '/')

      // Inside node_modules so the SSR bundle resolves react and friends; a new folder per build, so two
      // builds do not collide and a rebuild in the same process gets fresh modules. (A "?t=" query on the
      // import would load the entry twice: its own chunks import it back without the query.)
      const ssrOut = resolve(root, `node_modules/.prerender-${process.pid}-${Date.now()}`)
      await build({
        configFile: resolve(root, 'vite.config.ts'),
        // "error": the SSR build imports every method card statically (route metadata), so each dynamic
        // import of a card in load.ts would warn that it stays in the same chunk.
        logLevel: 'error',
        build: { ssr: 'src/app/prerender.tsx', outDir: ssrOut, emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'prerender.mjs' } } },
      })
      const pre = (await import(pathToFileURL(resolve(ssrOut, 'prerender.mjs')).href)) as Prerender

      writeFileSync(resolve(outDir, '404.html'), withMeta(shell, { title: pre.notFoundTitle(), noindex: true }))

      const chunks = routeChunks(bundle)
      const urls: string[] = []
      for (const r of pre.routes()) {
        const url = r.path === '/' ? home : `${home}${r.path.slice(1)}/`
        urls.push(url)
        let html = withMeta(shell, { title: r.title, description: r.description, url })
        const own = chunks(r.path)
        // The route's CSS as stylesheets, so a prerendered page paints styled (Vite's loader does not add
        // them twice). A page that is not prerendered also preloads its script, one round trip saved.
        const links = [
          ...own.css.map((f) => `<link rel="stylesheet" crossorigin href="${base}${f}">`),
          ...(r.prerender ? [] : own.js.map((f) => `<link rel="modulepreload" crossorigin href="${base}${f}">`)),
        ]
        const fresh = links.filter((l) => !html.includes(l.slice(l.indexOf('href='))))
        if (fresh.length > 0) html = html.replace('</head>', `  ${fresh.join('\n    ')}\n  </head>`)
        if (r.prerender) html = injectPrerender(html, await pre.render('en', r.path), await pre.render('tr', r.path), base, r.path)
        const file = r.path === '/' ? index : resolve(outDir, r.path.slice(1), 'index.html')
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, html)
      }
      rmSync(ssrOut, { recursive: true, force: true })

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`
      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap)
    },
  }
}

/** English markup in #root, Turkish in a template, and the script that picks one before the first paint. */
function injectPrerender(html: string, en: string, tr: string, base: string, path: string): string {
  const here = path === '/' ? [base, `${base}index.html`] : [`${base}${path.slice(1)}`, `${base}${path.slice(1)}/`, `${base}${path.slice(1)}/index.html`]
  const swap = `<script>
      // Prerendered page: Turkish markup when the page opens in Turkish, none at another address.
      ;(function () {
        var r = document.getElementById('root')
        if (${JSON.stringify(here)}.indexOf(location.pathname) < 0) r.textContent = ''
        else if (document.documentElement.lang === 'tr') r.innerHTML = document.getElementById('prerender-tr').innerHTML
      })()
    </script>`
  const out = html.replace(
    '<div id="root"></div>',
    // Charts measure their container in the browser; the server draws them at the 640 px fallback with a
    // 640 px viewBox, so they scale cleanly to their container before the app has loaded.
    `<style>#root[data-prerender] svg[width="640"] { width: 100%; height: auto; display: block; }</style>\n    ` +
      `<div id="root" data-prerender>${en}</div>\n    <template id="prerender-tr">${tr}</template>\n    ${swap}`,
  )
  if (out === html) throw new Error('prerender: <div id="root"></div> not found in index.html')
  return out
}

/**
 * The chunks a route loads first: its page chunk with its static imports (not the entry), and for a
 * method page the chunk of that method's card. Returns their JS and CSS files.
 */
function routeChunks(bundle: Rollup.OutputBundle): (path: string) => { js: string[]; css: string[] } {
  const byModule = (suffix: string) =>
    Object.values(bundle).find((c): c is Rollup.OutputChunk => c.type === 'chunk' && !!c.facadeModuleId?.endsWith(suffix))
  return (path) => {
    const pages: (Rollup.OutputChunk | undefined)[] = []
    if (path === '/') pages.push(byModule('/src/app/landing/Landing.tsx'))
    else if (path === '/app') pages.push(byModule('/src/app/workbench/WorkbenchPage.tsx'))
    else if (path === '/methods') pages.push(byModule('/src/app/methods/Catalog.tsx'))
    else pages.push(byModule('/src/app/methods/MethodPage.tsx'), byModule(`/src/content/methods/${path.split('/')[2]}.ts`))
    const js: string[] = []
    const css = new Set<string>()
    const walk = (file: string) => {
      const c = bundle[file]
      if (!c || c.type !== 'chunk' || c.isEntry || js.includes(file)) return
      js.push(file)
      c.viteMetadata?.importedCss.forEach((f) => css.add(f))
      c.imports.forEach(walk)
    }
    for (const p of pages) {
      if (!p) throw new Error(`route chunks: no page chunk for ${path}`)
      walk(p.fileName)
    }
    return { js, css: [...css] }
  }
}

/**
 * Shortens the critical path of the prerendered pages (LCP is the h1): in the built index.html, and
 * so in every route's copy, preload the Plex Sans faces of the first screen (400 lead, 500 nav and
 * buttons, 600 h1): latin always, latin-ext only when the page opens in Turkish (ğ ş İ). The route
 * copies add their own chunk CSS (spaFallback). Preloading the Landing chunk as well was measured:
 * it only competes with the CSS and fonts (LCP 2.9 s against 2.6 s in Lighthouse mobile), so
 * main.tsx loads it when it starts.
 */
function criticalPreloads(): Plugin {
  let base = '/'
  return {
    name: 'critical-preloads',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const url = (file: string) => base + file
        const font = (subset: string, weight: number) =>
          Object.keys(bundle).find((f) => new RegExp(`ibm-plex-sans-${subset}-${weight}-normal-[^/]*\\.woff2$`).test(f))
        const fonts = (subset: string) => [400, 500, 600].map((w) => font(subset, w)).filter((f): f is string => !!f).map(url)
        const chunk = (suffix: string) =>
          Object.values(bundle).find((c): c is Rollup.OutputChunk => c.type === 'chunk' && !!c.facadeModuleId?.endsWith(suffix))?.fileName
        const enChunk = chunk('/src/i18n/en.json')
        const trChunk = chunk('/src/i18n/tr.json')
        const data = JSON.stringify({
          latin: fonts('latin'),
          ext: fonts('latin-ext'),
          en: enChunk ? url(enChunk) : undefined,
          tr: trChunk ? url(trChunk) : undefined,
        })
        const script = `<script>
      // Critical preloads (vite.config.ts criticalPreloads).
      ;(function (p) {
        var h = document.head
        function add(rel, href, as) {
          var l = document.createElement('link')
          l.rel = rel
          l.href = href
          if (as) l.as = as
          if (as === 'font') { l.type = 'font/woff2'; l.crossOrigin = '' }
          else if (rel === 'modulepreload') l.crossOrigin = ''
          h.appendChild(l)
        }
        p.latin.forEach(function (f) { add('preload', f, 'font') })
        if (document.documentElement.lang === 'tr') {
          p.ext.forEach(function (f) { add('preload', f, 'font') })
          if (p.tr) add('modulepreload', p.tr)
        } else if (p.en) {
          add('modulepreload', p.en)
        }
      })(${data})
    </script>`
        // After the theme and language script, so <html lang> is already set.
        return html.replace('</head>', `  ${script}\n  </head>`)
      },
    },
  }
}

/**
 * `vite preview` answers like GitHub Pages, so the route copies can be checked locally: a route
 * without its trailing slash redirects (301) to the folder, an unknown address gets 404.html with
 * HTTP 404 (Vite's own preview would serve the home page for every path).
 */
function pagesPreview(): Plugin {
  return {
    name: 'github-pages-preview',
    configurePreviewServer(server) {
      const dist = resolve(server.config.root, server.config.build.outDir)
      const base = server.config.base
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const path = decodeURIComponent(url.pathname)
        if (!path.startsWith(base)) return next()
        const rel = path.slice(base.length)
        if (rel === '' || /\.[a-z0-9]+$/i.test(rel)) return next() // the home page and files
        const folder = existsSync(resolve(dist, rel, 'index.html'))
        if (folder && !rel.endsWith('/')) {
          res.statusCode = 301
          res.setHeader('Location', `${path}/${url.search}`)
          res.end()
          return
        }
        if (folder) return next()
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(resolve(dist, '404.html')))
      })
    },
  }
}

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages project site for the build and `vite preview`, root in dev.
  base: command === 'build' || isPreview ? '/MCDM-Workbench/' : '/',
  plugins: [react(), tailwindcss(), criticalPreloads(), spaFallback(), pagesPreview()],
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), realpathSync(resolve(process.cwd(), 'node_modules'))],
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
  },
}))
