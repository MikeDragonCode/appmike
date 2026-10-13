import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  CustomActivity,
  DEFAULT_GLOW_IDS,
  DEFAULT_GRIND_IDS,
  GLOW_CATALOG,
  GRIND_CATALOG,
  MAX_STRUGGLES,
  MIN_ACTIVITIES,
  PACE_OPTIONS,
  REST_PER_HOUR_MAX,
  REST_PER_HOUR_MIN,
  REST_PRESETS,
  STRUGGLES,
  Selection,
  Struggle,
  buildProfile,
  createInitialData,
  describePlan,
  selectionIsValid,
  shiftTime,
} from '@/core';
import { ensurePermission, syncRoutineReminders } from '@/services/notifications';
import { setData } from '@/state/store';
import { colors, radius, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, Row, Stepper } from '@/ui/controls';
import { fmtMins } from '@/ui/format';
import { tap } from '@/ui/haptics';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

const STEPS = 7;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [struggles, setStruggles] = useState<Struggle[]>([]);
  const [paceHours, setPaceHours] = useState(8);
  const [workEnd, setWorkEnd] = useState('18:00');
  const [bedtime, setBedtime] = useState('23:00');
  const [restDays, setRestDays] = useState<number[]>([0, 6]);
  const [grindIds, setGrindIds] = useState<string[]>(DEFAULT_GRIND_IDS);
  const [glowIds, setGlowIds] = useState<string[]>(DEFAULT_GLOW_IDS);
  const [customGrind, setCustomGrind] = useState<CustomActivity[]>([]);
  const [customGlow, setCustomGlow] = useState<CustomActivity[]>([]);
  const [restPerHour, setRestPerHour] = useState(30);
  const [busy, setBusy] = useState(false);

  const selection: Selection = { grindIds, glowIds, customGrind, customGlow };
  const answers = { struggles, paceHours, workEnd, bedtime, restPerHour, restDays };
  const plan = describePlan(buildProfile(answers));

  const grindCount = grindIds.length + customGrind.length;
  const glowCount = glowIds.length + customGlow.length;
  const canContinue =
    step === 3 ? grindCount >= MIN_ACTIVITIES : step === 4 ? glowCount >= MIN_ACTIVITIES : true;

  async function finish() {
    if (!selectionIsValid(selection) || busy) return;
    setBusy(true);
    const data = createInitialData({ answers, selection }, new Date());
    setData(data);
    // The prompt appears after the plan is saved, so a "no" never blocks the start.
    if (data.profile.remindClose || data.profile.remindWindDown || data.profile.remindBank) {
      if (await ensurePermission()) await syncRoutineReminders(data.profile);
    }
  }

  const next = () => {
    tap();
    if (step === STEPS - 1) finish();
    else setStep(step + 1);
  };

  const footer = (
    <>
      <Button
        title={step === 0 ? 'Begin' : step === STEPS - 1 ? 'Start' : 'Continue'}
        onPress={next}
        disabled={!canContinue}
        busy={busy}
      />
      {step > 0 ? <Button title="Back" kind="ghost" onPress={() => setStep(step - 1)} /> : null}
    </>
  );

  return (
    <Screen footer={footer}>
      {step > 0 ? <Dots current={step} /> : null}

      {step === 0 ? (
        <View style={styles.block}>
          <AppText variant="display">Shift to Life</AppText>
          <AppText variant="heading" color={colors.muted}>
            Work earns rest. Rest gets booked.
          </AppText>
          <AppText variant="small">
            You earn rest minutes for the work you do, then book them as real slots in your day, so rest happens on
            purpose instead of leaking into scrolling. Everything stays on your phone. No account.
          </AppText>
          <AppText variant="small">
            Shift to Life is a planning tool. It is not therapy and not medical advice.
          </AppText>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.block}>
          <AppText variant="title">What is hardest right now?</AppText>
          <AppText variant="small">Pick up to {MAX_STRUGGLES}. This sets your starting rules. You can change anything later.</AppText>
          {STRUGGLES.map((s) => {
            const on = struggles.includes(s.id);
            return (
              <Card
                key={s.id}
                selected={on}
                onPress={() => {
                  tap();
                  setStruggles(on ? struggles.filter((x) => x !== s.id) : [...struggles, s.id].slice(-MAX_STRUGGLES));
                }}
              >
                <AppText variant="heading">{s.title}</AppText>
                <AppText variant="small">{s.hint}</AppText>
              </Card>
            );
          })}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.block}>
          <AppText variant="title">Your rhythm</AppText>
          <AppText variant="label">A typical working day</AppText>
          {PACE_OPTIONS.map((p) => (
            <Card key={p.hours} selected={paceHours === p.hours} onPress={() => setPaceHours(p.hours)}>
              <AppText variant="heading">{p.title}</AppText>
              <AppText variant="small">{p.hint}</AppText>
            </Card>
          ))}
          <Stepper
            label="Workday ends"
            value={workEnd}
            onMinus={() => setWorkEnd(shiftTime(workEnd, -15))}
            onPlus={() => setWorkEnd(shiftTime(workEnd, 15))}
          />
          <Stepper
            label="Bedtime"
            value={bedtime}
            onMinus={() => setBedtime(shiftTime(bedtime, -15))}
            onPlus={() => setBedtime(shiftTime(bedtime, 15))}
          />
          <AppText variant="label">Rest days</AppText>
          <Row>
            {DAY_NAMES.map((n, i) => (
              <Chip key={n} label={n} selected={restDays.includes(i)} onPress={() => setRestDays(toggle(restDays, i))} />
            ))}
          </Row>
          <AppText variant="small">On rest days, rest costs half and a day with no work is fine.</AppText>
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.block}>
          <AppText variant="title">What counts as work?</AppText>
          <AppText variant="small">Choose at least {MIN_ACTIVITIES}. Anything that takes effort and moves your life forward.</AppText>
          <Row>
            {GRIND_CATALOG.map((i) => (
              <Chip
                key={i.id}
                label={`${i.emoji} ${i.name}`}
                tint={colors.grind}
                selected={grindIds.includes(i.id)}
                onPress={() => setGrindIds(toggle(grindIds, i.id))}
              />
            ))}
            {customGrind.map((c, idx) => (
              <Chip
                key={`cg${idx}`}
                label={`${c.emoji || '🔥'} ${c.name}`}
                tint={colors.grind}
                selected
                onPress={() => setCustomGrind(customGrind.filter((_, k) => k !== idx))}
              />
            ))}
          </Row>
          <AddCustom placeholder="Your own work activity" onAdd={(c) => setCustomGrind([...customGrind, c])} />
          <AppText variant="small">{grindCount} selected. Tap a custom one to remove it.</AppText>
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.block}>
          <AppText variant="title">How do you like to rest?</AppText>
          <AppText variant="small">Choose at least {MIN_ACTIVITIES}. Be honest, nothing here is judged.</AppText>
          <Row>
            {GLOW_CATALOG.map((i) => (
              <Chip
                key={i.id}
                label={`${i.emoji} ${i.name}`}
                tint={colors.glow}
                selected={glowIds.includes(i.id)}
                onPress={() => setGlowIds(toggle(glowIds, i.id))}
              />
            ))}
            {customGlow.map((c, idx) => (
              <Chip
                key={`cl${idx}`}
                label={`${c.emoji || '✨'} ${c.name}`}
                tint={colors.glow}
                selected
                onPress={() => setCustomGlow(customGlow.filter((_, k) => k !== idx))}
              />
            ))}
          </Row>
          <AddCustom placeholder="Your own way to rest" onAdd={(c) => setCustomGlow([...customGlow, c])} />
          <AppText variant="small">{glowCount} selected. Tap a custom one to remove it.</AppText>
        </View>
      ) : null}

      {step === 5 ? (
        <View style={styles.block}>
          <AppText variant="title">How generous is the trade?</AppText>
          {REST_PRESETS.map((p) => (
            <Card key={p.restPerHour} selected={restPerHour === p.restPerHour} onPress={() => setRestPerHour(p.restPerHour)}>
              <AppText variant="heading">{p.title}</AppText>
              <AppText variant="small">{p.hint}</AppText>
            </Card>
          ))}
          <Stepper
            label="Minutes of rest per hour of work"
            value={`${restPerHour}`}
            onMinus={() => setRestPerHour(Math.max(REST_PER_HOUR_MIN, restPerHour - 5))}
            onPlus={() => setRestPerHour(Math.min(REST_PER_HOUR_MAX, restPerHour + 5))}
            minusDisabled={restPerHour <= REST_PER_HOUR_MIN}
            plusDisabled={restPerHour >= REST_PER_HOUR_MAX}
          />
          <AppText variant="small">
            A full {paceHours}-hour day of focused work would earn {fmtMins(paceHours * restPerHour)} of rest. You decide
            what that is worth.
          </AppText>
        </View>
      ) : null}

      {step === 6 ? (
        <View style={styles.block}>
          <AppText variant="title">Your starting plan</AppText>
          {plan.map((line) => (
            <Card key={line}>
              <AppText variant="body">{line}</AppText>
            </Card>
          ))}
          <AppText variant="small">
            We may ask to send reminders. They are local to your phone and optional. You can adjust the plan any time in
            Settings.
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

function Dots({ current }: { current: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: STEPS - 1 }, (_, i) => (
        <View key={i} style={[styles.dot, i + 1 <= current ? styles.dotOn : null]} />
      ))}
    </View>
  );
}

function AddCustom({ placeholder, onAdd }: { placeholder: string; onAdd: (c: CustomActivity) => void }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const ok = name.trim().length > 0;
  const add = () => {
    if (!ok) return;
    onAdd({ name: name.trim(), emoji: emoji.trim() });
    setName('');
    setEmoji('');
  };
  return (
    <View style={styles.custom}>
      <TextInput
        value={emoji}
        onChangeText={(t) => setEmoji(Array.from(t).slice(0, 2).join(''))}
        placeholder="🙂"
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.emojiInput]}
        accessibilityLabel="Emoji"
      />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.nameInput]}
        maxLength={30}
        returnKeyType="done"
        onSubmitEditing={add}
        accessibilityLabel={placeholder}
      />
      <Pressable accessibilityRole="button" onPress={add} style={[styles.addBtn, !ok ? styles.addOff : null]}>
        <AppText variant="body" color={colors.onAccent} style={styles.addText}>
          Add
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.text },
  custom: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  emojiInput: { width: 56, textAlign: 'center' },
  nameInput: { flex: 1, minWidth: 0 },
  addBtn: { height: 48, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: colors.text, justifyContent: 'center' },
  addOff: { opacity: 0.35 },
  addText: { fontWeight: '600' },
});
