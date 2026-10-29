import { useTranslation } from 'react-i18next'
import type { Comparison, RankingResult, WeightingResult } from '../../core'
import { useWorkbench, type DraftProblem, type RankingMethodId, type WeightMethodId } from '../../state/workbench'
import type { Verdict } from '../methods/views'
import { ReportDocument } from './report/ReportDocument'
import type { ExecutiveReportMetrics } from './report/types'

export type PrintReportProps = {
  problem: DraftProblem
  weights: WeightingResult
  result: RankingResult
  weightLabel: string
  rankingLabel: string
  rankingMethod: RankingMethodId
  weightMethod?: WeightMethodId
  verdict: Verdict | null
  includeAppendix?: boolean
  comparison?: Comparison
  metrics?: ExecutiveReportMetrics
}

export function PrintReport({
  problem,
  weights,
  result,
  weightLabel,
  rankingLabel,
  rankingMethod,
  weightMethod: providedWeightMethod,
  verdict,
  includeAppendix = false,
  comparison,
  metrics,
}: PrintReportProps) {
  const { t } = useTranslation()
  const storeWeightMethod = useWorkbench((s) => s.weightMethod)
  const weightMethod = providedWeightMethod ?? storeWeightMethod

  return (
    <article
      aria-label={t('workbench.results.print.title')}
      className="print-only hidden"
      data-testid="print-report"
    >
      <ReportDocument
        problem={problem}
        weights={weights}
        result={result}
        weightMethod={weightMethod}
        rankingMethod={rankingMethod}
        weightLabel={weightLabel}
        rankingLabel={rankingLabel}
        verdict={verdict}
        includeAppendix={includeAppendix}
        {...(comparison ? { comparison } : {})}
        {...(metrics ? { metrics } : {})}
      />
    </article>
  )
}
