import { SidebarSimple } from '@phosphor-icons/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { STAGES, type Stage } from '../../state/workbench'
import { Button, cn, Dialog, DialogContent, DialogTrigger, SegmentedControl } from '../../ui'

/** True at >= 1280 px, where the explanation panel is a fixed right column. */
function useWide(): boolean {
  const query = '(min-width: 1280px)'
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export type WorkbenchLayoutProps = {
  stage: Stage
  onStageChange: (stage: Stage) => void
  /** Optional short status per stage shown under its name in the rail (e.g. "5 x 5"). */
  stageMeta?: Partial<Record<Stage, ReactNode>> | undefined
  /** Content of the explanation panel (method notes, formula, sources) for the current stage. */
  explanation: ReactNode
  /** Main column: the grid or table of the current stage. */
  children: ReactNode
}

/**
 * Workbench frame from DESIGN.md §Layout:
 * - >= 1280 px: rail 224 px | main | explanation 320 px.
 * - 768 to 1279 px: rail | main; the explanation opens as a bottom sheet.
 * - < 768 px: stages become a segmented control above main; explanation is a bottom sheet.
 * The bottom sheet is a modal dialog (closed by default): focus moves into it and stays there,
 * Escape closes it and focus returns to its button, so it never covers the focused control.
 * The stage heading sits inside `<main>`, so the skip link lands on it.
 * Main never makes the page scroll sideways; wide content scrolls inside its own container.
 */
export function WorkbenchLayout({ stage, onStageChange, stageMeta, explanation, children }: WorkbenchLayoutProps) {
  const { t } = useTranslation()
  const wide = useWide()
  const [sheetOpen, setSheetOpen] = useState(false)
  // Six stages do not fit a phone: the switcher scrolls inside its bar, and the open stage is kept in view.
  const switcher = useRef<HTMLElement>(null)
  useEffect(() => {
    // scrollLeft, not scrollIntoView: that would move the keyboard's starting point away from the skip link.
    const nav = switcher.current
    const on = nav?.querySelector<HTMLElement>('[data-state="on"]')
    if (nav && on) nav.scrollLeft = on.offsetLeft + on.offsetWidth - nav.clientWidth + 16
  }, [stage])
  // The sheet only exists below 1280 px; widening the window closes it.
  useEffect(() => {
    if (wide) setSheetOpen(false)
  }, [wide])
  const stageLabel = (s: Stage) => t(`workbench.stages.${s}`)

  return (
    <div className="flex min-h-0 flex-1">
      {/* Rail, md and up */}
      <nav
        aria-label={t('workbench.stagesLabel')}
        className="hidden w-56 shrink-0 flex-col border-r border-line py-3 md:flex"
      >
        <ol className="flex flex-col">
          {STAGES.map((s) => {
            const current = s === stage
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-current={current ? 'step' : undefined}
                  onClick={() => onStageChange(s)}
                  className={cn(
                    'relative flex w-full flex-col items-start px-4 py-2 text-left transition-colors',
                    current ? 'bg-surface-2 text-text' : 'text-text-2 hover:bg-surface-2 hover:text-text',
                  )}
                >
                  {current && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
                  <span className={cn('text-14', current && 'font-medium')}>{stageLabel(s)}</span>
                  {stageMeta?.[s] && <span className="num text-12 text-text-3">{stageMeta[s]}</span>}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Stage switcher, under md */}
        <nav ref={switcher} aria-label={t('workbench.stagesLabel')} className="overflow-x-auto border-b border-line px-4 py-2 md:hidden">
          <SegmentedControl<Stage>
            aria-label={t('workbench.stagesLabel')}
            value={stage}
            onValueChange={onStageChange}
            options={STAGES.map((s) => ({ value: s, label: stageLabel(s) }))}
            fullWidth
            className="min-w-max"
          />
        </nav>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-10 outline-none md:px-6">
          <div className="flex items-center justify-between gap-4 pt-4">
            <h1 className="text-20 font-semibold text-text">{stageLabel(stage)}</h1>
            {!wide && (
              <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" icon={<SidebarSimple aria-hidden />}>
                    {t('workbench.explanation.open')}
                  </Button>
                </DialogTrigger>
                <DialogContent placement="sheet" id="explanation-sheet" title={t('workbench.explanation.title')}>
                  <div className="text-14 text-text-2">{explanation}</div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {children}
        </main>
      </div>

      {wide && (
        <aside
          aria-label={t('workbench.explanation.title')}
          className="w-80 shrink-0 overflow-y-auto border-l border-line px-5 py-4"
        >
          <h2 className="text-14 font-semibold text-text">{t('workbench.explanation.title')}</h2>
          <div className="mt-3 text-14 text-text-2">{explanation}</div>
        </aside>
      )}
    </div>
  )
}
