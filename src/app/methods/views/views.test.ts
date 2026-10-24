import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RANKING_IDS, WEIGHTING_IDS } from '../../../core'
import { getExample } from '../../../data/examples'
import { getJudgementExample } from '../../../data/judgementExamples'
import { methodViews, RANKING_VIEW_IDS, WEIGHTING_VIEW_IDS, type ViewId } from '.'

const views = Object.entries(methodViews) as [ViewId, (typeof methodViews)[ViewId]][]

describe('method views', () => {
  it('has a view of the right kind for every core method, plus manual weights', () => {
    expect([...WEIGHTING_VIEW_IDS].sort()).toEqual([...WEIGHTING_IDS, 'manual'].sort())
    expect([...RANKING_VIEW_IDS].sort()).toEqual([...RANKING_IDS].sort())
  })

  it('draws ideas and ledger rows on published examples', () => {
    const published = (id: string) => getExample(id) ?? getJudgementExample(id)
    for (const [id, v] of views) {
      if (id !== 'manual') {
        expect(Boolean(v.idea || v.judgementIdea), `${id} idea`).toBe(true)
        expect(v.stage, `${id} stage`).toBeDefined()
      }
      if (v.idea) expect(getExample(v.idea.example), id).toBeDefined()
      if (v.judgementIdea) expect(getJudgementExample(v.judgementIdea.example), id).toBeDefined()
      if (v.ledger) expect(published(v.ledger.example), id).toBeDefined()
    }
    expect(methodViews.bwm.judgementIdea?.example).toBe('rezaei-2016-car')
    expect(methodViews.bwm.ledger?.fixture).toBe('bwm-rezaei2016-car.json#tolerance_vs_published')
  })

  it("repeats the fixture's tolerance in the landing ledger", () => {
    for (const [id, v] of views) {
      if (!v.ledger) continue
      const [file, path] = v.ledger.fixture.split('#') as [string, string]
      const json: unknown = JSON.parse(readFileSync(resolve(__dirname, '../../../../tests/fixtures', file), 'utf8'))
      const value = path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], json)
      expect(value, id).toBe(v.ledger.tolerance)
    }
  })
})
