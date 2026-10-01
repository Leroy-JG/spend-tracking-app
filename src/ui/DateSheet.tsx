import { useEffect, useState } from 'react';
import { parseKey } from '../domain/dates';
import { t } from '../i18n';
import { Sheet } from './components';
import { MonthGrid } from './MonthGrid';

/** Feuille de choix d'un jour : toucher un jour le choisit et ferme la feuille. */
export function DateSheet({
  visible,
  value,
  title,
  markers,
  onPick,
  onClose,
}: {
  visible: boolean;
  value: string;
  title?: string;
  markers?: Map<string, string[]>;
  onPick: (day: string) => void;
  onClose: () => void;
}) {
  const [cursor, setCursor] = useState(() => parseKey(value));
  useEffect(() => {
    if (visible) setCursor(parseKey(value));
  }, [visible, value]);

  return (
    <Sheet visible={visible} title={title ?? t('date.pick')} onClose={onClose}>
      <MonthGrid
        year={cursor.year}
        month={cursor.month0}
        onChangeMonth={(year, month0) => setCursor({ year, month0, day: 1 })}
        selected={value}
        markers={markers}
        onSelect={(day) => {
          onPick(day);
          onClose();
        }}
      />
    </Sheet>
  );
}
