import { Desktop, GithubLogo, Moon, Sun } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Link, useRoute } from 'wouter'
import { LANGS, useLang, type Lang } from '../../i18n'
import { useThemeMode, type ThemeMode } from '../../state/theme'
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  IconButton,
  iconButtonClasses,
  SegmentedControl,
} from '../../ui'
import { LogoMark } from './LogoMark'

export const REPO_URL = 'https://github.com/fatihaydost/MCDM-Workbench'

const themeIcons: Record<ThemeMode, typeof Sun> = { system: Desktop, light: Sun, dark: Moon }

function NavLink({ href, children }: { href: string; children: string }) {
  const [active] = useRoute(`${href}/*?`)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex h-8 items-center rounded-control px-2 text-14 font-medium whitespace-nowrap no-underline transition-colors',
        active ? 'text-text' : 'text-text-2 hover:text-text',
      )}
    >
      {children}
    </Link>
  )
}

function LanguageSwitch() {
  const { t } = useTranslation()
  const [lang, setLang] = useLang()
  return (
    <SegmentedControl<Lang>
      aria-label={t('nav.language')}
      value={lang}
      onValueChange={setLang}
      options={LANGS.map((l) => ({
        value: l,
        label: l.toUpperCase(),
        // Starts with the visible text (WCAG 2.5.3 label in name), then the language's own name.
        ariaLabel: t(`nav.languageNames.${l}`),
      }))}
    />
  )
}

function ThemeMenu() {
  const { t } = useTranslation()
  const [mode, setMode] = useThemeMode()
  const Icon = themeIcons[mode]
  const modeLabel = t(`nav.theme.${mode}`)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton aria-label={t('nav.theme.button', { mode: modeLabel })} icon={<Icon />} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{t('nav.theme.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => setMode(v as ThemeMode)}>
          {(['system', 'light', 'dark'] as const).map((m) => {
            const I = themeIcons[m]
            return (
              <DropdownMenuRadioItem key={m} value={m}>
                <I aria-hidden />
                {t(`nav.theme.${m}`)}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * 60 px top bar: mark and name (subtitle under the name from 1024 px), main nav, language, theme, GitHub (from 640 px;
 * the footer carries it below). On the landing and method pages the content sits in the page container so the mark lines
 * up with the page's left edge; in the workbench it spans the full width and lines up with the stage rail.
 */
export function TopBar() {
  const { t } = useTranslation()
  const [inWorkbench] = useRoute('/app/*?')
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-bg">
      <div
        className={cn(
          'flex h-15 items-center gap-2',
          inWorkbench ? 'w-full px-4' : 'mx-auto w-full max-w-[1200px] px-4 md:px-8',
        )}
      >
        <a
          href="#main"
          className="sr-only rounded-control bg-surface px-2 py-1 text-13 focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          {t('nav.skipToContent')}
        </a>
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-control no-underline">
          {/* Phones show the mark alone so the nav and the controls fit in 360 px; the name stays in the accessible label. */}
          <LogoMark size={24} className="shrink-0 text-accent lg:hidden" />
          <LogoMark size={32} className="hidden shrink-0 text-accent lg:block" />
          <span className="flex flex-col leading-tight">
            <span className="sr-only text-14 font-semibold text-text sm:not-sr-only">{t('common.wordmark')}</span>
            <span className="hidden text-12 text-text-2 lg:inline">{t('common.productName')}</span>
          </span>
        </Link>
        <nav aria-label={t('nav.main')} className="ml-2 flex items-center gap-1 sm:ml-6 lg:ml-10">
          <NavLink href="/app">{t('nav.workbench')}</NavLink>
          <NavLink href="/methods">{t('nav.methods')}</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch />
          <ThemeMenu />
          <span className="hidden sm:inline-flex">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t('nav.github')}
              className={iconButtonClasses()}
            >
              <GithubLogo aria-hidden />
            </a>
          </span>
        </div>
      </div>
    </header>
  )
}
