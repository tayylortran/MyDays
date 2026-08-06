import { Circle, Hangout } from '@/src/data/types';
import { monthGrid, WEEKDAYS } from '@/src/lib/dates';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, Text, View } from 'react-native';

type CalendarGridProps = {
  year: number;
  month: number;
  byDate: Record<string, Hangout[]>;
  circleById: Record<string, Circle>;
  onPressDay: (date: string) => void;
  onPressHangout: (hangout: Hangout) => void;
};

export function CalendarGrid({
  year,
  month,
  byDate,
  circleById,
  onPressDay,
  onPressHangout,
}: CalendarGridProps) {
  const cells = monthGrid(year, month);
  const weeks: (string | null)[][] = [];
  const [calendarHeight, setCalendarHeight] = useState(0);
  const weekdayRowHeight = 20;

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const dayCellHeight =
    calendarHeight > weekdayRowHeight ? (calendarHeight - weekdayRowHeight) / 6 : undefined;

  function handleLayout(event: LayoutChangeEvent) {
    setCalendarHeight(event.nativeEvent.layout.height);
  }

  return (
    <View style={{ flex: 1 }} onLayout={handleLayout}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
      <View style={{ flexDirection: 'row', height: weekdayRowHeight, alignItems: 'center' }}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: '#999', fontSize: 12 }}>
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((date, di) => (
            <View key={di} style={{ flex: 1, height: dayCellHeight, minHeight: 72, padding: 3 }}>
              {date && (
                <Pressable
                  onPress={() => onPressDay(date)}
                  style={{ flex: 1, borderRadius: 8, backgroundColor: '#f4f2ee', padding: 4 }}
                >
                  <Text style={{ fontSize: 11, color: '#666' }}>{Number(date.slice(8))}</Text>

                  {(byDate[date] || []).map((h) => (
                    <Pressable
                      key={h.id}
                      onPress={() => onPressHangout(h)}
                      style={{
                        backgroundColor: `${circleById[h.circleId]?.color ?? '#999'}33`,
                        borderRadius: 4,
                        paddingHorizontal: 3,
                        paddingVertical: 1,
                        marginTop: 2,
                      }}
                    >
                      <Text numberOfLines={1} style={{ fontSize: 9 }}>
                        {h.title}
                      </Text>
                    </Pressable>
                  ))}
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}
      </ScrollView>
    </View>
  );
}
