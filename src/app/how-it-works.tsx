import { Card } from '@/ui/Card';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

const STEPS = [
  {
    title: 'Work earns rest',
    body: 'Time spent on work, study or training goes into a bank of rest minutes at the ratio you chose. An hour of focused work at 30 minutes per hour adds 30 minutes.',
  },
  {
    title: 'Book it before you spend it',
    body: 'Rest becomes a slot in your day. Booking holds the minutes, so you cannot spend them twice, and the evening stops disappearing into scrolling without you choosing it.',
  },
  {
    title: 'Finish early, keep the rest',
    body: 'If you use less than you booked, the unused minutes go back to your bank. Using at least 80 percent counts as a rest taken on purpose. Need more time? Add 15 minutes while it runs.',
  },
  {
    title: 'You can borrow a little',
    body: 'Low on rest but need a break? You may borrow a small amount ahead. Your next focus block pays it back. The limit is in Settings.',
  },
  {
    title: 'Rest days are lighter',
    body: 'On days you marked as rest days, rest costs half and a day with no work is fine. Streaks forgive one missed workday.',
  },
  {
    title: 'It is your record',
    body: 'Log rest you already took, undo a mistaken tap, or fix an old day in History. The numbers are there to help you see your week, not to judge it.',
  },
];

export default function HowItWorks() {
  return (
    <Screen>
      <ModalHeader title="How it works" action="Done" />
      {STEPS.map((s, i) => (
        <Card key={s.title}>
          <AppText variant="label">Step {i + 1}</AppText>
          <AppText variant="heading">{s.title}</AppText>
          <AppText variant="small">{s.body}</AppText>
        </Card>
      ))}
    </Screen>
  );
}

