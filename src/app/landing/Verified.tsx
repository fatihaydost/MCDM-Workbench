import { useTranslation } from 'react-i18next'
import { Link } from 'wouter'
import { doiUrl, getExample, shortCitation, type Citation } from '../../data/examples'
import { formatNumber, useLang, type Lang } from '../../i18n'
// Tolerances come straight from the test fixtures, so the page cannot drift from what the tests check.
import krishnan from '../../../tests/fixtures/critic-krishnan2021.json'
import xlsx from '../../../tests/fixtures/critic-xlsx.json'
import zavadskas from '../../../tests/fixtures/entropy-zavadskas2017.json'
import opricovicF from '../../../tests/fixtures/opricovic-tzeng-2004-f.json'
import { textLink } from './usePageMeta'

type Row = { method: 'critic' | 'entropy' | 'topsis'; citation: Citation; tolerance: number }

/** ±0.00005 in the active locale, with as many decimals as the tolerance needs. */
function formatTolerance(tol: number, lang: Lang): string {
  const decimals = Math.max(0, Math.ceil(-Math.log10(tol)))
  return `±${formatNumber(tol, lang, decimals)}`
}

/** "±10⁻¹²" for the tiny parity tolerances. */
function formatPower(tol: number): string {
  const exp = Math.round(Math.log10(tol))
  const sup: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
  return `±10${String(exp).replace(/./g, (c) => sup[c] ?? c)}`
}

/** Printed decimals a half-unit tolerance stands for: 0.00005 -> 4, 0.0005 -> 3. */
const decimalsOf = (tol: number): number => Math.max(0, Math.round(-Math.log10(tol * 2)))

/**
 * "Checked against published results": one ledger row per method, the claim in words first and the
 * tolerance as small secondary text. Other checks sit behind a disclosure.
 */
export function Verified() {
  const { t } = useTranslation()
  const [lang] = useLang()
  const rows: Row[] = [
    { method: 'critic', citation: getExample('krishnan-2021-smartphones')!.citation, tolerance: krishnan.expected.tolerance },
    { method: 'entropy', citation: getExample('zavadskas-2017-vilnius')!.citation, tolerance: zavadskas.expected.tolerance },
    { method: 'topsis', citation: getExample('opricovic-tzeng-2004-f')!.citation, tolerance: opricovicF.expected.tolerance },
  ]

  return (
    <section aria-labelledby="verified-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="verified-title" className="text-24 font-semibold text-text">
          {t('landing.verified.title')}
        </h2>
        <p className="max-w-[65ch] text-16 text-text-2">{t('landing.verified.lead')}</p>
      </div>

      <ul className="flex flex-col border-t border-line">
        {rows.map((r) => (
          <li key={r.method} className="grid grid-cols-1 gap-x-8 gap-y-1 border-b border-line py-4 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-baseline">
            <Link href={`/methods/${r.method}`} className="text-20 font-semibold text-text no-underline hover:underline">
              {t(`methods.names.${r.method}`)}
            </Link>
            <div className="flex flex-col gap-1">
              <p className="text-16 text-text">
                {t(`landing.verified.${r.method}.claim`, { citation: shortCitation(r.citation, lang), decimals: decimalsOf(r.tolerance) })}
              </p>
              <p className="text-13 text-text-2">
                {r.citation.venue.split(',')[0]}.{' '}
                <a href={doiUrl(r.citation.doi)} className={textLink} target="_blank" rel="noreferrer">
                  doi:{r.citation.doi}
                </a>
              </p>
            </div>
            <span className="num text-13 text-text-2">{t('landing.verified.tolerance', { tol: formatTolerance(r.tolerance, lang) })}</span>
          </li>
        ))}
      </ul>

      <details className="text-13 text-text-2">
        <summary className="cursor-pointer hover:text-text">{t('landing.verified.alsoTitle')}</summary>
        <p className="mt-2 max-w-[80ch]">{t('landing.verified.toleranceNote')}</p>
        <p className="mt-1 max-w-[80ch]">{t('landing.verified.also', { tol: formatPower(xlsx.expected.tolerance) })}</p>
      </details>
    </section>
  )
}
