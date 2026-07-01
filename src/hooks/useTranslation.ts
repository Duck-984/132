import { useAppStore } from '../store/useAppStore';
import { translations, TranslationKey } from '../lib/translations';

export const useTranslation = () => {
  const language = useAppStore((state) => state.language);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return { t, language };
};
