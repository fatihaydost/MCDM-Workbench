import { preloadable } from '../../preloadable'
import type { MethodView } from './types'

const pictures = () => import('./ahp.pictures')

export const ahpRanking: MethodView<'ranking'> = {
  kind: 'ranking',
  page: 'ahp',
  stage: preloadable(() => pictures().then((m) => ({ default: m.RankingStage }))),
  pictureShowsScores: true,
}
