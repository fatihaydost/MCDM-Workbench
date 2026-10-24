import './styles/app.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App, preloadRoute, ROUTER_BASE } from './app/App'
import { detectLanguage, initI18n, loadLanguage } from './i18n'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

const lang = detectLanguage()
const start = () => {
  initI18n(lang)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// The home page, /methods and the method pages arrive prerendered (vite.config.ts). Load the active
// language and the page's chunk (and a method's card) first, so React's first commit replaces that HTML
// with the same page instead of a blank loading frame.
const path = location.pathname.slice(ROUTER_BASE.length) || '/'
const ready = root.hasChildNodes() ? Promise.all([loadLanguage(lang), preloadRoute(path)]) : loadLanguage(lang)
ready.then(start, start)
