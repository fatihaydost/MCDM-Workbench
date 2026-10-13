import { useId, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Problem } from '../../core'
import type { MethodContent } from '../../content/types'
import { alternativeNames, getExample, type ExampleDataset } from '../../data/examples'
import { CRITIC_IDEA_STEPS, CriticIdea } from '../../features/illustrations/CriticIdea'
import { EntropyIdea } from '../../features/illustrations/EntropyIdea'
import { IdeaSteps, useIdeaSteps, type IdeaStepsLabels } from '../../features/illustrations/IdeaSteps'
import { MethodGlyph } from '../../features/illustrations/MethodGlyph'
import { SawContributions } from '../../features/illustrations/SawContributions'
import { TOPSIS_IDEA_STEPS, TopsisGeometry } from '../../features/illustrations/TopsisGeometry'
import { VikorIdea } from '../../features/illustrations/VikorIdea'
import { useLang, useNumberFormat, type Lang } from '../../i18n'
import { WeightRange } from '../ranking/WeightRange'
import { useVikorLabels } from '../workbench/vikorLabels'

function toProblem(ex: ExampleDataset, lang: Lang): Problem {
  return { alternatives: alternativeNames(ex, lang), criteria: ex.criteria.map((c) => ({ name: c.name[lang], type: c.type })), matrix: ex.matrix }
}

/**
 * The picture at the top of a method page. TOPSIS, CRITIC, Entropy, SAW and VIKOR draw their idea on their published
 * example; every other method shows its family glyph (no illustration for methods in research yet).
 * The Entropy and SAW pictures have no step-through story yet (SAW's answers hover and focus); VIKOR's has a v slider
 * instead, since turning the threshold line is its idea.
 */
