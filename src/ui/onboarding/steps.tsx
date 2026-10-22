import { StyleSheet, View } from 'react-native';
import {
  PACE_OPTIONS,
  REST_PER_HOUR_MAX,
  REST_PER_HOUR_MIN,
  REST_PRESETS,
  STRUGGLES,
  Struggle,
  shiftTime,
} from '@/core';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Stepper } from '@/ui/controls';
import { fmtMins } from '@/ui/format';
import { tap } from '@/ui/haptics';
import { AppText } from '@/ui/Text';
import { WeekControls } from '@/ui/WeekControls';

// One small component per questionnaire step. They hold no state: the screen owns the answers.

export function WelcomeStep({ onRestore }: { onRestore: () => void }) {
  return (
    <View style={styles.block}>
      <AppText variant="display">Shift to Life</AppText>
      <AppText variant="heading" color={colors.muted}>
        Work earns rest. Rest gets booked.
      </AppText>
      <AppText variant="small">
        You earn rest minutes for the work you do, then book them as real slots in your day, so rest happens on purpose
        instead of leaking into scrolling. Everything stays on your phone. No account.
      </AppText>
      <AppText variant="small">Shift to Life is a planning tool. It is not therapy and not medical advice.</AppText>
      <Button kind="ghost" title="I have a backup" onPress={onRestore} />
    </View>
  );
}

export function StrugglesStep({ value, onChange }: { value: Struggle[]; onChange: (v: Struggle[]) => void }) {
  return (
    <View style={styles.block}>
      <AppText variant="title">What is hardest right now?</AppText>
      <AppText variant="small">Pick at least one, as many as fit. This sets your starting rules. You can change anything later.</AppText>
      {STRUGGLES.map((s) => {
        const on = value.includes(s.id);
        return (
          <Card
            key={s.id}
            selected={on}
            onPress={() => {
              tap();
              onChange(on ? value.filter((x) => x !== s.id) : [...value, s.id]);
            }}
          >
            <AppText variant="heading">{s.title}</AppText>
            <AppText variant="small">{s.hint}</AppText>
          </Card>
        );
      })}
    </View>
  );
}

interface RhythmProps {
  paceHours: number;
  workEnd: string;
  bedtime: string;
  weekStart: number;
  restDays: number[];
  onPace: (hours: number) => void;
  onWorkEnd: (t: string) => void;
  onBedtime: (t: string) => void;
  onWeekStart: (day: number) => void;
  onRestDays: (days: number[]) => void;
}

export function RhythmStep({ paceHours, workEnd, bedtime, weekStart, restDays, onPace, onWorkEnd, onBedtime, onWeekStart, onRestDays }: RhythmProps) {
  return (
    <View style={styles.block}>
      <AppText variant="title">Your rhythm</AppText>
      <AppText variant="label">A typical working day</AppText>
      {PACE_OPTIONS.map((p) => (
        <Card key={p.hours} selected={paceHours === p.hours} onPress={() => onPace(p.hours)}>
          <AppText variant="heading">{p.title}</AppText>
          <AppText variant="small">{p.hint}</AppText>
        </Card>
      ))}
      <Stepper label="Workday ends" value={workEnd} onMinus={() => onWorkEnd(shiftTime(workEnd, -15))} onPlus={() => onWorkEnd(shiftTime(workEnd, 15))} />
      <Stepper label="Bedtime" value={bedtime} onMinus={() => onBedtime(shiftTime(bedtime, -15))} onPlus={() => onBedtime(shiftTime(bedtime, 15))} />
      <WeekControls weekStart={weekStart} restDays={restDays} onWeekStart={onWeekStart} onRestDays={onRestDays} />
      <AppText variant="small">On rest days, rest costs half and a day with no work is fine.</AppText>
    </View>
  );
}

interface TradeProps {
  restPerHour: number;
  paceHours: number;
  onChange: (mins: number) => void;
}

export function TradeStep({ restPerHour, paceHours, onChange }: TradeProps) {
  return (
    <View style={styles.block}>
      <AppText variant="title">How generous is the trade?</AppText>
      {REST_PRESETS.map((p) => (
        <Card key={p.restPerHour} selected={restPerHour === p.restPerHour} onPress={() => onChange(p.restPerHour)}>
          <AppText variant="heading">{p.title}</AppText>
          <AppText variant="small">{p.hint}</AppText>
        </Card>
      ))}
      <Stepper
        label="Minutes of rest per hour of work"
        value={`${restPerHour}`}
        onMinus={() => onChange(Math.max(REST_PER_HOUR_MIN, restPerHour - 5))}
        onPlus={() => onChange(Math.min(REST_PER_HOUR_MAX, restPerHour + 5))}
        minusDisabled={restPerHour <= REST_PER_HOUR_MIN}
        plusDisabled={restPerHour >= REST_PER_HOUR_MAX}
      />
      <AppText variant="small">
        A full {paceHours}-hour day of focused work would earn {fmtMins(paceHours * restPerHour)} of rest. You decide what that is
        worth.
      </AppText>
    </View>
  );
}

export function PlanStep({ lines }: { lines: string[] }) {
  return (
    <View style={styles.block}>
      <AppText variant="title">Your starting plan</AppText>
      {lines.map((line) => (
        <Card key={line}>
          <AppText variant="body">{line}</AppText>
        </Card>
      ))}
      <AppText variant="small">
        We may ask to send reminders. They are local to your phone and optional. You can adjust the plan any time in Settings.
      </AppText>
    </View>
  );
}

export function Dots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.dot, i + 1 <= current ? styles.dotOn : null]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.grind },
});
