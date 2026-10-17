import { critic } from './critic'
import { edas } from './edas'
import { entropy } from './entropy'
import { equal } from './equal'
import { manual } from './manual'
import { merec } from './merec'
import { saw } from './saw'
import { sd } from './sd'
import { topsis } from './topsis'
import type { FlowNode, MethodSteps, StepContent } from './types'
import { vikor } from './vikor'
import { waspas } from './waspas'

export type { FlowNode, MethodSteps, StepContent } from './types'

/**
 * Every method's step module (`src/content/steps/<id>.ts`), by method id. Import this index only from
 * lazy code (WorkedCalculation): the TeX must stay out of the main chunk.
 */
const modules = { critic, entropy, sd, merec, equal, manual, topsis, saw, vikor, edas, waspas }
type Modules = typeof modules

export type StepKey = { [M in keyof Modules]: keyof Modules[M]['steps'] & string }[keyof Modules]

export const stepContent: Readonly<Record<StepKey, StepContent>> = Object.assign({}, ...Object.values(modules).map((m) => m.steps))

export const STEP_KEYS = Object.keys(stepContent) as StepKey[]

export const isStepKey = (key: string): key is StepKey => Object.hasOwn(stepContent, key)

/**
 * The step map of a method, limited to the nodes whose steps were emitted (the Entropy variants share one
 * map), or null when the method has none or none of its nodes is present.
 */
export function stepFlow(methodId: string, stepKeys: readonly string[]): FlowNode[] | null {
  const flow = Object.hasOwn(modules, methodId) ? (modules as Record<string, MethodSteps>)[methodId]!.flow : undefined
  const nodes = flow?.filter((n) => n.stepKeys.some((k) => stepKeys.includes(k))) ?? []
  return nodes.length > 0 ? nodes : null
}
