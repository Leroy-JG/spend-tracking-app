import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_AUTO_BACKUP, normalizeAutoBackup, type AutoBackupSettings } from './domain/autobackup';
import { readData } from './domain/exchange';
import { EMPTY_DATA, type Data } from './domain/types';

/** Toutes les données (tags + dépenses) dans une seule clé : l'écriture est atomique. */
const DATA_KEY = 'sp:data:v1';

/** Données enregistrées sur l'appareil (jamais envoyées ailleurs). Tout ce qui est abîmé est écarté, l'app s'ouvre toujours. */
export async function loadData(): Promise<Data> {
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    return raw ? readData(JSON.parse(raw), false) : EMPTY_DATA;
  } catch {
    return EMPTY_DATA; // stockage indisponible ou contenu illisible
  }
}

/** Renvoie false si l'écriture a échoué (navigation privée, disque plein…) : l'interface le signale. */
export async function saveData(data: Data): Promise<boolean> {
  try {
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export async function eraseData(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(DATA_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Réglages (sauvegardes automatiques) : une clé à part, pour ne pas mêler ces réglages aux données exportées. */
const SETTINGS_KEY = 'sp:settings:v1';

export interface Settings {
  autoBackup: AutoBackupSettings;
}

export const DEFAULT_SETTINGS: Settings = { autoBackup: DEFAULT_AUTO_BACKUP };

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as { autoBackup?: unknown }) : {};
    return { autoBackup: normalizeAutoBackup(parsed?.autoBackup) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<boolean> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export async function eraseSettings(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
    return true;
  } catch {
    return false;
  }
}
