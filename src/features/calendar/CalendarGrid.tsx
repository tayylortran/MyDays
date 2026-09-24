import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { Circle, Hangout } from '@/src/data/types';
import { monthGrid, WEEKDAYS } from '@/src/lib/dates';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';

type CalendarGridProps = {
  year: number;
  month: number;
  byDate: Record<string, Hangout[]>;
  circleById: Record<string, Circle>;
  onPressDay: (date: string) => void;
  onPressHangout: (hangout: Hangout) => void;
  openingGesture?: PanGesture;
};

export function CalendarGrid({
  year,
  month,
  byDate,
  circleById,
  onPressDay,
  onPressHangout,
  openingGesture,
}: CalendarGridProps) {
  const { colors } = useTheme();
  const scrollGesture = useMemo(() => {
    const gesture = Gesture.Native();
    return openingGesture ? gesture.requireExternalGestureToFail(openingGesture) : gesture;
  }, [openingGesture]);
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

  function getTitleTextStyle(title: string) {
    const hasMultipleWords = /\s/.test(title.trim());

    return {
      numberOfLines: hasMultipleWords ? 2 : 1,
      fontSize: 9,
      lineHeight: hasMultipleWords ? 11 : undefined,
    };
  }

  return (
    <View style={{ flex: 1 }} onLayout={handleLayout}>
      <GestureDetector gesture={scrollGesture}>
      <ScrollView
        bounces={false}
        scrollEnabled={!openingGesture}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
      <View style={{ flexDirection: 'row', height: weekdayRowHeight, alignItems: 'center' }}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: colors.subtle, fontSize: 12 }}>
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((date, di) => (
            <View key={di} style={{ flex: 1, height: dayCellHeight, minHeight: openingGesture ? 0 : 72, padding: 3, overflow: 'hidden' }}>
              {date && (
                <Pressable
                  onPress={() => onPressDay(date)}
                  style={{ flex: 1, borderRadius: 8, backgroundColor: colors.surfaceAlt, padding: 4 }}
                >
                  <Text style={{ fontSize: 11, color: colors.muted }}>{Number(date.slice(8))}</Text>

                  {(byDate[date] || []).map((h) => (
                    <Pressable
                      key={h.id}
                      onPress={() => onPressHangout(h)}
                      style={{
                        backgroundColor: `${circleById[h.circleId]?.color ?? '#999999'}33`,
                        borderRadius: 4,
                        paddingHorizontal: 3,
                        paddingVertical: 2,
                        marginTop: 2,
                      }}
                    >
                      <Text
                        numberOfLines={getTitleTextStyle(h.title).numberOfLines}
                        style={{
                          fontSize: getTitleTextStyle(h.title).fontSize,
                          lineHeight: getTitleTextStyle(h.title).lineHeight,
                        }}
                      >
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
      </GestureDetector>
    </View>
  );
}
