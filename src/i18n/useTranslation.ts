import { useVeilStore } from '../store/useStore';
import { t, TRANSLATIONS } from './translations';
import type { Lang } from './translations';

/** Returns the full translations object for the current language. */
export function useTranslation() {
  const lang = useVeilStore(s => s.lang);
  return TRANSLATIONS[lang];
}

/** Returns only a section of translations — avoids re-renders from other sections. */
export function useTranslationSection<K extends keyof ReturnType<typeof t>>(
  section: K
): ReturnType<typeof t>[K] {
  const lang = useVeilStore(s => s.lang);
  return TRANSLATIONS[lang][section];
}

export type { Lang };
