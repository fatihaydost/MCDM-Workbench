import { Copy, DownloadSimple, Plus, Trash, UploadSimple } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { useNumberFormat } from '../../i18n'
import { examples } from '../../data/examples'
import { computeRanking, computeWeights } from '../../state/workbench'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorSummary,
  Field,
  IconButton,
  Kbd,
  Notice,
  NumberInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
  Select,
  Skeleton,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TBody,
  Td,
  TextInput,
  Th,
  THead,
  Tooltip,
  Tr,
  type TableDensity,
} from '../../ui'
import { Formula } from '../../ui/Formula'
import { emptyJudgements, setPair } from '../../core/judgements'
import type { Ratio } from '../../core/types'
import {
  AnchorPicker,
  JudgementPanel,
  PairList,
  PairwiseCard,
  ahpQuestions,
  answerOf,
  nextUnanswered,
  progress,
  type JudgementPanelLabels,
  type Mode,
  type PairListLabels,
  type PairwiseLabels,
} from '../../features/pairwise'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-8">
      <h2 className="mb-4 text-16 font-semibold text-text">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-2 md:flex-row md:items-center md:gap-6">
      <span className="w-32 shrink-0 text-12 text-text-3">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

const swatches = [
  'bg',
  'surface',
  'surface-2',
  'line',
  'line-strong',
  'text',
  'text-2',
  'text-3',
  'accent',
  'accent-hover',
  'accent-bg',
  'danger',
  'danger-bg',
  'warning',
  'warning-bg',
  'ok',
  'ok-bg',
  'data-context',
  'data-heat-0',
  'data-heat-1',
  'data-negative',
] as const

const krishnan = examples[0]!

const pairNames = ['Price', 'Comfort', 'Safety', 'Fuel']
const pairLabels: PairwiseLabels = {
  question: 'Which matters more?',
  fixed: (a, b) => `How much more important is ${a} than ${b}?`,
  sides: 'Which matters more',
  values: 'By how much',
  equal: 'Equally important',
  words: { 1: 'equal', 3: 'moderately', 5: 'strongly', 7: 'very strongly', 9: 'extremely' },
  valueName: (v) =>
    v === 1 ? '1, equally important' : `${v}, ${{ 3: 'moderately ', 5: 'strongly ', 7: 'very strongly ', 9: 'extremely ' }[v] ?? ''}more important`,
  progress: (n, total) => `${n} / ${total}`,
  back: 'Back',
  atMost: (cap) => `At most ${cap}`,
  suggest: (answer) => `Your other answers suggest ${answer}`,
  use: (v) => `Use ${v}`,
}
const panelLabels: JudgementPanelLabels = {
  title: 'Weights',
  provisional: 'Provisional, more answers refine them',
  consistency: 'Consistency (CR)',
  notApplicable: 'not applicable',
  value: (c) => `CR ${c.approximate ? '≈ ' : ''}${c.value.toFixed(2)}${c.threshold === null ? '' : ` / ${c.threshold.toFixed(2)}`}`,
  ok: 'Consistent',
  warning: (name) => (name ? `Look at ${name}` : 'Inconsistent'),
  format: (n) => n.toFixed(2),
}
const listLabels: PairListLabels = { title: 'All pairs', pair: (a, b) => `${a} vs ${b}`, flagged: 'check this answer' }
const AHP: Mode = { kind: 'ahp' }
const ahpQs = ahpQuestions(pairNames.length)

