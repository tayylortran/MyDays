import { MONTHS } from '@/src/lib/dates';
import { Pressable, Text, View } from 'react-native';

type MonthHeaderProps = {
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
};

export function MonthHeader({ month, year, onPrev, onNext }: MonthHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <Pressable onPress={onPrev} hitSlop={12}>
        <Text style={{ fontSize: 26 }}>{'<'}</Text>
      </Pressable>

      <Text style={{ fontSize: 20, fontWeight: '600' }}>
        {MONTHS[month]} {year}
      </Text>

      <Pressable onPress={onNext} hitSlop={12}>
        <Text style={{ fontSize: 26 }}>{'>'}</Text>
      </Pressable>
    </View>
  );
}
