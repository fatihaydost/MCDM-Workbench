import { CaretDown, FileArrowUp, Question, Trash } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ValidationIssue } from '../../core'
import { doiUrl, examples, getExample, shortCitation, type ExampleDataset } from '../../data/examples'
import { DecisionGrid, type GridError, type GridLabels } from '../../features/grid'
import { EmptyMatrixHint } from '../../features/illustrations'
import type { ImportIssue } from '../../features/io'
import { useNumberFormat, type Lang } from '../../i18n'
import { isEmptyProblem, isLocalization, useValidation, useWorkbench, type DraftProblem } from '../../state/workbench'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  ErrorSummary,
  IconButton,
  Kbd,
  Notice,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  type ErrorSummaryItem,
} from '../../ui'
import { cellRef, IMPORT_ACCEPT, isLocated, readDecisionFile } from './importFile'
import { useWorkbenchNav, type ImportReport } from './nav'
import { ContinueBar } from './parts'
import { alternativeName, criterionName, ids, placeIssue, tr } from './shared'

export const DEFAULT_EXAMPLE = 'krishnan-2021-smartphones'
const MAX_SUMMARY = 8

type ImportStatus = { state: 'idle' } | { state: 'reading'; name: string } | { state: 'failed'; name: string; empty: boolean }

function useGridLabels(): GridLabels {
  const { t } = useTranslation()
  return useMemo(
    () => ({
      grid: t('workbench.grid.name'),
      alternative: t('workbench.grid.corner'),
      direction: t('workbench.grid.direction'),
      benefit: t('workbench.grid.benefit'),
      cost: t('workbench.grid.cost'),
      switchDirection: t('workbench.grid.switchHint'),
      addAlternative: t('workbench.grid.addAlternative'),
      addCriterion: t('workbench.grid.addCriterion'),
      deleteAlternative: t('workbench.grid.deleteAlternative'),
      deleteCriterion: t('workbench.grid.deleteCriterion'),
      undo: t('workbench.grid.undo'),
      redo: t('workbench.grid.redo'),
      notANumber: (text) => t('workbench.grid.notANumber', { text }),
      pastedWithNames: t('workbench.grid.pastedWithNames'),
      pasteAsValues: t('workbench.grid.pasteAsValues'),
      pasteSkipped: (count) => t('workbench.grid.pasteSkipped', { count }),
      newAlternative: (n) => t('workbench.alternativeN', { n }),
      newCriterion: (n) => t('workbench.criterionN', { n }),
      typeChanged: (criterion, type) => t('workbench.grid.typeChanged', { criterion, type }),
    }),
    [t],
  )
}

/**
 * Gives the grid's cells stable ids (wb-cell-i-j, wb-alt-i, wb-crit-j, wb-type-j) so error
 * summaries can link to them. The grid positions cells with aria-rowindex / aria-colindex:
 * row 1 names, row 2 directions, then alternatives; column 1 names, then criteria.
 */
function useGridIds(root: React.RefObject<HTMLDivElement | null>, labels: GridLabels) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    el.querySelectorAll<HTMLElement>('[role="grid"] tr[aria-rowindex]').forEach((tr) => {
      const r = Number(tr.getAttribute('aria-rowindex'))
      tr.querySelectorAll<HTMLElement>(':scope > [aria-colindex]').forEach((cell) => {
        const c = Number(cell.getAttribute('aria-colindex'))
        const j = c - 2
        const i = r - 3
        let id: string
        if (r === 1) id = c === 1 ? ids.corner : ids.criterion(j)
        else if (r === 2) id = c === 1 ? 'wb-corner-type' : ids.type(j)
        else id = c === 1 ? ids.alternative(i) : ids.cell(i, j)
        if (cell.id !== id) cell.id = id
      })
    })
    el.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      const text = b.textContent?.trim()
      if (text === labels.addAlternative) b.id = ids.addAlternative
      else if (text === labels.addCriterion) b.id = ids.addCriterion
    })
  })
}

/** Where an import issue is shown in the grid, if anywhere. */
function importTarget(x: ImportIssue): string | null {
  const nameIssue = x.code === 'missing-criterion-name' || x.code === 'duplicate-criterion-name'
  if (x.alt !== undefined && x.crit !== undefined) return ids.cell(x.alt, x.crit)
  if (x.crit !== undefined) return nameIssue ? ids.criterion(x.crit) : ids.type(x.crit)
  if (x.alt !== undefined) return ids.alternative(x.alt)
  return null
}

