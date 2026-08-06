import { monthGrid, WEEKDAYS } from '@/src/lib/dates';
import { Image, Pressable, Text, View } from 'react-native';

type ProfileCalendarGridProps = {
  year: number;
  month: number;
  faces: Record<string, string>;
  onPressDay: (date: string) => void;
};

export function ProfileCalendarGrid({
  year,
  month,
  faces,
  onPressDay,
}: ProfileCalendarGridProps) {
  const cells = monthGrid(year, month);
  const weeks: (string | null)[][] = [];

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <>
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: '#999', fontSize: 12 }}>
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((date, di) => (
            <View key={di} style={{ flex: 1, aspectRatio: 0.85, padding: 2 }}>
              {date && (
                <Pressable
                  onPress={() => onPressDay(date)}
                  style={{ flex: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f4f2ee' }}
                >
                  {faces[date] ? (
                    <Image source={{ uri: faces[date] }} style={{ flex: 1 }} />
                  ) : (
                    <Text style={{ fontSize: 11, color: '#bbb', padding: 4 }}>{Number(date.slice(8))}</Text>
                  )}
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}
    </>
  );
}
