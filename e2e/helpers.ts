import { Page, expect } from '@playwright/test';

// Tuesday 18:30, a normal working day, evening.
export const TUESDAY_EVENING = new Date(2026, 9, 13, 18, 30);

export async function open(page: Page, at: Date = TUESDAY_EVENING) {
  await page.clock.install({ time: at });
  await page.goto('/');
  await expect(page.getByText('Shift to Life', { exact: true }).first()).toBeVisible();
}

export const tap = (page: Page, text: string) => page.getByText(text, { exact: true }).first().click();

// Walks the questionnaire. Pass struggle titles to pick; everything else stays default.
export async function onboard(page: Page, struggles: string[] = []) {
  await tap(page, 'Begin');
  for (const s of struggles) await tap(page, s);
  for (let i = 0; i < 5; i++) await tap(page, 'Continue');
  await tap(page, 'Start');
  await expect(page.getByText('Rest you can book')).toBeVisible();
}

// Logs minutes of Deep Work by hand (the stepper starts at 30 and moves by 5).
export async function logDeepWork(page: Page, minutes: number) {
  await tap(page, 'Start Deep Work');
  const steps = Math.round((minutes - 30) / 5);
  const label = steps >= 0 ? 'Increase Time already done' : 'Decrease Time already done';
  for (let i = 0; i < Math.abs(steps); i++) await page.getByLabel(label).click();
  await page.getByRole('button', { name: /^Log .* I already did$/ }).click();
  await tap(page, 'Done');
}
