import { monthGrid, WEEKDAYS } from '@/src/lib/dates';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

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
  const dayCellAspectRatio = 0.8;
  const cells = monthGrid(year, month);
  const weeks: (string | null)[][] = [];

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
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
            <View key={di} style={{ flex: 1, aspectRatio: dayCellAspectRatio, padding: 2 }}>
              {date && (
                <Pressable
                  onPress={() => onPressDay(date)}
                  style={{ flex: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f4f2ee' }}
                >
                  {faces[date] ? (
                    <Image
                      source={{ uri: faces[date] }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={{ fontSize: 11, color: '#bbb', padding: 4 }}>{Number(date.slice(8))}</Text>
                  )}
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
