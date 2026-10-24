import { Desktop, Moon, Sun } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useThemeMode, type ThemeMode } from '../../state/theme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu'
import { IconButton } from '../../ui/IconButton'

const themeIcons: Record<ThemeMode, typeof Sun> = { system: Desktop, light: Sun, dark: Moon }

export default function ThemeDropdown({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { t } = useTranslation()
  const [mode, setMode] = useThemeMode()
  const Icon = themeIcons[mode]
  const modeLabel = t(`nav.theme.${mode}`)
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
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
