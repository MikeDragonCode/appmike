// The look of the home screen widget and of the focus Live Activity. iOS only; loaded from widgets.ios.ts.
//
// The functions marked 'widget' are turned into plain text at build time and run in the widget's own tiny
// runtime. Inside them only SwiftUI pieces from @expo/ui can be used, and nothing from outside the function
// (no imports, no helpers, no theme file), so colors and small helpers are written out in place.
import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, containerBackground, font, foregroundStyle, frame, lineLimit, monospacedDigit, padding, textCase, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, createWidget } from 'expo-widgets';
import type { WidgetSnapshot } from '@/core';

export const RestWidget = createWidget('RestWidget', (props: WidgetSnapshot, env) => {
  'widget';
  const avail = typeof props?.availMins === 'number' ? props.availMins : 0;
  const a = Math.abs(avail);
  const h = Math.floor(a / 60);
  const m = a % 60;
  const label = (avail < 0 ? '-' : '') + (h > 0 ? h + 'h' + (m > 0 ? ' ' + m + 'm' : '') : m + 'm');
  const focus = props?.focus;
  const next = props?.next;
  const family = env?.widgetFamily;

  if (family === 'accessoryRectangular' || family === 'accessoryInline' || family === 'accessoryCircular') {
    return (
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), lineLimit(1)]}>Rest to book</Text>
        <Text modifiers={[font({ size: 22, weight: 'bold', design: 'rounded' }), lineLimit(1)]}>{label}</Text>
      </VStack>
    );
  }

  const status = focus ? (
    <HStack spacing={4}>
      <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle('#ffe2cf'), lineLimit(1)]}>Focus</Text>
      <Text
        date={new Date(focus.startedAt)}
        dateStyle="timer"
        modifiers={[font({ size: 12, weight: 'semibold' }), monospacedDigit(), foregroundStyle('#ffe2cf'), frame({ maxWidth: 70, alignment: 'leading' })]}
      />
    </HStack>
  ) : next ? (
    <HStack spacing={4}>
      <Text modifiers={[font({ size: 12 }), foregroundStyle('#ffe2cf'), lineLimit(1)]}>{next.title}</Text>
      <Text date={new Date(next.startsAt)} dateStyle="time" modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#ffffff')]} />
    </HStack>
  ) : (
    <Text modifiers={[font({ size: 12 }), foregroundStyle('#ffe2cf'), lineLimit(1)]}>{avail >= 30 ? 'Book it so it happens' : 'Earn some with focus'}</Text>
  );

  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[padding({ all: 14 }), frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }), containerBackground('#b93f17', 'widget'), widgetURL('shifttolife://')]}
    >
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle('#ffe2cf'), textCase('uppercase')]}>Rest to book</Text>
      <Text modifiers={[font({ size: 38, weight: 'bold', design: 'rounded' }), foregroundStyle(avail < 0 ? '#ffd0b8' : '#ffffff'), lineLimit(1)]}>{label}</Text>
      <Spacer />
      {status}
    </VStack>
  );
});

type FocusProps = { name: string; startedAt: number; goalMins: number };

// A running focus block on the lock screen and in the Dynamic Island. The timer is drawn by the system,
// so it keeps counting without the app. With a goal it counts down to it, then keeps counting up past it.
export const FocusActivity = createLiveActivity('FocusActivity', (props: FocusProps) => {
  'widget';
  const goal = props.goalMins > 0;
  const date = new Date(goal ? props.startedAt + props.goalMins * 60000 : props.startedAt);
  const timer = (size: number, color: string) => (
    <Text date={date} dateStyle="timer" modifiers={[font({ size, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle(color), lineLimit(1)]} />
  );
  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 14 }), activityBackgroundTint('#b93f17')]}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#ffe2cf'), lineLimit(1)]}>{props.name}</Text>
          {timer(34, '#ffe2cf')}
          <Text modifiers={[font({ size: 12 }), foregroundStyle('#ffe2cf')]}>{goal ? 'to your goal, then it counts up' : 'of focus, earning rest'}</Text>
        </VStack>
        <Spacer />
      </HStack>
    ),
    compactLeading: <Text modifiers={[font({ size: 14 })]}>⏱</Text>,
    compactTrailing: timer(14, '#ffb98a'),
    minimal: <Text modifiers={[font({ size: 14 })]}>⏱</Text>,
    expandedCenter: <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1)]}>{props.name}</Text>,
    expandedBottom: timer(26, '#ffb98a'),
  };
});
