import { createElement, isValidElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { initI18n } from '../../i18n'
import { StageCrash, StageErrorBoundary } from './StageErrorBoundary'

describe('StageErrorBoundary', () => {
  const onBack = () => {}
  const child = createElement('p', null, 'stage')

  it('renders the stage until something throws', () => {
    const b = new StageErrorBoundary({ children: child, onBack })
    expect(b.render()).toBe(child)
  })

  it('shows the short message with a way back once a render threw', () => {
    const b = new StageErrorBoundary({ children: child, onBack })
    b.state = StageErrorBoundary.getDerivedStateFromError(new Error('boom'))
    const out = b.render() as ReactElement<{ onBack: () => void }>
    expect(isValidElement(out) && out.type).toBe(StageCrash)
    expect(out.props.onBack).toBe(onBack)
  })

  it('says it in both languages, with both actions', async () => {
    const i18n = initI18n('en')
    for (const [lang, text] of [
      ['en', ['This stage could not be shown', 'Back to Data', 'Reload the page']],
      ['tr', ['Bu aşama gösterilemedi', 'Veri aşamasına dön', 'Sayfayı yenile']],
    ] as const) {
      await i18n.changeLanguage(lang)
      const html = renderToStaticMarkup(createElement(StageCrash, { onBack }))
      expect(html).toContain('role="alert"')
      for (const s of text) expect(html).toContain(s)
    }
  })
})
