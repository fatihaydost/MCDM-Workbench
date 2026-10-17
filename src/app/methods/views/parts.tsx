import { useTranslation } from 'react-i18next'
import type { ExampleDataset } from '../../../data/examples'
import type { IdeaStepsLabels } from '../../../features/illustrations/IdeaSteps'
import { useLang } from '../../../i18n'

/** The citation line under a method page's picture. */
export function IdeaSource({ example }: { example: ExampleDataset }) {
  const { t } = useTranslation()
  const [lang] = useLang()
  return <p className="text-12 text-text-2">{t('methods.page.idea.source', { citation: example.name[lang] })}</p>
}

/** The words of the "Step through" control under a method page's picture. */
export function useStepLabels(): IdeaStepsLabels {
  const { t } = useTranslation()
  return {
    start: t('methods.page.idea.steps.start'),
    group: t('methods.page.idea.steps.group'),
    back: t('methods.page.idea.steps.back'),
    next: t('methods.page.idea.steps.next'),
    finish: t('methods.page.idea.steps.finish'),
    close: t('methods.page.idea.steps.close'),
    progress: (n, count) => t('methods.page.idea.steps.progress', { n, count }),
  }
}
