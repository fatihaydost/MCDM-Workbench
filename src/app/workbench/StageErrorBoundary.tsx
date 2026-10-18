import { Component, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState } from '../../ui'

type Props = { children: ReactNode; onBack: () => void }
type State = { error: unknown }

/**
 * Safety net around a stage's content: an error thrown while rendering a stage shows a short message with a way out
 * instead of an empty page. Keyed by stage in WorkbenchPage, so moving to another stage starts clean.
 */
export class StageErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  override render() {
    return this.state.error ? <StageCrash onBack={this.props.onBack} /> : this.props.children
  }
}

export function StageCrash({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" data-testid="stage-crash">
      <EmptyState
        title={t('workbench.crash.title')}
        description={t('workbench.crash.body')}
        action={
          <>
            <Button onClick={onBack}>{t('workbench.crash.back')}</Button>
            <Button onClick={() => window.location.reload()}>{t('workbench.crash.reload')}</Button>
          </>
        }
      />
    </div>
  )
}
