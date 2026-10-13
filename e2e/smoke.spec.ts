import { expect, test } from '@playwright/test';
import { logDeepWork, onboard, open, tap } from './helpers';

test('onboarding lands on an empty Today', async ({ page }) => {
  await open(page);
  await onboard(page);
  await expect(page.getByText('Good evening')).toBeVisible();
  await expect(page.getByText('Start with one focus block.')).toBeVisible();
});

test('onboarding needs at least two activities of each kind', async ({ page }) => {
  await open(page);
  await tap(page, 'Begin');
  await tap(page, 'Continue');
  await tap(page, 'Continue'); // now on the work step with three picked
  await tap(page, '💻 Deep Work');
  await tap(page, '🏋️ Workout');
  await tap(page, 'Continue'); // only one left: the step must not advance
  await expect(page.getByText('What counts as work?')).toBeVisible();
  await tap(page, '🚀 Side Project');
  await tap(page, 'Continue');
  await expect(page.getByText('How do you like to rest?')).toBeVisible();
});

test('logged work fills the rest bank at the chosen ratio', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120); // 2 h at 30 min per hour
  await expect(page.getByText('You have 60 min of rest saved.')).toBeVisible();
});

test('booking holds rest, finishing early gives it back', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120);
  await tap(page, 'Book rest');
  await tap(page, 'Start now');
  await expect(page.getByText('Resting', { exact: true })).toBeVisible();
  await tap(page, 'Finish early');
  await expect(page.getByText(/Skipped\. 60 min are back in your bank\./)).toBeVisible();
});

test('a full slot counts as taken', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120);
  await tap(page, 'Book rest');
  await tap(page, 'Start now');
  await page.clock.fastForward('01:01:00');
  await expect(page.getByText('Time is up')).toBeVisible();
  await tap(page, 'Finish');
  await expect(page.getByText('Rest taken: 60 min. Well spent.')).toBeVisible();
});

test('bedtime rule blocks rest that runs into the night', async ({ page }) => {
  await open(page, new Date(2026, 9, 13, 22, 30));
  await onboard(page, ['Not enough sleep']);
  await logDeepWork(page, 120);
  await tap(page, 'Book rest');
  await expect(page.getByText('Your bedtime rule: rest has to end by 23:00.')).toBeVisible();
});

test('data survives a reload', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120);
  await page.reload();
  await expect(page.getByText('You have 60 min of rest saved.')).toBeVisible();
});

test('a backup restores on a fresh install', async ({ page, browser }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120);
  await tap(page, 'Settings');
  await page.getByRole('button', { name: 'Backup and restore' }).click();
  const backup = await page.getByLabel('Backup text').inputValue();
  expect(backup.length).toBeGreaterThan(50);

  const fresh = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await open(fresh);
  await tap(fresh, 'I have a backup');
  await fresh.getByLabel('Backup to restore').fill('not a backup');
  await fresh.getByRole('button', { name: 'Restore' }).click();
  await expect(fresh.getByText('Rest you can book')).toHaveCount(0);
  await fresh.getByLabel('Backup to restore').fill(backup);
  await fresh.getByRole('button', { name: 'Restore' }).click();
  await expect(fresh.getByText('You have 60 min of rest saved.')).toBeVisible();
});

test('Book rest stays reachable after the workday ends', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120);
  await tap(page, 'Book rest');
  await tap(page, '30 min');
  await tap(page, 'In 30 min');
  await tap(page, 'Book it');
  await expect(page.getByText('The workday is over.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Book rest' })).toBeVisible();
});

test('reminders explain themselves when notifications are unavailable', async ({ page }) => {
  await open(page);
  await onboard(page);
  await tap(page, 'Settings');
  await page.getByRole('switch', { name: 'Close the day at the end of work' }).click();
  await expect(page.getByText('Reminders work in the phone app.')).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Close the day at the end of work' })).not.toBeChecked();
});