/** Live AHP card, BWM card under a cap of 3, a flagged card and the panels. */
function PairwiseDemo() {
  const [j, setJ] = useState(() => emptyJudgements(pairNames.length))
  const [current, setCurrent] = useState(0)
  const [anchors, setAnchors] = useState<{ best: number | null; worst: number | null }>({ best: 2, worst: 3 })
  const [bwmValue, setBwmValue] = useState<Ratio | null>(null)
  const [flagValue, setFlagValue] = useState<Ratio>(7)
  const q = ahpQs[current]!
  const done = progress(ahpQs, j.pairs, () => AHP)
  const answer = (v: Ratio) => {
    const next = setPair(j, q.a, q.b, v)
    setJ(next)
    setCurrent(nextUnanswered(ahpQs, next.pairs, () => AHP, current) ?? current)
  }
  return (
    <div data-dev="pairwise" className="flex flex-col gap-10">
      <div data-card="ahp" className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <PairwiseCard
          question={q}
          mode={AHP}
          names={pairNames}
          value={j.pairs[q.a]![q.b]!}
          position={{ index: current, total: ahpQs.length }}
          onAnswer={answer}
          onBack={() => setCurrent((c) => Math.max(0, c - 1))}
          labels={pairLabels}
        />
        <div className="flex max-w-[480px] flex-col gap-8">
          <JudgementPanel
            names={pairNames}
            weights={done.answered === 0 ? null : [0.41, 0.18, 0.29, 0.12]}
            provisional={done.answered < done.total}
            consistency={null}
            flagged={null}
            labels={panelLabels}
          />
          <PairList
            questions={ahpQs}
            answers={ahpQs.map((x) => answerOf(x, j.pairs, AHP))}
            current={current}
            flagged={null}
            names={pairNames}
            onJump={setCurrent}
            labels={listLabels}
          />
        </div>
      </div>
      <div data-card="bwm" className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <PairwiseCard
          question={{ a: 2, b: 0, fixed: 'a' }}
          mode={{ kind: 'bwm', cap: 3 }}
          names={pairNames}
          value={bwmValue}
          position={{ index: 1, total: 5 }}
          onAnswer={setBwmValue}
          onBack={() => {}}
          labels={pairLabels}
        />
        <AnchorPicker
          names={pairNames}
          best={anchors.best}
          worst={anchors.worst}
          onChange={(best, worst) => setAnchors({ best, worst })}
          labels={{ best: 'Most important (best)', worst: 'Least important (worst)' }}
        />
      </div>
      <div data-card="flagged" className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <PairwiseCard
          question={{ a: 0, b: 2 }}
          mode={AHP}
          names={pairNames}
          value={flagValue}
          position={{ index: 3, total: 6 }}
          flag={{ suggestion: 3 }}
          onAnswer={setFlagValue}
          onBack={() => {}}
          labels={pairLabels}
        />
        <div className="flex max-w-[480px] flex-col gap-8">
          <JudgementPanel
            names={pairNames}
            weights={flagValue === 7 ? [0.52, 0.16, 0.22, 0.1] : [0.44, 0.17, 0.28, 0.11]}
            provisional={false}
            consistency={{ value: flagValue === 7 ? 0.14 : 0.04, threshold: 0.1, approximate: false }}
            flagged={flagValue === 7 ? 0 : null}
            labels={panelLabels}
          />
          <JudgementPanel
            names={['Price', 'Comfort']}
            weights={[0.75, 0.25]}
            provisional={false}
            consistency={null}
            flagged={null}
            labels={panelLabels}
          />
        </div>
      </div>
    </div>
  )
}

