import { test } from '@playwright/test';
import { logDeepWork, onboard, open, tap } from './helpers';

// Store screenshots from the web build, 1290x2796 (the iPhone 6.7" size).
//   SHOTS=1 npx playwright test e2e/store-shots.spec.ts
// Skipped in normal runs. Output goes to docs/store-screenshots/.
test.skip(!process.env.SHOTS, 'only when SHOTS=1');
test.use({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });

const out = (name: string) => `docs/store-screenshots/${name}.png`;

test('store screenshots', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120);
  await page.screenshot({ path: out('1-today') });

  await tap(page, 'History');
  await page.screenshot({ path: out('4-history') });
  await tap(page, 'Done');

  await tap(page, 'Book rest');
  await page.screenshot({ path: out('2-book') });
  await tap(page, 'Start now');
  await page.screenshot({ path: out('3-resting') });
});
