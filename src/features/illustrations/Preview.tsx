/**
 * Development page for the method illustrations (/dev/illustrations, dev builds only).
 * English defaults and real example data; the product pages pass translated labels.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { critic } from '../../core/methods/critic'
import type { Problem } from '../../core/types'
import { examples } from '../../data/examples'
import type { MethodFamily } from '../../content/types'
import { CriticIdea } from './CriticIdea'
import { EmptyMatrixHint } from './EmptyMatrixHint'
import { critic as criticSteps } from '../../content/steps/critic'
import { topsis as topsisSteps } from '../../content/steps/topsis'
import { MethodGlyph } from './MethodGlyph'
import { PipelineDiagram, type PipelineStage } from './PipelineDiagram'
import { StepFlow } from './StepFlow'
import { TopsisGeometry } from './TopsisGeometry'

const problemOf = (id: string): Problem => {
  const x = examples.find((e) => e.id === id)
  if (!x) throw new Error(id)
  return { alternatives: [...x.alternatives], criteria: x.criteria.map((c) => ({ name: c.name.en, type: c.type })), matrix: x.matrix.map((r) => [...r]) }
}

const f3 = (v: number) => v.toFixed(3)
const f4 = (v: number) => v.toFixed(4)

const TOPSIS_LABELS = ['Normalize', 'Weight', 'Ideal points', 'Distances', 'Closeness']
const CRITIC_LABELS = ['Normalize', 'Contrast', 'Correlation', 'Information', 'Weights']

const FAMILIES: { family: MethodFamily; name: string }[] = [
  { family: 'weighting-objective', name: 'Objective weights' },
  { family: 'weighting-subjective', name: 'Subjective weights' },
  { family: 'ranking-distance', name: 'Distance' },
  { family: 'ranking-utility', name: 'Utility' },
  { family: 'ranking-ratio', name: 'Ratio' },
  { family: 'ranking-outranking', name: 'Outranking' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-8">
      <h2 className="mb-4 text-14 font-semibold text-text">{title}</h2>
      {children}
    </section>
  )
}

export default function IllustrationsPreview() {
  const climbing = useMemo(() => problemOf('opricovic-tzeng-2004-f'), [])
  const climbingPhi = useMemo(() => problemOf('opricovic-tzeng-2004-phi'), [])
  const phones = useMemo(() => problemOf('krishnan-2021-smartphones'), [])
  const phoneWeights = useMemo(() => critic.compute(phones, {}).weights, [phones])
  const half = useMemo(() => [0.5, 0.5], [])
  const [stage, setStage] = useState<PipelineStage>('weights')
  const [topsisStep, setTopsisStep] = useState('topsis.idealBest')
  const [criticStep, setCriticStep] = useState('critic.sigma')

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] px-4 pb-24 outline-none md:px-8">
      <h1 className="pt-8 pb-2 text-20 font-semibold text-text">Illustrations</h1>

      <Section title="PipelineDiagram">
        <div className="mb-4 flex flex-wrap gap-2 text-13">
          {(['data', 'weights', 'ranking', 'results'] as const).map((k) => (
            <button
              key={k}
              type="button"
              className={`rounded-control border px-2 py-1 ${stage === k ? 'border-accent text-accent' : 'border-line-strong text-text-2'}`}
              onClick={() => setStage(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <PipelineDiagram active={stage} methods={{ weights: 'CRITIC', ranking: 'TOPSIS' }} weights={phoneWeights} />
        <div className="mt-8 w-[224px]">
          <PipelineDiagram active={stage} methods={{ weights: 'CRITIC', ranking: 'TOPSIS' }} showRobustness={false} />
        </div>
      </Section>

      <Section title="TopsisGeometry">
        <div className="grid gap-12 lg:grid-cols-2">
          <TopsisGeometry problem={climbing} weights={half} format={f3} />
          <TopsisGeometry problem={climbingPhi} weights={half} format={f3} />
        </div>
        <div className="mt-12 max-w-[760px]">
          <TopsisGeometry problem={phones} weights={phoneWeights} format={f4} />
        </div>
      </Section>

      <Section title="CriticIdea">
        <div className="max-w-[760px]">
          <CriticIdea problem={phones} format={f4} labels={{ caption: 'A criterion that varies a lot and disagrees with the others carries more information.' }} />
        </div>
      </Section>

      <Section title="StepFlow">
        <div className="flex max-w-[760px] flex-col gap-8">
          <StepFlow steps={topsisSteps.flow.map((n, i) => ({ ...n, label: TOPSIS_LABELS[i]! }))} active={topsisStep} onSelect={setTopsisStep} />
          <StepFlow steps={criticSteps.flow.map((n, i) => ({ ...n, label: CRITIC_LABELS[i]! }))} active={criticStep} onSelect={setCriticStep} />
        </div>
      </Section>

      <Section title="MethodGlyph">
        <div className="flex flex-col gap-3">
          {[16, 20, 32].map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-6 text-text-2">
              <span className="w-10 text-12 text-text-3">{size}px</span>
              {FAMILIES.map((f) => (
                <span key={f.family} className="inline-flex items-center gap-2 text-13">
                  <MethodGlyph family={f.family} size={size} />
                  {size === 20 ? f.name : null}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section title="EmptyMatrixHint">
        <EmptyMatrixHint />
      </Section>
    </main>
  )
}
