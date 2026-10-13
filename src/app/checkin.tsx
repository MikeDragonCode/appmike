import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { MAX_STRUGGLES, STRUGGLES, Struggle, applyStruggles, completeCheckin, describePlan, dueCheckin } from '@/core';
import { ensurePermission } from '@/services/notifications';
import { updateData, useStore } from '@/state/store';
import { space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { tap } from '@/ui/haptics';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

export default function Checkin() {
  const router = useRouter();
  const { data } = useStore();
  const stage = data ? dueCheckin(data, new Date()) : null;
  const [picked, setPicked] = useState<Struggle[]>(data?.profile.struggles ?? []);
  if (!data) return null;

  if (stage === null) {
    return (
      <Screen padTop={false} footer={<Button title="Back to Today" onPress={() => router.back()} />}>
        <ModalHeader title="Check-in" />
        <AppText variant="small">Nothing to check right now.</AppText>
      </Screen>
    );
  }

  const same = picked.length === data.profile.struggles.length && picked.every((s) => data.profile.struggles.includes(s));
  const preview = describePlan(applyStruggles(data.profile, picked));

  async function save(change: boolean) {
    if (change) {
      const next = applyStruggles(data!.profile, picked);
      if (next.remindClose || next.remindWindDown) await ensurePermission();
    }
    updateData((d) => completeCheckin(d, stage!, change ? picked : undefined));
    router.back();
  }

  return (
    <Screen
      padTop={false}
      footer={
        <>
          <Button title="Update my plan" disabled={same} onPress={() => save(true)} />
          <Button kind="ghost" title="Keep my plan as it is" onPress={() => save(false)} />
        </>
      }
    >
      <ModalHeader title={`Day ${stage} check-in`} />
      <AppText variant="small">
        Things change. Pick what is hardest right now (up to {MAX_STRUGGLES}) and the rules will follow. Your own settings
        stay as they are.
      </AppText>
      {STRUGGLES.map((s) => {
        const on = picked.includes(s.id);
        return (
          <Card
            key={s.id}
            selected={on}
            onPress={() => {
              tap();
              setPicked(on ? picked.filter((x) => x !== s.id) : [...picked, s.id].slice(-MAX_STRUGGLES));
            }}
          >
            <AppText variant="heading">{s.title}</AppText>
            <AppText variant="small">{s.hint}</AppText>
          </Card>
        );
      })}
      {!same ? (
        <View style={{ gap: space.sm }}>
          <AppText variant="label">Your plan would be</AppText>
          {preview.map((line) => (
            <AppText key={line} variant="small">
              {line}
            </AppText>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
