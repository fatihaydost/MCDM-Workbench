import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '../../ui/Skeleton'

// The workbench (grid, charts, IO, calculation) is its own chunk; the landing page does not load it.
const WorkbenchPage = lazy(() => import('../workbench/WorkbenchPage'))

/** Layout-shaped placeholder while the workbench chunk loads: rail, heading, table. */
function WorkbenchSkeleton() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-label={t('workbench.loadingStage')} className="flex min-h-0 flex-1">
      <div className="hidden w-56 shrink-0 flex-col gap-3 border-r border-line px-4 py-5 md:flex">
        <Skeleton width={96} />
        <Skeleton width={120} />
        <Skeleton width={104} />
        <Skeleton width={88} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 pt-4 md:px-6">
        <Skeleton width={120} height={28} />
        <Skeleton width={360} height={32} />
        <Skeleton height={240} />
      </div>
    </div>
  )
}

/** `/app`. */
export function Workbench() {
  return (
    <Suspense fallback={<WorkbenchSkeleton />}>
      <WorkbenchPage />
    </Suspense>
  )
}
