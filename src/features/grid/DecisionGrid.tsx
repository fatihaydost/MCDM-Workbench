import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import * as Popover from '@radix-ui/react-popover'
import type { Criterion, CriterionType } from '../../core/types'
import s from './DecisionGrid.module.css'
import {
  applyPaste,
  canRedo,
  canUndo,
  cellKind,
  cellText,
  clampPos,
  clearRange,
  commandForKey,
  createHistory,
  deleteAlternative,
  deleteCriterion,
  editCommandForKey,
  gridSize,
  HEADER_COLS,
  HEADER_ROWS,
  inRange,
  insertAlternative,
  insertCriterion,
  isEditable,
  move,
  parseClipboard,
  pushHistory,
  rangeOf,
  rangeSize,
  rangeToTsv,
  redo,
  sameProblem,
  samePos,
  setType,
  toData,
  undo,
  writeCell,
  type EditMode,
  type Format,
  type GridProblem,
  type History,
  type NameFactory,
  type Parse,
  type Pos,
} from './model'

/**
 * A validation message placed on the grid, in data space:
 * `row` + `col` = a value cell, `col` only = the criterion header, `row` only = the alternative name.
 * Validation issues from `validateProblem` map over directly (`{ row, col, message: t(code) }`).
 */
export type GridError = { row?: number; col?: number; message: string }

/** Every visible or announced text of the grid. The component has no strings of its own. */
export type GridLabels = {
  /** Accessible name of the grid, e.g. "Decision matrix". */
  grid: string
  /** Header of the name column, e.g. "Alternative". */
  alternative: string
  /** Label of the type row, e.g. "Direction". */
  direction: string
  benefit: string
  cost: string
  /** Hint read on a type cell, e.g. "Enter or Space opens the benefit / cost choice." */
  switchDirection: string
  addAlternative: string
  addCriterion: string
  deleteAlternative: string
  deleteCriterion: string
  undo: string
  redo: string
  /** Shown when typed or pasted text is not a number, e.g. `"abc" is not a number.` */
  notANumber: (text: string) => string
  /** Shown after a paste whose first row / column became names. */
  pastedWithNames: string
  /** Button that re-does that paste with the header lines as plain cells. */
  pasteAsValues: string
  /** Shown when some pasted cells could not be read, e.g. "2 pasted cells were not numbers and were skipped." */
  pasteSkipped: (count: number) => string
  /** Name for a new row or column, 1-based: "Alternative 4", "Criterion 3". */
  newAlternative: (n: number) => string
  newCriterion: (n: number) => string
  /**
   * Announced (and shown) after a direction changes in its menu, e.g.
   * "Pixel density is now Cost. Ctrl+Z undoes it."
   */
  typeChanged: (criterion: string, type: string) => string
}

export type DecisionGridProps = {
  alternatives: string[]
  criteria: Criterion[]
  matrix: (number | null)[][]
  errors?: GridError[]
  onChange: (next: GridProblem) => void
  /** Locale number parser (TR `0,25` and EN `0.25`), e.g. `(s) => parseLocaleNumber(s, lang)`. */
  parse: Parse
  /** Formats a raw value for the cell, e.g. `(n) => formatRaw(n, lang)`. */
  format: Format
  labels: GridLabels
  /** 'auto' takes a text first row / column of a pasted block as names. Default 'auto'. */
  pasteHeaders?: 'auto' | 'none'
  /** Caps the grid height so it scrolls vertically inside its container with sticky headers. */
  maxHeight?: number | string
  className?: string
  /**
   * True for an external change that only relabels the table (names rewritten for a language switch): with the same
   * matrix it replaces the present undo step instead of adding one, so undo never brings the old names back.
   */
  isRelabel?: (next: GridProblem) => boolean
}

type Editing = { pos: Pos; draft: string; original: string; mode: EditMode; invalid: boolean }
type Notice =
  | { kind: 'headers'; before: GridProblem; at: Pos; cells: string[][]; skipped: number }
  | { kind: 'skipped'; count: number }
  | { kind: 'not-a-number'; text: string }
  | { kind: 'type-changed'; j: number }

const key = (p: Pos): string => `${p.row}:${p.col}`

