import { Printer } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog, DialogClose, DialogContent } from '../../../ui'
import { ReportDocument } from './ReportDocument'
import type { ReportDocumentProps } from './types'

export type ReportPreviewModalProps = ReportDocumentProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
  onIncludeAppendixChange: (next: boolean) => void
  onPrint: () => void
}

export function ReportPreviewModal({
  open,
  onOpenChange,
  includeAppendix = false,
  onIncludeAppendixChange,
  onPrint,
  ...docProps
}: ReportPreviewModalProps) {
  const { t } = useTranslation()
  const m = docProps.problem.alternatives.length
  const n = docProps.problem.criteria.length
  const recommendAppendix = m > 8 || n > 8

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="report-preview-modal"
        width="lg"
        title={t('workbench.results.print.modalTitle')}
        description={t('workbench.results.print.modalDescription')}
        className="no-print !max-w-[960px]"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-13 text-text select-none">
              <input
                type="checkbox"
                checked={includeAppendix}
                onChange={(e) => onIncludeAppendixChange(e.target.checked)}
                className="h-4 w-4 rounded-control border border-line-strong accent-[var(--accent)]"
                data-testid="report-appendix-toggle"
              />
              <span>{t('workbench.results.print.includeAppendix')}</span>
              {recommendAppendix && (
                <span className="num rounded-control border border-line-strong bg-surface-2 px-1.5 py-0.5 text-12 font-medium text-text-2">
                  {t('workbench.results.print.appendixRecommended', { m, n })}
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button variant="ghost">{t('common.actions.close')}</Button>
              </DialogClose>
              <Button
                variant="primary"
                icon={<Printer aria-hidden />}
                onClick={onPrint}
                data-testid="report-confirm-print"
              >
                {t('workbench.results.print.printAction')}
              </Button>
            </div>
          </div>
        }
      >
        <div
          className="report-preview-stage flex flex-col items-center overflow-x-auto rounded-control border border-line bg-surface-2 p-4 sm:p-6"
          data-testid="report-preview-stage"
        >
          <ReportDocument {...docProps} includeAppendix={includeAppendix} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
