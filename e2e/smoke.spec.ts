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

test('when rest would run past bedtime, the app offers ways to make it fit', async ({ page }) => {
  await open(page, new Date(2026, 9, 13, 22, 30));
  await onboard(page, ['Not enough sleep']);
  await logDeepWork(page, 120);
  await tap(page, 'Book rest');
  await expect(page.getByText('Your bedtime rule: rest has to end by 23:00.')).toBeVisible();
  await expect(page.getByText('Fits your bedtime')).toBeVisible();
  await tap(page, 'Shorten to 30 min');
  await expect(page.getByText('Your bedtime rule: rest has to end by 23:00.')).toHaveCount(0);
  await tap(page, 'Start now');
  await expect(page.getByText('Resting', { exact: true })).toBeVisible();
});

test('the how-it-works guide opens from settings', async ({ page }) => {
  await open(page);
  await onboard(page);
  await tap(page, 'Settings');
  await expect(page.getByText(/^Version \d+\.\d+\.\d+$/)).toBeVisible();
  await tap(page, 'How it works');
  await expect(page.getByText('Work earns rest', { exact: true })).toBeVisible();
  await page.getByText('Done', { exact: true }).last().click(); // Settings stays mounted underneath
  await expect(page.getByText('Work earns rest', { exact: true })).toBeHidden();
});

test('unreadable saved data is never silently replaced', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('stl.data.v1.unreadable')) localStorage.setItem('stl.data.v1', '{broken');
  });
  await page.clock.install({ time: new Date(2026, 9, 13, 18, 30) });
  await page.goto('/');
  await expect(page.getByText('We could not read your saved data')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('stl.data.v1.unreadable'))).toBe('{broken');
  await tap(page, 'Start fresh');
  await tap(page, 'Tap again to start fresh');
  await expect(page.getByText('Begin', { exact: true })).toBeVisible();
  // the aside copy is still there after starting fresh
  expect(await page.evaluate(() => localStorage.getItem('stl.data.v1.unreadable'))).toBe('{broken');
});

test('a failed save is reported, and the warning goes away once saving works again', async ({ page }) => {
  await open(page);
  await onboard(page);
  await page.evaluate(() => {
    (window as unknown as { __setItem: typeof Storage.prototype.setItem }).__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
  });
  await logDeepWork(page, 60);
  await expect(page.getByText('Not saved', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as unknown as { __setItem: typeof Storage.prototype.setItem }).__setItem;
  });
  await logDeepWork(page, 30);
  await expect(page.getByText('Not saved', { exact: true })).toHaveCount(0);
});

test('Close the day is reachable on the first screen, without scrolling', async ({ page }) => {
  await open(page);
  await onboard(page);
  await expect(page.getByRole('button', { name: 'Close the day' })).toBeInViewport();
  await tap(page, 'Close the day');
  await expect(page.getByText('First thing tomorrow')).toBeVisible();
});

test('what scrolls up under the status bar is hidden, not shown through it', async ({ page }) => {
  // A phone with a notch: Chromium can pretend the top 59 points belong to the status bar.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34, left: 0, right: 0 } });
  await open(page);
  await onboard(page);
  const strip = { x: 0, y: 0, width: 390, height: 59 };
  const label = page.getByText('Rest you can book');
  const before = await page.screenshot({ clip: strip });
  const y0 = (await label.boundingBox())!.y;

  await page.mouse.move(200, 500);
  await page.mouse.wheel(0, 150);
  await page.waitForTimeout(300);

  const y1 = (await label.boundingBox())!.y;
  expect(y1).toBeLessThan(y0 - 100); // the card really moved up
  expect(y1).toBeLessThan(59); // and its first line is now behind the status bar
  const after = await page.screenshot({ clip: strip });
  expect(after.equals(before)).toBe(true); // yet nothing of it shows there
});

test('a focus goal shows what is left and says so once it is reached', async ({ page }) => {
  await open(page);
  await onboard(page);
  await tap(page, 'Start Deep Work');
  await expect(page.getByText('With a goal you get one quiet notification when time is up.')).toBeVisible();
  await tap(page, '25 min');
  await tap(page, 'Start timer');
  await expect(page.getByText('Goal 25m, 25m to go')).toBeVisible();
  await page.reload();
  await page.clock.fastForward(26 * 60_000);
  await expect(page.getByText('Goal reached. Keep going or finish when you like.')).toBeVisible();
});

