import { ArrowRight, CaretDown, CaretUp } from '@phosphor-icons/react'
import { lazy, Suspense, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MethodWarning, Step, ValidationIssue } from '../../core'
import { hasErrors } from '../../core'
import { useNumberFormat } from '../../i18n'
import type { DraftProblem, Stage } from '../../state/workbench'
import { Button, cn, Notice, Skeleton } from '../../ui'
import { useWorkbenchNav } from './nav'
import { alternativeName, criterionName, placeIssue, tr, type PlacedIssue } from './shared'

// KaTeX lives in this chunk; it loads the first time a calculation is shown.
const WorkedCalculation = lazy(() => import('./WorkedCalculation'))

export type CalcGroup = { title?: string | undefined; steps: readonly Step[] }

/** Layout-shaped placeholder for the calculation while its chunk loads. */
export function CalculationSkeleton({ blocks = 2 }: { blocks?: number }) {
  const { t } = useTranslation()
  return (
    <div role="status" aria-label={t('workbench.calc.loading')} className="flex flex-col gap-8">
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 border-l border-line pl-5">
          <Skeleton width="60%" height={20} />
          <Skeleton width={260} height={40} />
          <Skeleton width="100%" height={160} />
        </div>
      ))}
    </div>
  )
}

/** The worked calculation, loaded on demand. */
export function Calculation(props: { groups: readonly CalcGroup[]; problem: DraftProblem; headingLevel?: 'h3' | 'h4' }) {
  return (
    <Suspense fallback={<CalculationSkeleton />}>
      <WorkedCalculation {...props} />
    </Suspense>
  )
}

/** "Show the calculation" disclosure used on the Weights and Ranking stages. */
export function CalculationToggle({
  groups,
  problem,
  headingLevel = 'h3',
}: {
  groups: readonly CalcGroup[]
  problem: DraftProblem
  headingLevel?: 'h3' | 'h4'
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const regionId = useId()
  return (
    <section className="no-print flex flex-col gap-4">
      <div>
        <Button
          aria-expanded={open}
          aria-controls={regionId}
          icon={open ? <CaretUp aria-hidden /> : <CaretDown aria-hidden />}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? t('workbench.weights.hideCalculation') : t('workbench.weights.showCalculation')}
        </Button>
      </div>
      <div id={regionId} hidden={!open}>
        {open && <Calculation groups={groups} problem={problem} headingLevel={headingLevel} />}
      </div>
    </section>
  )
}

export function SectionTitle({ children, as: H = 'h2', className }: { children: ReactNode; as?: 'h2' | 'h3'; className?: string }) {
  return <H className={cn('text-16 font-semibold text-text', className)}>{children}</H>
}

/** Primary "Continue to ..." at the end of a stage. */
export function ContinueBar({ to, onContinue, children }: { to: Exclude<Stage, 'data'>; onContinue: () => void; children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="no-print flex flex-wrap items-center gap-3 border-t border-line pt-4">
      <Button variant="primary" iconEnd={<ArrowRight aria-hidden />} onClick={onContinue}>
        {t(`workbench.continue.${to}`)}
      </Button>
      {children}
    </div>
  )
}

const MAX_LISTED = 5

/**
 * A later stage that cannot compute yet: which problems block it, each a link that opens the
 * stage where it is fixed and focuses the control.
 */
export function BlockedByIssues({ issues, problem }: { issues: readonly ValidationIssue[]; problem: DraftProblem }) {
  const { t } = useTranslation()
  const nf = useNumberFormat()
  const { goTo, setAttempted } = useWorkbenchNav()
  const placed = issues.filter((x) => x.severity === 'error').map((x) => placeIssue(x, problem, t, nf.format))
  const groups: { stage: Stage; items: PlacedIssue[] }[] = []
  for (const stage of ['data', 'weights', 'ranking'] as const) {
    const items = placed.filter((p) => p.stage === stage)
    if (items.length > 0) groups.push({ stage, items })
  }
  if (groups.length === 0) return null

  const open = (p: PlacedIssue) => {
    setAttempted(p.stage, true)
    goTo(p.stage, p.targetId)
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ stage, items }) => (
        <Notice
          key={stage}
          tone="danger"
          title={
            stage === 'data'
              ? t('workbench.issues.dataTitle')
              : stage === 'weights'
                ? t('workbench.issues.weightsTitle')
                : t('workbench.issues.rankingTitle')
          }
        >
          <ul className="mt-1 flex flex-col gap-1">
            {items.slice(0, MAX_LISTED).map((p, k) => (
              <li key={`${p.targetId}-${k}`}>
                <button
                  type="button"
                  className="text-left text-14 font-medium text-danger underline underline-offset-2 hover:no-underline"
                  onClick={() => open(p)}
                >
                  {p.message}
                </button>
              </li>
            ))}
            {items.length > MAX_LISTED && (
              <li className="text-13 text-text-2">{t('workbench.issues.more', { count: items.length - MAX_LISTED })}</li>
            )}
          </ul>
          <div className="mt-2">
            <Button size="sm" onClick={() => open(items[0]!)}>
              {stage === 'data'
                ? t('workbench.issues.goToData')
                : stage === 'weights'
                  ? t('workbench.issues.goToWeights')
                  : t('workbench.issues.goToRanking')}
            </Button>
          </div>
        </Notice>
      ))}
    </div>
  )
}

/** Non-blocking method warnings (core MethodWarning codes), one line each. */
export function MethodWarnings({ warnings, problem }: { warnings: readonly MethodWarning[] | undefined; problem: DraftProblem }) {
  const { t } = useTranslation()
  if (!warnings || warnings.length === 0) return null
  return (
    <Notice tone="warning">
      <ul className="flex flex-col gap-1 text-text">
        {warnings.map((w, k) => {
          const code = w.code === 'ahp.inconsistent' && w.col !== undefined ? 'ahp.inconsistent-criterion' : w.code
          return (
            <li key={`${w.code}-${k}`}>
              {tr(t, `warnings.${code}`, {
                alternative: w.row !== undefined ? alternativeName(problem, w.row, t) : '',
                criterion: w.col !== undefined ? criterionName(problem.criteria, w.col, t) : '',
                ...(w.extra ?? {}),
              })}
            </li>
          )
        })}
      </ul>
    </Notice>
  )
}

/** True when the issues contain a blocking error. Re-exported for the stages. */
export const blocked = (issues: readonly ValidationIssue[]) => hasErrors([...issues])