function useImportMessages(report: ImportReport | null, problem: DraftProblem, decimalWord: string) {
  const { t } = useTranslation()
  return useMemo(() => {
    if (!report) return { located: [] as ErrorSummaryItem[], notes: [] as string[] }
    const located: ErrorSummaryItem[] = []
    const notes: string[] = []
    for (const x of report.issues) {
      const vars = {
        alternative: x.alt !== undefined ? alternativeName(problem, x.alt, t) : '',
        criterion: x.crit !== undefined ? criterionName(problem.criteria, x.crit, t) : problem.criteria[0]?.name ?? '',
        separator: decimalWord,
      }
      const text = tr(t, `workbench.data.importIssues.${x.code}`, vars)
      const where =
        x.row < 0
          ? ''
          : report.kind === 'xlsx'
            ? t('workbench.data.cell', { cell: cellRef(x.row, Math.max(x.col, 0)) })
            : t('workbench.data.line', { row: x.row + 1, col: Math.max(x.col, 0) + 1 })
      const message = where ? `${where}: ${text}` : text
      const target = isLocated(x) ? importTarget(x) : null
      if (target) located.push({ targetId: target, message })
      else notes.push(message)
    }
    return { located, notes }
  }, [report, problem, t, decimalWord])
}

export function DataStage() {
  const { t } = useTranslation()
  const nf = useNumberFormat()
  const lang = nf.lang
  const problem = useWorkbench((s) => s.problem)
  const exampleId = useWorkbench((s) => s.exampleId)
  const setProblem = useWorkbench((s) => s.setProblem)
  const importProblem = useWorkbench((s) => s.importProblem)
  const loadExample = useWorkbench((s) => s.loadExample)
  const startBlank = useWorkbench((s) => s.startBlank)
  const reset = useWorkbench((s) => s.reset)
  const issues = useValidation()
  const { goTo, attempted, setAttempted, importReport, setImportReport } = useWorkbenchNav()
  const labels = useGridLabels()

  const fileInput = useRef<HTMLInputElement>(null)
  const gridRoot = useRef<HTMLDivElement>(null)
  const summaryRoot = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<ImportStatus>({ state: 'idle' })
  const [focusSummary, setFocusSummary] = useState(0)
  const [clearOpen, setClearOpen] = useState(false)

  useGridIds(gridRoot, labels)

  const errors = issues.filter((x) => x.severity === 'error')
  const warnings = issues.filter((x) => x.severity === 'warning')
  const showErrors = attempted.data
  const report = importReport && importReport.problem === problem ? importReport : null
  const decimalWord = report?.decimal === ',' ? t('workbench.data.decimalComma') : t('workbench.data.decimalPoint')
  const importMessages = useImportMessages(report, problem, decimalWord)

  const gridErrors = useMemo<GridError[]>(() => {
    if (!showErrors && !report) return []
    return errors
      .filter((x) => x.row !== undefined || x.col !== undefined)
      .map((x) => {
        const e: GridError = { message: placeIssue(x, problem, t, nf.format).message }
        if (x.row !== undefined) e.row = x.row
        if (x.col !== undefined) e.col = x.col
        return e
      })
  }, [errors, showErrors, report, problem, t, nf.format])

  const validationItems = useMemo<ErrorSummaryItem[]>(() => {
    const placed = errors.map((x) => placeIssue(x, problem, t, nf.format))
    return placed.slice(0, MAX_SUMMARY).map((p) => ({ targetId: p.targetId, message: p.message }))
  }, [errors, problem, t, nf.format])

  // One summary at a time, in one place (so it never remounts and steals focus while typing):
  // the import report right after an import, otherwise the validation errors after "Continue".
  const summary: { title: string; items: ErrorSummaryItem[]; more: number } | null =
    report && importMessages.located.length > 0
      ? { title: t('workbench.data.importTitle'), items: importMessages.located.slice(0, MAX_SUMMARY), more: importMessages.located.length - MAX_SUMMARY }
      : showErrors && errors.length > 0
        ? { title: t('validation.summaryTitle'), items: validationItems, more: errors.length - MAX_SUMMARY }
        : null

  useEffect(() => {
    if (focusSummary === 0) return
    summaryRoot.current?.querySelector<HTMLElement>('[tabindex="-1"]')?.focus()
  }, [focusSummary])

  const onContinue = () => {
    if (errors.length > 0) {
      setAttempted('data', true)
      setImportReport(null)
      setFocusSummary((k) => k + 1)
      return
    }
    goTo('weights')
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setStatus({ state: 'reading', name: file.name })
    try {
      const res = await readDecisionFile(file)
      const p = res.problem
      if (p.alternatives.length === 0 || p.criteria.length === 0) {
        setStatus({ state: 'failed', name: file.name, empty: true })
        return
      }
      const next: DraftProblem = { alternatives: p.alternatives, criteria: p.criteria, matrix: p.matrix }
      importProblem(next, file.name)
      setImportReport({ problem: next, name: file.name, kind: res.kind, decimal: res.decimal, issues: res.issues })
      setAttempted('data', res.issues.some(isLocated))
      setStatus({ state: 'idle' })
      if (res.issues.some(isLocated)) setFocusSummary((k) => k + 1)
    } catch {
      setStatus({ state: 'failed', name: file.name, empty: false })
    }
  }

  const openFile = () => fileInput.current?.click()
  const onLoadExample = (id: string) => {
    loadExample(id, lang)
    setImportReport(null)
    setAttempted('data', false)
    setStatus({ state: 'idle' })
  }

  const fileControl = (
    <input ref={fileInput} type="file" accept={IMPORT_ACCEPT} className="hidden" tabIndex={-1} aria-hidden onChange={(e) => void onFile(e)} />
  )

  const statusNode =
    status.state === 'failed' ? (
      <Notice tone="danger" role="alert">
        {status.empty ? t('workbench.data.importEmpty', { name: status.name }) : t('workbench.data.importFailed', { name: status.name })}
      </Notice>
    ) : null

  if (status.state === 'reading') {
    return (
      <div className="flex flex-col gap-4 pt-4" role="status" aria-label={t('workbench.data.importing', { name: status.name })}>
        <p className="text-14 text-text-2">{t('workbench.data.importing', { name: status.name })}</p>
        <Skeleton width={320} height={28} />
        <Skeleton height={32} />
        <Skeleton height={32} />
        <Skeleton height={160} />
      </div>
    )
  }

  if (isEmptyProblem(problem)) {
    return (
      <div className="flex flex-col gap-2 pt-2">
        {fileControl}
        {statusNode && <div className="pt-4">{statusNode}</div>}
        <div className="flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:gap-10">
          <EmptyMatrixHint label={t('workbench.visual.emptyMatrix')} className="w-full max-w-[216px] shrink-0" />
          <div className="flex max-w-[480px] flex-col items-start gap-2">
            <h2 className="text-16 font-semibold text-text">{t('workbench.empty.data.title')}</h2>
            <p className="text-14 text-text-2">{t('workbench.empty.data.body')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => onLoadExample(DEFAULT_EXAMPLE)}>
                {t('workbench.data.loadExample')}
              </Button>
              <Button icon={<FileArrowUp aria-hidden />} onClick={openFile}>
                {t('workbench.data.importFile')}
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  startBlank(3, 3, {
                    alternative: (i) => t('workbench.alternativeN', { n: i + 1 }),
                    criterion: (j) => t('workbench.criterionN', { n: j + 1 }),
                  })
                }
              >
                {t('workbench.empty.data.startBlank')}
              </Button>
            </div>
          </div>
        </div>
        <ExampleList lang={lang} onLoad={onLoadExample} />
      </div>
    )
  }

  const example = exampleId ? getExample(exampleId) : undefined

  return (
    <div className="flex flex-col gap-4 pt-4">
      {fileControl}
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button iconEnd={<CaretDown aria-hidden />}>{t('workbench.data.loadExample')}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel>{t('workbench.data.examplesLabel')}</DropdownMenuLabel>
            {examples.map((ex) => (
              <DropdownMenuItem key={ex.id} onSelect={() => onLoadExample(ex.id)}>
                {ex.name[lang]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button icon={<FileArrowUp aria-hidden />} onClick={openFile}>
          {t('workbench.data.importFile')}
        </Button>
        <GridHelp />
        <Button variant="ghost" icon={<Trash aria-hidden />} className="ml-auto" onClick={() => setClearOpen(true)}>
          {t('workbench.data.clear')}
        </Button>
      </div>

      {statusNode}

      <div ref={summaryRoot} className={summary ? undefined : 'hidden'}>
        <ErrorSummary
          autoFocus={false}
          title={summary?.title}
          errors={summary?.items ?? []}
        />
        {summary && summary.more > 0 && (
          <p className="mt-2 text-13 text-text-2">{t('workbench.data.moreProblems', { count: summary.more })}</p>
        )}
      </div>

      {report && (
        <Notice tone={importMessages.notes.length > 0 ? 'warning' : 'info'} role="status" title={importMessages.notes.length > 0 ? t('workbench.data.importNotes') : undefined}>
          {importMessages.notes.length > 0 && (
            <ul className="mb-1 flex flex-col gap-1 text-text">
              {importMessages.notes.map((m, k) => (
                <li key={k}>{m}</li>
              ))}
            </ul>
          )}
          <p>
            {t('workbench.data.imported', {
              name: report.name,
              alternatives: problem.alternatives.length,
              criteria: problem.criteria.length,
            })}
          </p>
        </Notice>
      )}

      <div ref={gridRoot} className="min-w-0">
        <DecisionGrid
          alternatives={problem.alternatives}
          criteria={problem.criteria}
          matrix={problem.matrix}
          errors={gridErrors}
          onChange={(next) => setProblem(next)}
          isRelabel={isLocalization}
          parse={nf.parse}
          format={nf.formatRaw}
          labels={labels}
          maxHeight="min(64dvh, 640px)"
        />
      </div>

      {warnings.length > 0 && <ProblemWarnings issues={warnings} problem={problem} />}

      {example && <ExampleCitation example={example} lang={lang} />}

      <ContinueBar to="weights" onContinue={onContinue} />

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent
          title={t('workbench.data.clearTitle')}
          description={t('workbench.data.clearBody')}
          width="sm"
          footer={
            <>
              <DialogClose asChild>
                <Button>{t('common.actions.cancel')}</Button>
              </DialogClose>
              <Button
                variant="primary"
                onClick={() => {
                  reset()
                  setImportReport(null)
                  setAttempted('data', false)
                  setClearOpen(false)
                }}
              >
                {t('workbench.data.clear')}
              </Button>
            </>
          }
        />
      </Dialog>
    </div>
  )
}

function ProblemWarnings({ issues, problem }: { issues: ValidationIssue[]; problem: DraftProblem }) {
  const { t } = useTranslation()
  const nf = useNumberFormat()
  return (
    <Notice tone="warning">
      <ul className="flex flex-col gap-1 text-text">
        {issues.map((x, k) => (
          <li key={k}>{placeIssue(x, problem, t, nf.format).message}</li>
        ))}
      </ul>
    </Notice>
  )
}

/** One line under the grid: "Example data: Krishnan et al. (2021), Table 1 (input) ... doi:..." */
export function ExampleCitation({ example, lang }: { example: ExampleDataset; lang: Lang }) {
  const { t } = useTranslation()
  const c = example.citation
  return (
    <p className="text-13 text-text-2">
      {t('workbench.data.exampleShort', { citation: shortCitation(c, lang), tables: c.tables[lang] })}{' '}
      <a href={doiUrl(c.doi)} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2 hover:no-underline">
        doi:{c.doi}
      </a>
    </p>
  )
}

/** "?" next to the toolbar: the grid's keys and paste, instead of a paragraph above it. */
function GridHelp() {
  const { t } = useTranslation()
  const row = (keys: string[], label: string) => (
    <li className="flex items-baseline justify-between gap-4">
      <span className="text-13 text-text-2">{label}</span>
      <span className="flex shrink-0 gap-1">
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </span>
    </li>
  )
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton aria-label={t('workbench.data.helpLabel')} icon={<Question />} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <ul className="flex flex-col gap-2">
          {row(['↑', '↓', 'Tab', 'Enter'], t('workbench.data.help.move'))}
          {row(['F2'], t('workbench.data.help.edit'))}
          {row(['Space'], t('workbench.data.help.type'))}
          {row(['Ctrl', 'Z'], t('workbench.data.help.undo'))}
          {row(['Esc', 'Tab'], t('workbench.data.help.leave'))}
        </ul>
        <p className="mt-3 border-t border-line pt-3 text-13 text-text-2">{t('workbench.data.help.paste')}</p>
      </PopoverContent>
    </Popover>
  )
}

function ExampleList({ lang, onLoad }: { lang: Lang; onLoad: (id: string) => void }) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="wb-examples" className="max-w-[720px] border-t border-line pt-5">
      <h2 id="wb-examples" className="text-14 font-semibold text-text">
        {t('workbench.data.examplesLabel')}
      </h2>
      <ul className="mt-2 flex flex-col">
        {examples.map((ex) => (
          <li key={ex.id} className="flex flex-col gap-1 border-b border-line py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-14 font-medium text-text">{ex.name[lang]}</span>
              <span className="text-12 text-text-3">
                {ex.citation.venue}.{' '}
                <a href={doiUrl(ex.citation.doi)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:no-underline">
                  doi:{ex.citation.doi}
                </a>
              </span>
            </div>
            <Button size="sm" className="mt-1 self-start" onClick={() => onLoad(ex.id)} aria-label={`${t('workbench.data.loadExample')}: ${ex.name[lang]}`}>
              {t('workbench.data.loadExample')}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