/** `/dev/ui` (dev builds only): every primitive in every state, both table densities. */
export default function DevUi() {
  const nf = useNumberFormat(4)
  const [seg, setSeg] = useState<'critic' | 'equal' | 'manual'>('critic')
  const [num, setNum] = useState<number | null>(0.25)
  const [numMsg, setNumMsg] = useState('')
  const [density, setDensity] = useState<TableDensity>('compact')

  const draft = { alternatives: krishnan.alternatives, criteria: krishnan.criteria.map((c) => ({ name: c.name[nf.lang], type: c.type })), matrix: krishnan.matrix }
  const weights = computeWeights({ problem: draft, weightMethod: 'critic', manualWeights: [] })
  const ranking = computeRanking({ problem: draft, weightMethod: 'critic', manualWeights: [], rankingMethod: 'topsis' }, weights)
  const best = ranking.value ? ranking.value.ranking.indexOf(1) : -1

  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] px-4 pb-24 outline-none md:px-8">
      <header className="py-8">
        <h1 className="text-24 font-semibold text-text">UI primitives</h1>
        <p className="mt-1 text-14 text-text-2">Development only. Switch theme and language in the top bar.</p>
      </header>

      <Section title="Type">
        <div className="flex flex-col gap-2">
          <p className="text-44 font-semibold">Karar verme 44</p>
          <p className="text-32 font-semibold">Ağırlık şeması 32</p>
          <p className="text-24 font-semibold">Çok kriterli sıralama 24</p>
          <p className="text-20 font-medium">İdeal çözüme yakınlık 20</p>
          <p className="text-16">Prose 16: Ğ ğ Ş ş İ ı Ç ç Ö ö Ü ü. Işık, göğüs, şeftali, çiğdem, İstanbul, ılık.</p>
          <p className="text-14">UI 14 regular, <span className="font-medium">500 medium</span>, <span className="font-semibold">600 semibold</span>.</p>
          <p className="text-13 text-text-2">Secondary 13: kriter ağırlıkları eşit dağıtılmadı.</p>
          <p className="text-12 text-text-3">Tertiary 12: kaynak Krishnan vd. (2021).</p>
          <p className="font-mono text-13">Plex Mono 13: 0,1872 0,1838 0,1691 0,2599 0,2000 ğşİı</p>
        </div>
        <div className="mt-4 grid max-w-[480px] grid-cols-2 gap-x-8 text-14">
          <div>
            <p className="text-12 text-text-3">tabular (num)</p>
            <p className="num text-right">111,1111</p>
            <p className="num text-right">999,9999</p>
            <p className="num text-right">0,1872</p>
          </div>
          <div>
            <p className="text-12 text-text-3">proportional</p>
            <p className="text-right">111,1111</p>
            <p className="text-right">999,9999</p>
            <p className="text-right">0,1872</p>
          </div>
        </div>
      </Section>

      <Section title="Colour tokens">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {swatches.map((s) => (
            <div key={s} className="flex flex-col gap-1">
              <div className="h-10 rounded-control border border-line" style={{ background: `var(--${s})` }} />
              <span className="font-mono text-12 text-text-2">--{s}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button">
        <Row label="primary">
          <Button variant="primary">Calculate ranking</Button>
          <Button variant="primary" size="sm">Calculate ranking</Button>
          <Button variant="primary" icon={<DownloadSimple aria-hidden />}>Download .xlsx</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </Row>
        <Row label="secondary">
          <Button>Load example</Button>
          <Button size="sm">Load example</Button>
          <Button icon={<UploadSimple aria-hidden />}>Import .csv</Button>
          <Button disabled>Disabled</Button>
        </Row>
        <Row label="ghost">
          <Button variant="ghost" icon={<Plus aria-hidden />}>Add criterion</Button>
          <Button variant="ghost" size="sm" icon={<Copy aria-hidden />}>Copy as TSV</Button>
          <Button variant="ghost" disabled>Disabled</Button>
        </Row>
        <Row label="icon">
          <Tooltip content="Remove row">
            <IconButton aria-label="Remove row" icon={<Trash />} />
          </Tooltip>
          <IconButton aria-label="Copy" icon={<Copy />} size="sm" />
          <IconButton aria-label="Add" icon={<Plus />} bordered />
          <IconButton aria-label="Disabled" icon={<Trash />} disabled />
        </Row>
      </Section>

      <Section title="Fields">
        <div className="grid max-w-[720px] gap-6 md:grid-cols-2">
          <Field label="Alternative name" hint="Shown in tables and charts.">
            <TextInput defaultValue="Smartphone A" />
          </Field>
          <Field label="Criterion name" error="Enter a name for this criterion.">
            <TextInput defaultValue="" placeholder="Price" />
          </Field>
          <Field label="Weight" hint="Accepts 0,25 and 0.25." error={numMsg || undefined}>
            <NumberInput
              value={num}
              decimals={4}
              onValueChange={(v, c) => {
                setNum(v)
                setNumMsg(!c.valid ? 'Enter a number, for example 0.25.' : c.ambiguous && v !== null ? `Read as ${nf.format(v, 3)}.` : '')
              }}
            />
          </Field>
          <Field label="Raw value" hint="Shown as entered.">
            <NumberInput value={1234.5} onValueChange={() => {}} />
          </Field>
          <Field label="Direction">
            <Select
              defaultValue="benefit"
              options={[
                { value: 'benefit', label: '↑ Benefit' },
                { value: 'cost', label: '↓ Cost' },
              ]}
            />
          </Field>
          <Field label="Disabled" optionalLabel="optional">
            <TextInput disabled defaultValue="Read only in this state" />
          </Field>
          <Field label="Small controls">
            <div className="flex gap-2">
              <TextInput controlSize="sm" defaultValue="sm 28 px" />
              <Select controlSize="sm" options={[{ value: 'a', label: 'sm select' }]} />
            </div>
          </Field>
          <Field label="Invalid select" error="Choose benefit or cost for Price.">
            <Select defaultValue="" options={[{ value: '', label: 'Choose' }, { value: 'benefit', label: '↑ Benefit' }]} />
          </Field>
        </div>
        <p className="mt-3 text-12 text-text-3 num">Parsed weight: {num === null ? 'null' : String(num)}</p>
      </Section>

      <Section title="Segmented control and tabs">
        <Row label="segmented sm">
          <SegmentedControl
            aria-label="Weighting method"
            value={seg}
            onValueChange={setSeg}
            options={[
              { value: 'critic', label: 'CRITIC' },
              { value: 'equal', label: 'Equal weights' },
              { value: 'manual', label: 'Manual' },
            ]}
          />
        </Row>
        <Row label="segmented md">
          <SegmentedControl
            aria-label="Weighting method, manual disabled"
            size="md"
            value={seg}
            onValueChange={setSeg}
            options={[
              { value: 'critic', label: 'CRITIC' },
              { value: 'equal', label: 'Equal weights' },
              { value: 'manual', label: 'Manual', disabled: true },
            ]}
          />
        </Row>
        <Tabs defaultValue="table" className="mt-4 max-w-[640px]">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="calc">Calculation</TabsTrigger>
            <TabsTrigger value="off" disabled>
              Disabled
            </TabsTrigger>
          </TabsList>
          <TabsContent value="table">
            <p className="text-14 text-text-2">Tab panel one.</p>
          </TabsContent>
          <TabsContent value="calc">
            <p className="text-14 text-text-2">Tab panel two.</p>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Floating: tooltip, popover, menu, dialog">
        <Row label="triggers">
          <Tooltip content="Tooltip text">
            <Button>Hover for tooltip</Button>
          </Tooltip>
          <Popover>
            <PopoverTrigger asChild>
              <Button>Open popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="font-medium">Source</p>
              <p className="mt-1 text-13 text-text-2">Krishnan et al. (2021), Symmetry 13(6), 973.</p>
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>Open menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Export</DropdownMenuLabel>
              <DropdownMenuItem icon={<DownloadSimple aria-hidden />} shortcut={<Kbd>Ctrl S</Kbd>}>
                Download .xlsx
              </DropdownMenuItem>
              <DropdownMenuItem icon={<Copy aria-hidden />}>Copy as TSV</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open dialog</Button>
            </DialogTrigger>
            <DialogContent
              title="Replace the current data?"
              description="Loading the example replaces the matrix you entered."
              footer={
                <>
                  <DialogClose asChild>
                    <Button>Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="primary">Load example</Button>
                  </DialogClose>
                </>
              }
            >
              <p className="text-14 text-text-2">Dialog body.</p>
            </DialogContent>
          </Dialog>
        </Row>
      </Section>

      <Section title="Table">
        <div className="mb-3">
          <SegmentedControl
            aria-label="Density"
            value={density}
            onValueChange={setDensity}
            options={[
              { value: 'compact', label: 'Compact 32' },
              { value: 'regular', label: 'Regular 40' },
            ]}
          />
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          {(['compact', 'regular'] as const).map((d) => (
            <div key={d} className="min-w-0">
              <p className="mb-2 text-12 text-text-3">{d}: Krishnan et al. (2021), CRITIC weights then TOPSIS</p>
              <Table density={d} maxHeight={260}>
                <THead>
                  <Tr>
                    <Th>Alternative</Th>
                    {draft.criteria.map((c) => (
                      <Th key={c.name} numeric>
                        {c.name}
                      </Th>
                    ))}
                    <Th numeric>C</Th>
                  </Tr>
                </THead>
                <TBody>
                  {draft.alternatives.map((a, i) => (
                    <Tr key={a} selected={i === best}>
                      <Th scope="row">{a}</Th>
                      {draft.matrix[i]!.map((v, j) => (
                        <Td key={j} numeric>
                          {nf.formatRaw(v)}
                        </Td>
                      ))}
                      <Td numeric mono>
                        {nf.format(ranking.value?.scores[i])}
                      </Td>
                    </Tr>
                  ))}
                  <Tr>
                    <Th scope="row">w</Th>
                    {weights.value?.weights.map((w, j) => (
                      <Td key={j} numeric mono>
                        {nf.format(w)}
                      </Td>
                    ))}
                    <Td />
                  </Tr>
                </TBody>
              </Table>
            </div>
          ))}
        </div>
        <p className="mt-4 mb-2 text-12 text-text-3">Selected density ({density}), empty body</p>
        <Table density={density}>
          <THead>
            <Tr>
              <Th>Alternative</Th>
              <Th numeric>Score</Th>
            </Tr>
          </THead>
          <TBody>
            <Tr>
              <Td colSpan={2} className="text-text-3">
                No rows.
              </Td>
            </Tr>
          </TBody>
        </Table>
      </Section>

      <Section title="Formula">
        <Formula display tex={String.raw`r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{i=1}^{m} x_{ij}^{2}}}`} />
        <Formula display tex={String.raw`C_j = \sigma_j \sum_{k=1}^{n} \left(1 - \rho_{jk}\right), \qquad w_j = \frac{C_j}{\sum_{k=1}^{n} C_k}`} />
        <p className="mt-2 text-14">
          Inline: closeness <Formula tex={String.raw`C_i = D_i^- / (D_i^+ + D_i^-)`} /> ranks alternatives.
        </p>
        <p className="mt-2 text-14">
          Broken TeX shows the source: <Formula tex={String.raw`\frac{a}{`} />
        </p>
      </Section>

      <Section title="Notice and error summary">
        <div className="flex max-w-[640px] flex-col gap-3">
          <Notice title="CRITIC needs variation">A constant criterion gets weight 0.</Notice>
          <Notice tone="warning">With fewer than 4 alternatives the correlations are unstable.</Notice>
          <Notice tone="danger" title="Ranking not calculated">Weights sum to 0.950, they must sum to 1.</Notice>
          <ErrorSummary
            autoFocus={false}
            errors={[
              { targetId: 'dev-missing', message: 'Enter a number for B on Price.' },
              { targetId: 'dev-missing-2', message: 'Weights sum to 0.950, they must sum to 1.' },
            ]}
          />
        </div>
      </Section>

      <Section title="Empty, loading, keys">
        <EmptyState
          title="No decision matrix yet"
          description="Add alternatives and criteria, paste a block copied from a spreadsheet, or load a published example."
          action={
            <>
              <Button variant="primary">Load example</Button>
              <Button>Start with an empty table</Button>
            </>
          }
        />
        <div className="flex max-w-[480px] flex-col gap-2">
          <Skeleton height={32} />
          <Skeleton height={32} width="80%" />
          <Skeleton height={32} width="60%" />
        </div>
        <p className="mt-6 flex items-center gap-1.5 text-13 text-text-2">
          Navigate with <Kbd>Tab</Kbd> <Kbd>Enter</Kbd>, edit with <Kbd>F2</Kbd>.
        </p>
      </Section>

      <Section title="Pairwise card">
        <PairwiseDemo />
      </Section>
    </main>
  )
}
