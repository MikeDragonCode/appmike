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

test('a weekly recap appears after a week of use and goes away once seen', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120);
  await expect(page.getByText('Your week', { exact: true })).toHaveCount(0);
  await page.clock.fastForward(7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);
  await page.clock.runFor(16_000); // let the clock on Today tick once
  await expect(page.getByText('You worked 2h and rested 0m.')).toBeVisible();
  await tap(page, 'Got it');
  await page.clock.runFor(16_000);
  await expect(page.getByText('Your week', { exact: true })).toHaveCount(0);
});

test('rest taken without booking can be logged, and undone', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120); // 60 saved
  await tap(page, 'Log rest I already took');
  await page.getByRole('button', { name: 'Log rest' }).click();
  await expect(page.getByText('20m came out of your bank.')).toBeVisible();
  await tap(page, 'Undo this entry');
  await expect(page.getByText('You have 60 min of rest saved.')).toBeVisible();
  await tap(page, 'Log rest I already took');
  await page.getByRole('button', { name: 'Log rest' }).click();
  await tap(page, 'Done');
  await expect(page.getByText('Today earned 1h, spent 20m.')).toBeVisible();
});

test('a counter tap can be undone right away', async ({ page }) => {
  await open(page);
  await tap(page, 'Begin');
  await tap(page, 'Continue');
  await tap(page, 'Continue');
  await tap(page, '🍳 Cook / Chores');
  for (let i = 0; i < 3; i++) await tap(page, 'Continue');
  await tap(page, 'Start');
  await tap(page, '+1');
  await expect(page.getByText('+15 min of rest')).toBeVisible();
  await expect(page.getByText('You have 15 min of rest saved.')).toBeHidden();
  await tap(page, 'Undo');
  await expect(page.getByText('+15 min of rest')).toBeHidden();
  await expect(page.getByText('Start with one focus block.')).toBeVisible();
});

test('a running slot can be extended', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 180); // 90 saved
  await tap(page, 'Book rest');
  await tap(page, '30 min');
  await tap(page, 'Start now');
  await expect(page.getByText('30 min slot,')).toBeVisible();
  await tap(page, 'Add 15 min');
  await expect(page.getByText('45 min slot,')).toBeVisible();
  await page.clock.fastForward('00:46:00');
  await expect(page.getByText('Time is up')).toBeVisible();
  await tap(page, 'Finish');
  await expect(page.getByText('Rest taken: 45 min. Well spent.')).toBeVisible();
});

test('history lets you fix an entry and the bank follows', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120); // 60 saved
  await tap(page, 'History');
  await expect(page.getByText('Work 2h, rest 0m')).toBeVisible();
  for (let i = 0; i < 6; i++) await page.getByLabel('Decrease 💻 Deep Work').click();
  await expect(page.getByText('Work 1h 30m, rest 0m')).toBeVisible();
  await tap(page, 'Done');
  await expect(page.getByText('Today earned 45m, spent 0m.')).toBeVisible();
});

test('history can add something that was forgotten', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 60);
  await tap(page, 'History');
  await tap(page, 'Add an entry');
  await page.getByRole('button', { name: /Workout/ }).click();
  await expect(page.getByText('Work 1h 30m, rest 0m')).toBeVisible(); // 60 + 30
  await tap(page, 'Done');
  await expect(page.getByText('Today earned 53m, spent 0m.')).toBeVisible(); // 30 + 22.5, rounded
});

test('a booked slot can be moved to another time', async ({ page }) => {
  await open(page);
  await onboard(page);
  await logDeepWork(page, 120);
  await tap(page, 'Book rest');
  await tap(page, '30 min');
  await tap(page, 'In 1 hour');
  await tap(page, 'Book it');
  await tap(page, 'Next rest');
  await expect(page.getByText('19:30', { exact: true })).toBeVisible();
  await tap(page, 'Change time');
  await page.getByLabel('Increase Today').click();
  await page.getByLabel('Increase Today').click();
  await tap(page, 'Move it here');
  await expect(page.getByText('20:00', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Move it here')).toHaveCount(0);
  await tap(page, 'Close');
  await expect(page.getByText('Today 20:00, 30 min')).toBeVisible();
});
