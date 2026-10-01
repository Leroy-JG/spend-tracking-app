import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fr } from './i18n/fr';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const NAME = 'Ṣakk';

describe('nom de l’application', () => {
  const { expo } = JSON.parse(read('app.json')) as { expo: { name: string; scheme: string; android: { package: string }; ios: { bundleIdentifier: string }; web: { name: string; shortName: string } } };
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as { name: string; short_name: string };

  it('est le même partout : app, web, manifeste, page, écrans', () => {
    expect(expo.name).toBe(NAME);
    expect(expo.web.name).toBe(NAME);
    expect(expo.web.shortName).toBe(NAME);
    expect(manifest.name).toBe(NAME);
    expect(manifest.short_name).toBe(NAME);
    expect(read('public/index.html')).toContain(`apple-mobile-web-app-title" content="${NAME}"`);
    expect(fr['app.name']).toBe(NAME);
  });

  it('les identifiants techniques sont en ASCII et cohérents', () => {
    expect(expo.android.package).toBe('com.sakk.app');
    expect(expo.ios.bundleIdentifier).toBe('com.sakk.app');
    expect(expo.scheme).toBe('sakk');
    expect(read('.github/workflows/android-apk.yml')).toContain('com.sakk.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION');
  });

  it('plus aucune trace de l’ancien identifiant', () => {
    for (const file of ['app.json', '.github/workflows/android-apk.yml', 'public/sw.js']) expect(read(file), file).not.toMatch(/com\.depenses|Depenses|depenses-cache/);
  });
});
