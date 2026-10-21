import { StyleSheet, View } from 'react-native';
import { CatalogItem, CustomActivity } from '@/core';
import { space } from '@/theme';
import { AddActivity } from '@/ui/AddActivity';
import { Chip, Row } from '@/ui/controls';
import { AppText } from '@/ui/Text';

interface Props {
  title: string;
  intro: string;
  catalog: CatalogItem[];
  tint: string;
  addPlaceholder: string;
  chosen: string[];
  custom: CustomActivity[];
  onChosen: (ids: string[]) => void;
  onCustom: (list: CustomActivity[]) => void;
}

// The same step for work and for rest: pick from the catalogue, add your own, tap an own one to remove it.
export function ActivitiesStep({ title, intro, catalog, tint, addPlaceholder, chosen, custom, onChosen, onCustom }: Props) {
  const toggle = (id: string) => onChosen(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  return (
    <View style={styles.block}>
      <AppText variant="title">{title}</AppText>
      <AppText variant="small">{intro}</AppText>
      <Row>
        {catalog.map((i) => (
          <Chip key={i.id} label={`${i.name}`} tint={tint} selected={chosen.includes(i.id)} onPress={() => toggle(i.id)} />
        ))}
        {custom.map((c, idx) => (
          <Chip
            key={`custom${idx}`}
            label={`${c.name}`}
            tint={tint}
            selected
            onPress={() => onCustom(custom.filter((_, k) => k !== idx))}
          />
        ))}
      </Row>
      <AddActivity placeholder={addPlaceholder} onAdd={(name, emoji) => onCustom([...custom, { name, emoji }])} />
      <AppText variant="small">{chosen.length + custom.length} selected. Tap a custom one to remove it.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({ block: { gap: space.md } });