test('onboarding lets you add your own activity and remove it again', async ({ page }) => {
  await open(page);
  await tap(page, 'Begin');
  await tap(page, 'Continue');
  await tap(page, 'Continue'); // work step
  await page.getByLabel('Your own work activity').fill('Writing');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('🔥 Writing', { exact: true })).toBeVisible();
  await expect(page.getByText('4 selected. Tap a custom one to remove it.')).toBeVisible();
  await expect(page.getByLabel('Your own work activity')).toHaveValue('');
  await tap(page, '🔥 Writing');
  await expect(page.getByText('🔥 Writing', { exact: true })).toHaveCount(0);
  await tap(page, 'Continue'); // rest step
  await page.getByLabel('Your own way to rest').fill('Bath');
  await page.getByLabel('Emoji').fill('🛁');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('🛁 Bath', { exact: true })).toBeVisible();
});

test('activities can be added in Settings, and a duplicate name is refused', async ({ page }) => {
  await open(page);
  await onboard(page);
  await tap(page, 'Settings');
  await tap(page, 'Work and rest activities');
  const add = page.getByRole('button', { name: 'Add', exact: true });
  await page.getByLabel('New way to rest').fill('Reading by lamp');
  await add.last().click();
  await expect(page.getByText(/Reading by lamp/).first()).toBeVisible();
  await expect(page.getByLabel('New way to rest')).toHaveValue('');
  await page.getByLabel('New way to rest').fill('Reading by lamp');
  await add.last().click();
  await expect(page.getByText('You already have one with that name.')).toBeVisible();
  await expect(page.getByLabel('New way to rest')).toHaveValue('Reading by lamp'); // kept so it can be fixed
});

const WEEKDAYS = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/;

test.describe('the week starts where the phone region says it does', () => {
  test.describe('in the UK', () => {
    test.use({ locale: 'en-GB' });
    test('Monday first, with today in its own place and the days to come left empty', async ({ page }) => {
      await open(page); // Tuesday 13 October
      await onboard(page);
      await expect(page.getByText(WEEKDAYS)).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      await expect(page.getByLabel('Today')).toHaveText('Tue');
    });

    test('a weekly recap waits for the new week: not on Sunday, there on Monday', async ({ page }) => {
      await open(page);
      await onboard(page);
      await logDeepWork(page, 120);
      await page.clock.fastForward(113.5 * 3_600_000); // Sunday 18 October, 12:00
      await page.clock.runFor(16_000);
      await expect(page.getByText('Your week', { exact: true })).toHaveCount(0);
      await page.clock.fastForward(21 * 3_600_000); // Monday 19 October, 09:00
      await page.clock.runFor(16_000);
      await expect(page.getByText('You worked 2h and rested 0m.')).toBeVisible();
    });
  });

  test.describe('in the US', () => {
    test.use({ locale: 'en-US' });
    test('Sunday first', async ({ page }) => {
      await open(page);
      await onboard(page);
      await expect(page.getByText(WEEKDAYS)).toHaveText(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
      await expect(page.getByLabel('Today')).toHaveText('Tue');
    });
  });

  test.describe('in Portugal', () => {
    test.use({ locale: 'pt-PT' });
    test('Monday, even though some calendars there start on Sunday', async ({ page }) => {
      await open(page);
      await onboard(page);
      await tap(page, 'Settings');
      await expect(page.getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByRole('button', { name: 'Sunday' })).toHaveAttribute('aria-selected', 'false');
    });
  });
});

test('the week start can be chosen while setting up, and rest days are listed in that order', async ({ page }) => {
  await open(page); // en-US: Sunday first by default
  await tap(page, 'Begin');
  await tap(page, 'Continue'); // Your rhythm
  const days = page.getByRole('button', { name: WEEKDAYS });
  await expect(days).toHaveText(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  await tap(page, 'Monday');
  await expect(days).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await expect(page.getByRole('button', { name: 'Sat' })).toHaveAttribute('aria-selected', 'true'); // rest days kept
  for (let i = 0; i < 4; i++) await tap(page, 'Continue');
  await tap(page, 'Start');
  await expect(page.getByText(WEEKDAYS)).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
});

test('Settings can change the week start, and Today follows', async ({ page }) => {
  await open(page);
  await onboard(page);
  await expect(page.getByText(WEEKDAYS)).toHaveText(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  await tap(page, 'Settings');
  await tap(page, 'Monday');
  await expect(page.getByRole('button', { name: WEEKDAYS })).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await tap(page, 'Done');
  await expect(page.getByText(WEEKDAYS)).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
});
