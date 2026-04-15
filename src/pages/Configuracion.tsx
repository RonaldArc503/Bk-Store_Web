import { useEffect, useMemo, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { useSettings } from '../context/SettingsContext';
import i18n from '../i18n';
import { useTranslation } from 'react-i18next';
// Si usas react-toastify, descomenta estas líneas y añade la importación del CSS en main.tsx
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

const timezones = [
  Intl.DateTimeFormat().resolvedOptions().timeZone,
  'UTC',
  'America/El_Salvador',
  'America/New_York',
  'Europe/Madrid',
];

export default function ConfiguracionPage() {
  let ctx;
  try {
    ctx = useSettings();
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Cargando configuración... (verifica SettingsProvider)</p>
      </div>
    );
  }

  const { settings, setSetting, resetSettings } = ctx;
  const { t } = useTranslation();

  // Form local: mantiene cambios hasta que el usuario pulse "Aplicar"
  const [form, setForm] = useState({
    theme: settings.theme,
    language: settings.language,
    notifications: settings.notifications,
    printMargins: settings.printMargins,
    timezone: settings.timezone,
    dateFormat: settings.dateFormat,
  });

  // Mantener el form sincronizado si settings cambian por fuera
  useEffect(() => {
    setForm({
      theme: settings.theme,
      language: settings.language,
      notifications: settings.notifications,
      printMargins: settings.printMargins,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
    });
  }, [settings]);

  // Ejemplo de aplicar cambios: actualiza context y i18n
  const applyChanges = async () => {
    // Actualiza cada campo en el context
    setSetting('theme', form.theme);
    setSetting('language', form.language);
    setSetting('notifications', !!form.notifications);
    setSetting('printMargins', form.printMargins as any);
    setSetting('timezone', form.timezone);
    setSetting('dateFormat', form.dateFormat as any);

    // Cambia idioma inmediatamente en i18n
    if (form.language) {
      await i18n.changeLanguage(form.language);
    }

    // Mostrar confirmación (usa toast si lo tienes)
    try {
      // toast.success(t('settings.applied') ?? 'Ajustes aplicados');
      alert(t('settings.applied') ?? 'Ajustes aplicados');
    } catch {
      alert('Ajustes aplicados');
    }
  };

  const cancelChanges = () => {
    // Revertir form al estado actual de settings
    setForm({
      theme: settings.theme,
      language: settings.language,
      notifications: settings.notifications,
      printMargins: settings.printMargins,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
    });
  };

  const dateFormatExamples = useMemo(() => ({
    'DD/MM/YYYY': '31/12/2026',
    'MM/DD/YYYY': '12/31/2026',
    'YYYY-MM-DD': '2026-12-31',
  }), []);

  const requestNotification = async (enable: boolean) => {
    if (!enable) {
      setForm(prev => ({ ...prev, notifications: false }));
      return;
    }
    if (!('Notification' in window)) {
      alert(t('settings.notificationsUnsupported') ?? 'Notificaciones no soportadas en este navegador.');
      setForm(prev => ({ ...prev, notifications: false }));
      return;
    }
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    setForm(prev => ({ ...prev, notifications: granted }));
    if (!granted) alert(t('settings.notificationsDenied') ?? 'Permiso de notificaciones denegado.');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      <Sidebar activeItem="configuracion" />

      <main className="flex-1 overflow-auto md:p-8 p-4 pt-20 md:pt-0">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-lime-100 dark:bg-lime-950/50 flex items-center justify-center">
              <SettingsIcon className="w-7 h-7 text-lime-600 dark:text-lime-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {t('settings.title') ?? 'Configuración'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {t('settings.subtitle') ?? 'Preferencias del sistema'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-6">
            {/* Tema */}
            <section>
              <h3 className="font-semibold mb-2">{t('settings.theme') ?? 'Tema'}</h3>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.theme === 'dark'}
                  onChange={(e) => setForm(prev => ({ ...prev, theme: e.target.checked ? 'dark' : 'light' }))}
                />
                <span>{form.theme === 'dark' ? (t('settings.dark') ?? 'Oscuro') : (t('settings.light') ?? 'Claro')}</span>
              </label>
            </section>

            {/* Idioma */}
            <section>
              <h3 className="font-semibold mb-2">{t('settings.language') ?? 'Idioma'}</h3>
              <select
                value={form.language}
                onChange={(e) => setForm(prev => ({ ...prev, language: e.target.value }))}
                className="border rounded px-3 py-2"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </section>

            {/* Notificaciones */}
            <section>
              <h3 className="font-semibold mb-2">{t('settings.notifications') ?? 'Notificaciones'}</h3>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!form.notifications}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    // pedimos permiso solo si se activa
                    if (checked) requestNotification(true);
                    else setForm(prev => ({ ...prev, notifications: false }));
                  }}
                />
                <span>{t('settings.enableNotifications') ?? 'Activar notificaciones'}</span>
              </label>
            </section>

            {/* Impresión */}
            <section>
              <h3 className="font-semibold mb-2">{t('settings.print') ?? 'Impresión'}</h3>
              <div className="flex items-center gap-3">
                <select
                  value={form.printMargins}
                  onChange={(e) => setForm(prev => ({ ...prev, printMargins: e.target.value as any }))}
                  className="border rounded px-3 py-2"
                >
                  <option value="default">{t('settings.printDefault') ?? 'Default'}</option>
                  <option value="narrow">{t('settings.printNarrow') ?? 'Narrow'}</option>
                  <option value="wide">{t('settings.printWide') ?? 'Wide'}</option>
                </select>
                <button onClick={() => window.print()} className="px-3 py-2 bg-slate-600 text-white rounded">
                  {t('settings.printNow') ?? 'Imprimir'}
                </button>
              </div>
            </section>

            {/* Zona horaria */}
            <section>
              <h3 className="font-semibold mb-2">{t('settings.timezone') ?? 'Zona horaria'}</h3>
              <select
                value={form.timezone}
                onChange={(e) => setForm(prev => ({ ...prev, timezone: e.target.value }))}
                className="border rounded px-3 py-2"
              >
                {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </section>

            {/* Formato de fecha */}
            <section>
              <h3 className="font-semibold mb-2">{t('settings.dateFormat') ?? 'Formato de fecha'}</h3>
              <select
                value={form.dateFormat}
                onChange={(e) => setForm(prev => ({ ...prev, dateFormat: e.target.value as any }))}
                className="border rounded px-3 py-2"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY — {dateFormatExamples['DD/MM/YYYY']}</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY — {dateFormatExamples['MM/DD/YYYY']}</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD — {dateFormatExamples['YYYY-MM-DD']}</option>
              </select>
            </section>

            <div className="flex gap-3">
              <button onClick={applyChanges} className="px-4 py-2 bg-lime-600 text-white rounded">
                {t('settings.apply')}
              </button>
              <button onClick={cancelChanges} className="px-4 py-2 bg-gray-200 text-gray-800 rounded">
                {t('settings.cancel')}
              </button>
              <button onClick={resetSettings} className="px-4 py-2 bg-red-500 text-white rounded ml-auto">
                {t('settings.reset') ?? 'Restablecer ajustes'}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