export function MethodIdea({ m }: { m: MethodContent }) {
  const { t } = useTranslation()
  const [lang] = useLang()
  const { format } = useNumberFormat(3)

  const topsisEx = m.id === 'topsis' ? getExample('opricovic-tzeng-2004-f') : undefined
  const criticEx = m.id === 'critic' ? getExample('krishnan-2021-smartphones') : undefined
  const entropyEx = m.id === 'entropy' ? getExample('zavadskas-2017-vilnius') : undefined
  const sawEx = m.id === 'saw' ? getExample('podvezko-2011-baltic') : undefined
  // VIKOR on ten alternatives, where no leader is clearly ahead, so the compromise set and the DQ line show.
  const vikorEx = m.id === 'vikor' ? getExample('keshavarz-2015-ten-alternatives') : undefined
  const problem = useMemo(() => {
    const ex = topsisEx ?? criticEx ?? entropyEx ?? sawEx ?? vikorEx
    return ex ? toProblem(ex, lang) : null
  }, [topsisEx, criticEx, entropyEx, sawEx, vikorEx, lang])

  // "Step through": one story per method, the picture transforms from step to step (MOTION.md, explain).
  const storyCount = topsisEx ? TOPSIS_IDEA_STEPS : criticEx ? CRITIC_IDEA_STEPS : 0
  const steps = useIdeaSteps(storyCount)
  const stepLabels: IdeaStepsLabels = {
    start: t('methods.page.idea.steps.start'),
    group: t('methods.page.idea.steps.group'),
    back: t('methods.page.idea.steps.back'),
    next: t('methods.page.idea.steps.next'),
    finish: t('methods.page.idea.steps.finish'),
    close: t('methods.page.idea.steps.close'),
    progress: (n, count) => t('methods.page.idea.steps.progress', { n, count }),
  }
  const topsisSentences = (['s1', 's2', 's3', 's4', 's5'] as const).map((k) => t(`methods.page.idea.topsis.steps.${k}`))
  const criticSentences = (['s1', 's2', 's3', 's4'] as const).map((k) => t(`methods.page.idea.critic.steps.${k}`))

  const source = (ex: ExampleDataset) => (
    <p className="text-12 text-text-2">{t('methods.page.idea.source', { citation: ex.name[lang] })}</p>
  )

  if (topsisEx && problem) {
    return (
      <div className="flex flex-col gap-2">
        <TopsisGeometry
          problem={problem}
          weights={topsisEx.weights ?? [0.5, 0.5]}
          format={(v) => format(v, 3)}
          labels={{
            title: t('methods.page.idea.topsis.title'),
            caption: t('methods.page.idea.topsis.caption'),
            projectionNote: t('methods.page.idea.topsis.projectionNote'),
            select: t('methods.page.idea.topsis.select'),
            point: (name, c) => t('methods.page.idea.topsis.point', { name, c }),
            viewLabel: t('methods.page.idea.topsis.view'),
            viewDistances: t('methods.page.idea.topsis.viewDistances'),
            viewCriteria: t('methods.page.idea.topsis.viewCriteria'),
            axisDPlus: t('methods.page.idea.topsis.axisDPlus'),
            axisDMinus: t('methods.page.idea.topsis.axisDMinus'),
            isoC: (c) => t('methods.page.idea.topsis.iso', { c }),
            planeCaption: t('methods.page.idea.topsis.planeCaption'),
            higherBetter: (name) => t('methods.page.idea.topsis.higherBetter', { name }),
            lowerBetter: (name) => t('methods.page.idea.topsis.lowerBetter', { name }),
            showTable: t('methods.page.idea.showTable'),
            alternative: t('methods.page.idea.alternative'),
          }}
          step={steps.step}
          explain={steps.explain}
        />
        <IdeaSteps control={steps} sentences={topsisSentences} labels={stepLabels} />
        {source(topsisEx)}
      </div>
    )
  }

  if (criticEx && problem) {
    return (
      <div className="flex flex-col gap-2">
        <CriticIdea
          problem={problem}
          format={(v) => format(v, 4)}
          labels={{
            title: t('methods.page.idea.critic.title'),
            contrast: t('methods.page.idea.critic.contrast'),
            conflict: t('methods.page.idea.critic.conflict'),
            weight: t('methods.page.idea.critic.weight'),
            information: t('methods.page.idea.critic.information'),
            weightHead: (total) => t('methods.page.idea.critic.weightHead', { total }),
            showTable: t('methods.page.idea.showTable'),
            criterion: t('methods.page.idea.criterion'),
          }}
          step={steps.step}
          explain={steps.explain}
        />
        <IdeaSteps control={steps} sentences={criticSentences} labels={stepLabels} />
        {source(criticEx)}
      </div>
    )
  }

  if (entropyEx && problem) {
    return (
      <div className="flex flex-col gap-2">
        <EntropyIdea
          problem={problem}
          format={(v) => format(v, 4)}
          labels={{
            title: t('methods.page.idea.entropy.title'),
            caption: t('methods.page.idea.entropy.caption'),
            even: t('methods.page.idea.entropy.even'),
            entropy: t('methods.page.idea.entropy.entropy'),
            weight: t('methods.page.idea.entropy.weight'),
            share: t('methods.page.idea.entropy.share'),
            showTable: t('methods.page.idea.showTable'),
            alternative: t('methods.page.idea.alternative'),
          }}
        />
        {source(entropyEx)}
      </div>
    )
  }

  if (sawEx && problem) {
    return (
      <div className="flex flex-col gap-2">
        <SawContributions
          problem={problem}
          weights={sawEx.weights ?? []}
          format={(v) => format(v, 4)}
          labels={{
            title: t('methods.page.idea.saw.title'),
            caption: t('methods.page.idea.saw.caption'),
            showTable: t('methods.page.idea.showTable'),
            alternative: t('methods.page.idea.alternative'),
            score: t('workbench.ranking.score.saw.name'),
            legend: t('workbench.visual.saw.legend'),
            others: t('workbench.visual.saw.others'),
            segment: (alternative, criterion, value, score) => t('workbench.visual.saw.segment', { alternative, criterion, value, score }),
            readout: (alternative, criterion, value, score) => t('workbench.visual.saw.readout', { alternative, criterion, value, score }),
          }}
          className="max-w-[760px]"
        />
        {source(sawEx)}
      </div>
    )
  }

  if (vikorEx && problem) return <VikorPageIdea ex={vikorEx} problem={problem} source={source(vikorEx)} />

  return (
    <div className="flex items-center gap-3 text-text-2">
      <MethodGlyph family={m.family} size={40} />
      <span className="text-14">{t(`methods.families.${m.family}`)}</span>
    </div>
  )
}

/** VIKOR on the method page: the picture with its own v slider (the page's state, not the workbench's). */
function VikorPageIdea({ ex, problem, source }: { ex: ExampleDataset; problem: Problem; source: ReactNode }) {
  const { t } = useTranslation()
  const { format } = useNumberFormat(4)
  const [v, setV] = useState(0.5)
  const id = useId()
  const labels = useVikorLabels('methods.page.idea.vikor.title')
  const vText = format(v, 2)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full max-w-[360px] flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={id} className="text-13 font-medium text-text-2">
            {t('workbench.params.vikor.v')}
          </label>
          <output htmlFor={id} className="text-14 font-semibold text-text tabular-nums" data-testid="idea-v">
            {vText}
          </output>
        </div>
        <WeightRange id={id} value={v} base={0.5} valueText={vText} onChange={setV} />
        <div className="flex justify-between gap-4 text-12 text-text-3">
          <span>{t('workbench.params.vikor.vEnds.min')}</span>
          <span className="text-right">{t('workbench.params.vikor.vEnds.max')}</span>
        </div>
      </div>
      <VikorIdea
        problem={problem}
        weights={ex.weights ?? []}
        params={{ v }}
        format={(x) => format(x, 4)}
        labels={{ ...labels, caption: t('methods.page.idea.vikor.caption'), showTable: t('methods.page.idea.showTable'), alternative: t('methods.page.idea.alternative') }}
        className="max-w-[880px]"
      />
      {source}
    </div>
  )
}
