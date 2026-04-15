import React, { useEffect } from 'react';
import i18n from '../i18n';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../hooks/useTheme';

export default function SettingsSync() {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings?.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings?.language]);

  // Aplica tema global (añade clases al root)
  useTheme();

  return null;
}

