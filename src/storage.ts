import AsyncStorage from '@react-native-async-storage/async-storage';
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