/**
 * Spreadsheet-style decision matrix editor (ARIA grid pattern, roving tabindex).
 *
 * Keys: arrows, Tab / Shift+Tab, Enter / Shift+Enter, Home / End, Ctrl+Home / Ctrl+End, PageUp /
 * PageDown move; Shift extends the selection. Typing replaces the cell, F2 or double click edits
 * it, Esc cancels. Delete / Backspace clear the selection. On the type row Enter or Space opens
 * the benefit / cost menu (a click only selects). Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) undo and redo. Copy, cut and paste use TSV; a block
 * pasted from Excel or Sheets fills from the focused cell and grows the grid; pasted on the
 * top-left corner it replaces the whole table.
 */
export function DecisionGrid({
  alternatives,
  criteria,
  matrix,
  errors = [],
  onChange,
  parse,
  format,
  labels,
  pasteHeaders = 'auto',
  maxHeight,
  className,
  isRelabel,
}: DecisionGridProps) {
  const uid = useId()
  const problem = useMemo<GridProblem>(() => ({ alternatives, criteria, matrix }), [alternatives, criteria, matrix])
  const size = gridSize(problem)

  const [history, setHistory] = useState<History<GridProblem>>(() => createHistory(problem))
  const [cursorRaw, setCursorRaw] = useState<Pos>({ row: HEADER_ROWS, col: HEADER_COLS })
  const [anchorRaw, setAnchorRaw] = useState<Pos>({ row: HEADER_ROWS, col: HEADER_COLS })
  const [editing, setEditing] = useState<Editing | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  /** Criterion whose direction menu is open. */
  const [typeMenu, setTypeMenu] = useState<number | null>(null)
  /** Direction cell that just changed: a short tint so the change is seen where it happened. */
  const [changed, setChanged] = useState<{ j: number; n: number } | null>(null)

  const cursor = clampPos(cursorRaw, size)
  const anchor = clampPos(anchorRaw, size)
  const selection = rangeOf(anchor, cursor)
  const multi = rangeSize(selection) > 1

  const cells = useRef(new Map<string, HTMLElement>())
  const wantFocus = useRef(false)
  const editRef = useRef<Editing | null>(null)
  editRef.current = editing
  const dragging = useRef(false)
  const leaving = useRef(true)
  /** Whether the pressed cell was already the active one: a click there opens the direction menu. */
  const pressedActive = useRef(false)

  const names = useMemo<NameFactory>(
    () => ({ alternative: (i) => labels.newAlternative(i + 1), criterion: (j) => labels.newCriterion(j + 1) }),
    [labels],
  )

  // External changes (load example, import) become undoable steps; our own echoes are skipped, and a relabel of the
  // same data (language switch) replaces the present step.
  const relabel = useRef(isRelabel)
  relabel.current = isRelabel
  useEffect(() => {
    setHistory((h) => {
      if (sameProblem(h.present, problem)) return h
      if (problem.matrix === h.present.matrix && relabel.current?.(problem)) return { ...h, present: problem }
      return pushHistory(h, problem)
    })
  }, [problem])

  useLayoutEffect(() => {
    if (!wantFocus.current || editing) return
    wantFocus.current = false
    cells.current.get(key(cursor))?.focus()
    leaving.current = false
  })

  useEffect(() => {
    if (!changed) return
    const id = window.setTimeout(() => setChanged(null), 1200)
    return () => window.clearTimeout(id)
  }, [changed])

  useEffect(() => {
    const up = () => {
      dragging.current = false
    }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const emit = useCallback(
    (next: GridProblem) => {
      if (sameProblem(next, problem)) return
      setHistory((h) => pushHistory(h, next))
      onChange(next)
    },
    [onChange, problem],
  )

  const select = (pos: Pos, extend = false) => {
    setCursorRaw(pos)
    if (!extend) setAnchorRaw(pos)
    wantFocus.current = true
  }

  const selectRange = (from: Pos, to: Pos) => {
    // The active cell stays at the top-left of the block, like a spreadsheet after paste.
    setCursorRaw(from)
    setAnchorRaw(to)
    wantFocus.current = true
  }

  const doUndo = () => {
    if (!canUndo(history)) return
    const h = undo(history)
    setHistory(h)
    onChange(h.present)
    setNotice(null)
  }

  const doRedo = () => {
    if (!canRedo(history)) return
    const h = redo(history)
    setHistory(h)
    onChange(h.present)
    setNotice(null)
  }

  /** Sets criterion j's direction from its menu and says so, with the undo shortcut. */
  const chooseType = (j: number, type: CriterionType) => {
    setTypeMenu(null)
    const next = setType(problem, j, type)
    if (next === problem) return
    emit(next)
    setNotice({ kind: 'type-changed', j })
    setChanged((c) => ({ j, n: (c?.n ?? 0) + 1 }))
  }

  const openEditor = (pos: Pos, mode: EditMode, draft?: string) => {
    if (!isEditable(cellKind(pos))) return
    const original = cellText(problem, pos, format)
    setNotice(null)
    setEditing({ pos, mode, original, draft: draft ?? original, invalid: false })
  }

  const closeEditor = () => {
    editRef.current = null
    setEditing(null)
    wantFocus.current = true
  }

  /** Writes the editor's text. False when a value cell holds text that is not a number. */
  const commit = (ed: Editing): boolean => {
    if (ed.draft === ed.original) return true
    const res = writeCell(problem, ed.pos, ed.draft, parse)
    if (!res.ok) return false
    emit(res.problem)
    return true
  }

  const paste = (text: string, at: Pos) => {
    const block = parseClipboard(text, parse)
    if (block.length === 0) return
    if (block.length === 1 && block[0]!.length === 1) {
      const res = writeCell(problem, at, block[0]![0]!, parse)
      if (res.ok) {
        emit(res.problem)
        setNotice(null)
      } else if (cellKind(at) === 'value') setNotice({ kind: 'not-a-number', text: block[0]![0]! })
      return
    }
    const res = applyPaste(problem, at, block, parse, { headers: pasteHeaders, names })
    emit(res.problem)
    selectRange({ row: res.range.top, col: res.range.left }, { row: res.range.bottom, col: res.range.right })
    if (res.headers.row || res.headers.col) {
      setNotice({ kind: 'headers', before: problem, at, cells: block, skipped: res.rejected.length })
    } else if (res.rejected.length > 0) setNotice({ kind: 'skipped', count: res.rejected.length })
    else setNotice(null)
  }

  const pasteAsValues = () => {
    if (notice?.kind !== 'headers') return
    const res = applyPaste(notice.before, notice.at, notice.cells, parse, { headers: 'none', names })
    setHistory((h) => pushHistory(undo(h), res.problem))
    onChange(res.problem)
    selectRange({ row: res.range.top, col: res.range.left }, { row: res.range.bottom, col: res.range.right })
    setNotice(res.rejected.length > 0 ? { kind: 'skipped', count: res.rejected.length } : null)
  }

  // --- keyboard -------------------------------------------------------------------------------

  const onGridKeyDown = (e: KeyboardEvent<HTMLTableElement>) => {
    if (editRef.current) return
    // Escape (not editing) and then Tab leaves the grid instead of moving cell by cell, so a
    // big matrix is not dozens of tab stops before "Continue".
    if (e.key === 'Tab' && leaving.current) {
      leaving.current = false
      return
    }
    leaving.current = e.key === 'Escape'
    const cmd = commandForKey(
      { key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey },
      cellKind(cursor),
    )
    if (!cmd) return
    switch (cmd.type) {
      case 'move': {
        const next = move(cursor, cmd.nav, size)
        // Tab at the last cell (Shift+Tab at the first) leaves the grid: no keyboard trap.
        if ((cmd.nav === 'tab' || cmd.nav === 'shift-tab') && samePos(next, cursor)) return
        e.preventDefault()
        select(next, cmd.extend)
        return
      }
      case 'edit':
        e.preventDefault()
        openEditor(cursor, cmd.mode, cmd.mode === 'replace' ? cmd.text : undefined)
        return
      case 'type-menu':
        e.preventDefault()
        setTypeMenu(toData(cursor).j)
        return
      case 'clear':
        e.preventDefault()
        emit(clearRange(problem, selection))
        return
      case 'undo':
        e.preventDefault()
        doUndo()
        return
      case 'redo':
        e.preventDefault()
        doRedo()
        return
      case 'select-all':
        e.preventDefault()
        setAnchorRaw({ row: 0, col: 0 })
        setCursorRaw({ row: size.rows - 1, col: size.cols - 1 })
        wantFocus.current = true
        return
      case 'collapse':
        setAnchorRaw(cursor)
        setNotice(null)
        return
    }
  }

  const onEditorKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const ed = editRef.current
    if (!ed) return
    const cmd = editCommandForKey({ key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey }, ed.mode)
    if (!cmd) return
    e.preventDefault()
    if (cmd.type === 'cancel') {
      closeEditor()
      return
    }
    if (!commit(ed)) {
      setEditing({ ...ed, invalid: true })
      return
    }
    closeEditor()
    if (cmd.then) select(move(ed.pos, cmd.then, size))
  }

  const onEditorBlur = () => {
    const ed = editRef.current
    if (!ed) return
    editRef.current = null
    if (!commit(ed)) setNotice({ kind: 'not-a-number', text: ed.draft })
    setEditing(null)
  }

  // --- clipboard ------------------------------------------------------------------------------

  const onCopy = (e: ClipboardEvent<HTMLTableElement>) => {
    if (editRef.current) return
    e.preventDefault()
    e.clipboardData.setData('text/plain', rangeToTsv(problem, selection, format))
  }

  const onCut = (e: ClipboardEvent<HTMLTableElement>) => {
    if (editRef.current) return
    onCopy(e)
    emit(clearRange(problem, selection))
  }

  const onPaste = (e: ClipboardEvent<HTMLTableElement>) => {
    const text = e.clipboardData.getData('text/plain')
    const ed = editRef.current
    const isBlock = /[\t\n\r]/.test(text.replace(/[\r\n]+$/, ''))
    if (ed && !isBlock) return // plain text into the open editor
    e.preventDefault()
    const at = ed ? ed.pos : cursor
    if (ed) closeEditor()
    paste(text, at)
  }

  // --- mouse ----------------------------------------------------------------------------------

  const onCellMouseDown = (pos: Pos, e: MouseEvent) => {
    leaving.current = false
    if (e.button !== 0) return
    pressedActive.current = samePos(pos, cursor) && !e.shiftKey
    if (editing && samePos(editing.pos, pos)) return
    dragging.current = true
    select(pos, e.shiftKey)
  }

  const onCellMouseEnter = (pos: Pos, e: MouseEvent) => {
    if (dragging.current && e.buttons === 1 && !editing) setCursorRaw(pos)
  }

  // --- toolbar --------------------------------------------------------------------------------

  const { i: curI, j: curJ } = toData(cursor)
  const onAlternativeRow = cursor.row >= HEADER_ROWS
  const onCriterionCol = cursor.col >= HEADER_COLS

  const addAlternative = () => {
    const i = alternatives.length
    emit(insertAlternative(problem, i, names.alternative(i)))
    select({ row: i + HEADER_ROWS, col: 0 })
  }
  const addCriterion = () => {
    const j = criteria.length
    emit(insertCriterion(problem, j, names.criterion(j)))
    select({ row: 0, col: j + HEADER_COLS })
  }
  const removeAlternative = () => {
    emit(deleteAlternative(problem, curI))
    select(cursor)
  }
  const removeCriterion = () => {
    emit(deleteCriterion(problem, curJ))
    select(cursor)
  }

  // --- errors ---------------------------------------------------------------------------------

  const errorMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const err of errors) {
      let pos: Pos | null = null
      if (err.row !== undefined && err.col !== undefined) pos = { row: err.row + HEADER_ROWS, col: err.col + HEADER_COLS }
      else if (err.col !== undefined) pos = { row: 0, col: err.col + HEADER_COLS }
      else if (err.row !== undefined) pos = { row: err.row + HEADER_ROWS, col: 0 }
      if (!pos) continue
      const k = key(pos)
      map.set(k, [...(map.get(k) ?? []), err.message])
    }
    return map
  }, [errors])

  const errId = (pos: Pos) => `${uid}-err-${pos.row}-${pos.col}`
  const hintId = `${uid}-type-hint`
  const cursorErrors = errorMap.get(key(cursor))

  // --- rendering ------------------------------------------------------------------------------

  const cellAttrs = (pos: Pos, label?: string) => {
    const k = key(pos)
    const invalid = errorMap.has(k)
    const kind = cellKind(pos)
    const describedBy = [invalid ? errId(pos) : null, kind === 'criterion-type' ? hintId : null].filter(Boolean).join(' ')
    return {
      ref: (el: HTMLElement | null) => {
        if (el) cells.current.set(k, el)
        else cells.current.delete(k)
      },
      tabIndex: samePos(pos, cursor) ? 0 : -1,
      'aria-colindex': pos.col + 1,
      'aria-selected': multi ? inRange(selection, pos) : samePos(pos, cursor),
      'aria-invalid': invalid || undefined,
      'aria-describedby': describedBy || undefined,
      'aria-readonly': kind === 'corner' || undefined,
      'aria-label': label,
      'data-cursor': samePos(pos, cursor) || undefined,
      'data-selected': (multi && inRange(selection, pos)) || undefined,
      'data-invalid': invalid || undefined,
      'data-kind': kind,
      // Focus from outside the grid (an error summary link, assistive tech) moves the cursor there.
      onFocus: () => { if (!dragging.current && !samePos(pos, cursor)) { setCursorRaw(pos); setAnchorRaw(pos) } },
      onMouseDown: (e: MouseEvent) => onCellMouseDown(pos, e),
      onMouseEnter: (e: MouseEvent) => onCellMouseEnter(pos, e),
      onDoubleClick: () => {
        if (isEditable(kind) && !(editRef.current && samePos(editRef.current.pos, pos))) openEditor(pos, 'edit')
      },
    }
  }

  const content = (pos: Pos, text: ReactNode, numeric = false): ReactNode => {
    if (editing && samePos(editing.pos, pos)) {
      return (
        <Editor
          editing={editing}
          numeric={numeric}
          onDraft={(draft) => setEditing({ ...editing, draft, invalid: false })}
          onKeyDown={onEditorKeyDown}
          onBlur={onEditorBlur}
          describedBy={editing.invalid ? `${uid}-editor-msg` : undefined}
        />
      )
    }
    // Names can be cut with an ellipsis on a phone; the full name is the tooltip.
    return (
      <span className={s.text} title={!numeric && typeof text === 'string' && text ? text : undefined}>
        {text}
      </span>
    )
  }

  const typeLabel = (c: Criterion) => (c.type === 'benefit' ? `↑ ${labels.benefit}` : `↓ ${labels.cost}`)

  let message: ReactNode = null
  if (editing?.invalid) message = <span className={s.msgDanger} id={`${uid}-editor-msg`}>{labels.notANumber(editing.draft)}</span>
  else if (cursorErrors) message = <span className={s.msgDanger}>{cursorErrors.join(' ')}</span>

  let noticeNode: ReactNode = null
  if (notice?.kind === 'headers') {
    noticeNode = (
      <>
        <span>
          {labels.pastedWithNames}
          {notice.skipped > 0 ? ` ${labels.pasteSkipped(notice.skipped)}` : ''}
        </span>
        <button type="button" className={s.linkButton} onClick={pasteAsValues}>
          {labels.pasteAsValues}
        </button>
      </>
    )
  } else if (notice?.kind === 'skipped') noticeNode = <span>{labels.pasteSkipped(notice.count)}</span>
  else if (notice?.kind === 'not-a-number') noticeNode = <span className={s.msgDanger}>{labels.notANumber(notice.text)}</span>
  else if (notice?.kind === 'type-changed' && criteria[notice.j]) {
    const c = criteria[notice.j]!
    noticeNode = <span>{labels.typeChanged(c.name, c.type === 'benefit' ? labels.benefit : labels.cost)}</span>
  }

  const scrollerStyle: CSSProperties | undefined = maxHeight === undefined ? undefined : { maxHeight }

  return (
    <div className={className ? `${s.root} ${className}` : s.root}>
      <div className={s.toolbar}>
        <button type="button" className={s.button} onClick={addAlternative}>
          {labels.addAlternative}
        </button>
        <button type="button" className={s.button} onClick={addCriterion}>
          {labels.addCriterion}
        </button>
        <button
          type="button"
          className={s.button}
          onClick={removeAlternative}
          disabled={!onAlternativeRow || alternatives.length <= 1}
          aria-label={onAlternativeRow ? `${labels.deleteAlternative}: ${alternatives[curI] ?? ''}` : undefined}
        >
          {labels.deleteAlternative}
        </button>
        <button
          type="button"
          className={s.button}
          onClick={removeCriterion}
          disabled={!onCriterionCol || criteria.length <= 1}
          aria-label={onCriterionCol ? `${labels.deleteCriterion}: ${criteria[curJ]?.name ?? ''}` : undefined}
        >
          {labels.deleteCriterion}
        </button>
        <span className={s.spacer} />
        <button type="button" className={s.button} onClick={doUndo} disabled={!canUndo(history)} aria-keyshortcuts="Control+Z Meta+Z">
          {labels.undo}
        </button>
        <button
          type="button"
          className={s.button}
          onClick={doRedo}
          disabled={!canRedo(history)}
          aria-keyshortcuts="Control+Y Control+Shift+Z Meta+Shift+Z"
        >
          {labels.redo}
        </button>
      </div>

      <div className={s.scroller} style={scrollerStyle}>
        <table
          role="grid"
          className={s.grid}
          aria-label={labels.grid}
          aria-rowcount={size.rows}
          aria-colcount={size.cols}
          aria-multiselectable
          onFocus={(e) => {
            if (!dragging.current && (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node))) {
              leaving.current = true
            }
          }}
          onKeyDown={onGridKeyDown}
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
        >
          <thead>
            <tr role="row" aria-rowindex={1} className={s.nameRow}>
              <th role="columnheader" className={`${s.cell} ${s.corner}`} {...cellAttrs({ row: 0, col: 0 })}>
                <span className={s.text}>{labels.alternative}</span>
              </th>
              {criteria.map((c, j) => {
                const pos = { row: 0, col: j + HEADER_COLS }
                return (
                  <th key={j} role="columnheader" className={`${s.cell} ${s.header}`} {...cellAttrs(pos)}>
                    {content(pos, c.name)}
                  </th>
                )
              })}
            </tr>
            <tr role="row" aria-rowindex={2} className={s.typeRow}>
              <th role="columnheader" className={`${s.cell} ${s.corner} ${s.cornerType}`} {...cellAttrs({ row: 1, col: 0 })}>
                <span className={s.text}>{labels.direction}</span>
              </th>
              {criteria.map((c, j) => {
                const pos = { row: 1, col: j + HEADER_COLS }
                const open = typeMenu === j
                return (
                  <td
                    key={j}
                    role="gridcell"
                    className={`${s.cell} ${s.type}`}
                    data-type={c.type}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    {...cellAttrs(pos, `${c.name}: ${c.type === 'benefit' ? labels.benefit : labels.cost}`)}
                  >
                    {changed?.j === j && <span key={changed.n} className={s.changed} aria-hidden />}
                    <Popover.Root open={open} onOpenChange={(o) => !o && setTypeMenu(null)}>
                      <Popover.Anchor asChild>
                        {/* One click selects the cell; a click on the selected cell or on the caret opens the menu. */}
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-hidden
                          className={s.typeButton}
                          // Focus stays on the cell (the grid's roving focus), not on this inner button.
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            const onCaret = (e.target as HTMLElement).closest('[data-caret]') !== null
                            if (open) setTypeMenu(null)
                            else if (onCaret || pressedActive.current) setTypeMenu(j)
                          }}
                        >
                          <span className={s.typeLabel}>{typeLabel(c)}</span>
                          <span className={s.caret} data-caret>
                            <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden focusable="false">
                              <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                            </svg>
                          </span>
                        </button>
                      </Popover.Anchor>
                      <Popover.Portal>
                        <Popover.Content
                          asChild
                          align="end"
                          side="bottom"
                          sideOffset={4}
                          collisionPadding={8}
                          onOpenAutoFocus={(e) => {
                            e.preventDefault()
                            const menu = e.currentTarget as HTMLElement
                            menu.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
                          }}
                          onCloseAutoFocus={(e) => {
                            e.preventDefault()
                            cells.current.get(key(pos))?.focus()
                            leaving.current = false
                          }}
                          // A press on its own cell is handled by the cell (it closes the menu there).
                          onInteractOutside={(e) => {
                            if (cells.current.get(key(pos))?.contains(e.target as Node)) e.preventDefault()
                          }}
                        >
                          <TypeMenu
                            label={`${c.name}: ${labels.direction}`}
                            value={c.type}
                            options={[
                              { value: 'benefit', text: `↑ ${labels.benefit}` },
                              { value: 'cost', text: `↓ ${labels.cost}` },
                            ]}
                            onChoose={(type) => chooseType(j, type)}
                            onClose={() => setTypeMenu(null)}
                          />
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                  </td>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {alternatives.map((name, i) => {
              const row = i + HEADER_ROWS
              return (
                <tr key={i} role="row" aria-rowindex={row + 1}>
                  <th role="rowheader" scope="row" className={`${s.cell} ${s.rowHeader}`} {...cellAttrs({ row, col: 0 })}>
                    {content({ row, col: 0 }, name)}
                  </th>
                  {criteria.map((_, j) => {
                    const pos = { row, col: j + HEADER_COLS }
                    const v = matrix[i]?.[j]
                    return (
                      <td key={j} role="gridcell" className={`${s.cell} ${s.value}`} {...cellAttrs(pos)}>
                        {content(pos, v === null || v === undefined ? '' : format(v), true)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className={s.status}>
        {message ? <p className={s.message}>{message}</p> : null}
        <p className={s.message} aria-live="polite">
          {noticeNode}
        </p>
      </div>

      <div hidden>
        <span id={hintId}>{labels.switchDirection}</span>
        {[...errorMap.entries()].map(([k, msgs]) => {
          const [row, col] = k.split(':').map(Number) as [number, number]
          return (
            <span key={k} id={errId({ row, col })}>
              {msgs.join(' ')}
            </span>
          )
        })}
      </div>
    </div>
  )
}

type TypeMenuProps = {
  label: string
  value: CriterionType
  options: { value: CriterionType; text: string }[]
  onChoose: (type: CriterionType) => void
  onClose: () => void
}

/**
 * Benefit / cost as a two-item menu (menuitemradio): arrows, Home / End move, Enter or Space picks,
 * Esc closes without a change, Tab closes and returns to the grid. Radix Popover places it.
 */
const TypeMenu = ({ label, value, options, onChoose, onClose, ...rest }: TypeMenuProps & Record<string, unknown>) => {
  const passed = rest as { onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The menu is portalled but sits inside the grid in React's tree: keep its keys from the grid.
    e.stopPropagation()
    passed.onKeyDown?.(e)
    if (e.defaultPrevented) return
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
    const at = items.indexOf(document.activeElement as HTMLElement)
    let next = -1
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (at + 1) % items.length
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (at - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else if (e.key === 'Tab') {
      e.preventDefault()
      onClose()
      return
    } else return
    e.preventDefault()
    items[next]?.focus()
  }
  return (
    // Popover.Content (asChild) passes its positioning props, ref and handlers through `rest`.
    <div
      {...rest}
      role="menu"
      aria-label={label}
      className={s.typeMenu}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="menuitemradio"
          aria-checked={o.value === value}
          tabIndex={-1}
          className={s.typeOption}
          onClick={() => onChoose(o.value)}
        >
          <span className={s.check} aria-hidden>
            {o.value === value ? '✓' : ''}
          </span>
          {o.text}
        </button>
      ))}
    </div>
  )
}

type EditorProps = {
  editing: Editing
  numeric: boolean
  onDraft: (draft: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onBlur: () => void
  describedBy: string | undefined
}

function Editor({ editing, numeric, onDraft, onKeyDown, onBlur, describedBy }: EditorProps) {
  const ref = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    const end = el.value.length
    el.setSelectionRange(end, end)
  }, [])
  return (
    <input
      ref={ref}
      className={numeric ? `${s.editor} ${s.editorNumeric}` : s.editor}
      value={editing.draft}
      inputMode={numeric ? 'decimal' : undefined}
      autoComplete="off"
      spellCheck={false}
      aria-invalid={editing.invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onMouseDown={(e) => e.stopPropagation()}
    />
  )
}
