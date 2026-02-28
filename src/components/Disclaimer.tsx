import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function Disclaimer() {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-warning/5 border-b border-warning/10">
      <AlertTriangle className="w-2.5 h-2.5 text-warning/60 flex-shrink-0" />
      <p className="text-[8px] text-warning/50 leading-tight truncate">
        <span className="font-semibold text-warning/70">{t('disclaimer.label')}</span> {t('disclaimer.text')}
      </p>
    </div>
  );
}
