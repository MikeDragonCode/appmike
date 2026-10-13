import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { PACE_OPTIONS, Profile, REST_PER_HOUR_MAX, REST_PER_HOUR_MIN, changeRestPerHour, shiftTime } from '@/core';
import { cancelAllReminders, ensurePermission } from '@/services/notifications';
import { resetAll, updateData, useStore } from '@/state/store';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, Divider, Row, Stepper } from '@/ui/controls';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Settings() {
  const router = useRouter();
  const { data } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [notifNote, setNotifNote] = useState<string | null>(null);
  if (!data) return null;
  const p = data.profile;

  const setProfile = (patch: Partial<Profile>) => updateData((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  const setReminder = async (key: 'remindClose' | 'remindWindDown' | 'remindBank', on: boolean) => {
    if (on && !(await ensurePermission())) {
      setNotifNote(
        Platform.OS === 'web'
          ? 'Reminders work in the phone app.'
          : 'Notifications are off for Shift to Life. Turn them on in your phone settings, then switch this on again.',
      );
      return;
    }
    setNotifNote(null);
    setProfile({ [key]: on });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title" style={styles.flex}>
          Settings
        </AppText>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <AppText variant="small" color={colors.text}>
            Done
          </AppText>
        </Pressable>
      </View>

      <AppText variant="label">Rhythm</AppText>
      <Card style={styles.group}>
        <AppText variant="body">Rest days</AppText>
        <Row>
          {DAY_NAMES.map((n, i) => (
            <Chip
              key={n}
              label={n}
              selected={data.restDays.includes(i)}
              onPress={() =>
                updateData((d) => ({
                  ...d,
                  restDays: d.restDays.includes(i) ? d.restDays.filter((x) => x !== i) : [...d.restDays, i],
                }))
              }
            />
          ))}
        </Row>
        <Divider />
        <AppText variant="body">Typical working day</AppText>
        <Row>
          {PACE_OPTIONS.map((o) => (
            <Chip
              key={o.hours}
              label={`${o.title}, ${o.hours}h`}
              selected={data.dailyGrindHours === o.hours}
              onPress={() => updateData((d) => ({ ...d, dailyGrindHours: o.hours }))}
            />
          ))}
        </Row>
        <Divider />
        <Stepper
          label="Workday ends"
          value={p.workEnd}
          onMinus={() => setProfile({ workEnd: shiftTime(p.workEnd, -15) })}
          onPlus={() => setProfile({ workEnd: shiftTime(p.workEnd, 15) })}
        />
        <Stepper
          label="Bedtime"
          value={p.bedtime}
          onMinus={() => setProfile({ bedtime: shiftTime(p.bedtime, -15) })}
          onPlus={() => setProfile({ bedtime: shiftTime(p.bedtime, 15) })}
        />
      </Card>

      <Button kind="secondary" title="Work and rest activities" onPress={() => router.push('/activities')} />

      <AppText variant="label">Rest rules</AppText>
      <Card style={styles.group}>
        <Stepper
          label="Rest per hour of work"
          value={`${p.restPerHour} min`}
          onMinus={() => updateData((d) => changeRestPerHour(d, d.profile.restPerHour - 5))}
          onPlus={() => updateData((d) => changeRestPerHour(d, d.profile.restPerHour + 5))}
          minusDisabled={p.restPerHour <= REST_PER_HOUR_MIN}
          plusDisabled={p.restPerHour >= REST_PER_HOUR_MAX}
        />
        <AppText variant="small">Changing this applies from now on. Past days stay as they were.</AppText>
        <Divider />
        <Stepper
          label="Borrow ahead up to"
          value={`${p.advanceCapMins} min`}
          onMinus={() => setProfile({ advanceCapMins: Math.max(0, p.advanceCapMins - 15) })}
          onPlus={() => setProfile({ advanceCapMins: Math.min(120, p.advanceCapMins + 15) })}
          minusDisabled={p.advanceCapMins <= 0}
          plusDisabled={p.advanceCapMins >= 120}
        />
        <Stepper
          label="Usual slot length"
          value={`${p.defaultSlotMins} min`}
          onMinus={() => setProfile({ defaultSlotMins: Math.max(15, p.defaultSlotMins - 15) })}
          onPlus={() => setProfile({ defaultSlotMins: Math.min(180, p.defaultSlotMins + 15) })}
          minusDisabled={p.defaultSlotMins <= 15}
          plusDisabled={p.defaultSlotMins >= 180}
        />
        <Stepper
          label="Weekly rest goal"
          value={p.weeklySlotGoal === 0 ? 'Off' : `${p.weeklySlotGoal}`}
          onMinus={() => setProfile({ weeklySlotGoal: Math.max(0, p.weeklySlotGoal - 1) })}
          onPlus={() => setProfile({ weeklySlotGoal: Math.min(14, p.weeklySlotGoal + 1) })}
          minusDisabled={p.weeklySlotGoal <= 0}
          plusDisabled={p.weeklySlotGoal >= 14}
        />
        <Divider />
        <ToggleRow
          label="Rest cannot run past bedtime"
          value={p.hardBedtime}
          onChange={(v) => setProfile({ hardBedtime: v })}
        />
      </Card>

      <AppText variant="label">Reminders</AppText>
      <Card style={styles.group}>
        <ToggleRow label="Close the day at the end of work" value={p.remindClose} onChange={(v) => setReminder('remindClose', v)} />
        <ToggleRow label="Wind down before bed" value={p.remindWindDown} onChange={(v) => setReminder('remindWindDown', v)} />
        <ToggleRow label="Nudge when rest piles up" value={p.remindBank} onChange={(v) => setReminder('remindBank', v)} />
        {notifNote ? (
          <>
            <AppText variant="small" color={colors.grind}>
              {notifNote}
            </AppText>
            {Platform.OS !== 'web' ? (
              <Button small kind="secondary" title="Open phone settings" onPress={() => Linking.openSettings()} />
            ) : null}
          </>
        ) : null}
        <AppText variant="small">Reminders are created on your phone. Nothing is sent anywhere.</AppText>
      </Card>

      <AppText variant="label">Your data</AppText>
      <Card style={styles.group}>
        <AppText variant="small">
          Data lives only on this phone. If you change phones or reinstall, you will lose it unless you keep a backup.
        </AppText>
        <Button kind="secondary" title="Backup and restore" onPress={() => router.push('/backup')} />
      </Card>

      <AppText variant="label">About</AppText>
      <Card style={styles.group}>
        <Button kind="secondary" title="How it works" onPress={() => router.push('/how-it-works')} />
        <AppText variant="small">
          Shift to Life keeps everything on this phone. There is no account and no tracking.
        </AppText>
        <AppText variant="small">
          It is a planning tool, not therapy or medical advice. If you are struggling, please talk to a professional. If
          you are in crisis or thinking about harming yourself, contact your local emergency number or a crisis line in
          your country.
        </AppText>
      </Card>

      <Button
        kind="danger"
        title={confirmReset ? 'Tap again to erase everything' : 'Start over'}
        onPress={async () => {
          if (!confirmReset) return setConfirmReset(true);
          await cancelAllReminders();
          await resetAll();
        }}
      />
    </Screen>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <AppText variant="body" style={styles.flex}>
        {label}
      </AppText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.good }}
        thumbColor={colors.text}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  group: { gap: space.md },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
