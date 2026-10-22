import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  CustomActivity,
  DEFAULT_GLOW_IDS,
  DEFAULT_GRIND_IDS,
  GLOW_CATALOG,
  GRIND_CATALOG,
  MIN_ACTIVITIES,
  Selection,
  Struggle,
  buildProfile,
  createInitialData,
  defaultWeekStart,
  describePlan,
  selectionIsValid,
} from '@/core';
import { deviceRegion } from '@/services/locale';
import { ensurePermission, syncRoutineReminders } from '@/services/notifications';
import { setData } from '@/state/store';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { tap } from '@/ui/haptics';
import { ActivitiesStep } from '@/ui/onboarding/ActivitiesStep';
import { Dots, PlanStep, RhythmStep, StrugglesStep, TradeStep, WelcomeStep } from '@/ui/onboarding/steps';
import { RestoreForm } from '@/ui/RestoreForm';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

// Welcome, hardest thing, rhythm, work, rest, the trade, the plan.
const STEPS = 7;
const STRUGGLES_STEP = 1;
const WORK_STEP = 3;
const REST_STEP = 4;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [struggles, setStruggles] = useState<Struggle[]>([]);
  const [paceHours, setPaceHours] = useState(8);
  const [workEnd, setWorkEnd] = useState('18:00');
  const [bedtime, setBedtime] = useState('23:00');
  const [weekStart, setWeekStart] = useState(() => defaultWeekStart(deviceRegion()));
  const [restDays, setRestDays] = useState<number[]>([0, 6]);
  const [grindIds, setGrindIds] = useState<string[]>(DEFAULT_GRIND_IDS);
  const [glowIds, setGlowIds] = useState<string[]>(DEFAULT_GLOW_IDS);
  const [customGrind, setCustomGrind] = useState<CustomActivity[]>([]);
  const [customGlow, setCustomGlow] = useState<CustomActivity[]>([]);
  const [restPerHour, setRestPerHour] = useState(30);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const selection: Selection = { grindIds, glowIds, customGrind, customGlow };
  const answers = { struggles, paceHours, workEnd, bedtime, restPerHour, restDays, weekStart };
  const plan = describePlan(buildProfile(answers));

  const canContinue =
    step === STRUGGLES_STEP
      ? struggles.length >= 1
      : step === WORK_STEP
      ? grindIds.length + customGrind.length >= MIN_ACTIVITIES
      : step === REST_STEP
        ? glowIds.length + customGlow.length >= MIN_ACTIVITIES
        : true;

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

  const footer = restoring ? (
    <Button kind="ghost" title="Back" onPress={() => setRestoring(false)} />
  ) : (
    <>
      <Button title={step === 0 ? 'Begin' : step === STEPS - 1 ? 'Start' : 'Continue'} onPress={next} disabled={!canContinue} busy={busy} />
      {step > 0 ? <Button title="Back" kind="ghost" onPress={() => setStep(step - 1)} /> : null}
    </>
  );

  return (
    <Screen footer={footer}>
      {step > 0 ? <Dots current={step} total={STEPS - 1} /> : null}

      {restoring ? (
        <View style={styles.block}>
          <AppText variant="title">Restore a backup</AppText>
          <AppText variant="small">Paste the backup text you saved from Settings.</AppText>
          <RestoreForm confirm={false} />
        </View>
      ) : step === 0 ? (
        <WelcomeStep onRestore={() => setRestoring(true)} />
      ) : step === 1 ? (
        <StrugglesStep value={struggles} onChange={setStruggles} />
      ) : step === 2 ? (
        <RhythmStep
          paceHours={paceHours}
          workEnd={workEnd}
          bedtime={bedtime}
          weekStart={weekStart}
          restDays={restDays}
          onPace={setPaceHours}
          onWorkEnd={setWorkEnd}
          onBedtime={setBedtime}
          onWeekStart={setWeekStart}
          onRestDays={setRestDays}
        />
      ) : step === WORK_STEP ? (
        <ActivitiesStep
          title="What counts as work?"
          intro={`Choose at least ${MIN_ACTIVITIES}. Anything that takes effort and moves your life forward.`}
          catalog={GRIND_CATALOG}
          tint={colors.grind}
          addPlaceholder="Your own work activity"
          chosen={grindIds}
          custom={customGrind}
          onChosen={setGrindIds}
          onCustom={setCustomGrind}
        />
      ) : step === REST_STEP ? (
        <ActivitiesStep
          title="How do you like to rest?"
          intro={`Choose at least ${MIN_ACTIVITIES}. Be honest, nothing here is judged.`}
          catalog={GLOW_CATALOG}
          tint={colors.glow}
          addPlaceholder="Your own way to rest"
          chosen={glowIds}
          custom={customGlow}
          onChosen={setGlowIds}
          onCustom={setCustomGlow}
        />
      ) : step === 5 ? (
        <TradeStep restPerHour={restPerHour} paceHours={paceHours} onChange={setRestPerHour} />
      ) : (
        <PlanStep lines={plan} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ block: { gap: space.md } });
