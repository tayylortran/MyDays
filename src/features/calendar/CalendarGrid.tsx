import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { Circle, Hangout } from '@/src/data/types';
import { monthGrid, WEEKDAYS } from '@/src/lib/dates';
import { hangoutDate } from '@/src/features/hangouts/hangoutStyles';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';

type CalendarGridProps = {
  year: number;
  month: number;
  byDate: Record<string, Hangout[]>;
  circleById: Record<string, Circle>;
  onPressDay: (date: string) => void;
  openingGesture?: PanGesture;
};

export function CalendarGrid({
  year,
  month,
  byDate,
  circleById,
  onPressDay,
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
  const [calendarWidth, setCalendarWidth] = useState(0);
  const weekdayRowHeight = 20;

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Four points of cell padding leave a minimum 44 x 44 point button.
  const dayCellHeight = Math.max(48, (calendarHeight - weekdayRowHeight) / 6);
  const gridWidth = Math.max(336, calendarWidth);

  function handleLayout(event: LayoutChangeEvent) {
    setCalendarHeight(event.nativeEvent.layout.height);
    setCalendarWidth(event.nativeEvent.layout.width);
  }

  function getTitleTextStyle(title: string) {
    const hasMultipleWords = /\s/.test(title.trim());

    return {
      numberOfLines: hasMultipleWords ? 2 : 1,
      fontSize: 11,
      lineHeight: hasMultipleWords ? 13 : undefined,
    };
  }

  return (
    <View style={{ flex: 1 }} onLayout={handleLayout}>
      <ScrollView horizontal bounces={false} scrollEnabled={calendarWidth < 336}
        contentContainerStyle={{ width: gridWidth }}>
      <GestureDetector gesture={scrollGesture}>
      <ScrollView
        style={{ width: gridWidth }}
        bounces={false}
        scrollEnabled={!openingGesture || calendarHeight < 308}
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
            <View key={di} style={{ flex: 1, height: dayCellHeight, padding: 2, overflow: 'hidden' }}>
              {date && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${hangoutDate(date, true)}, ${(byDate[date] || []).length} hangouts`}
                  accessibilityHint={(byDate[date] || []).length ? 'Shows hangouts for this day' : 'Add a hangout for this day'}
                  onPress={() => onPressDay(date)}
                  style={({ pressed }) => ({ flex: 1, minHeight: 44, minWidth: 44, borderRadius: 8, backgroundColor: pressed ? colors.pressed : colors.surfaceAlt, paddingVertical: 2, paddingHorizontal: 0, overflow: 'hidden' })}
                >
                  <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Text style={{ fontSize: 11, color: colors.muted }}>{Number(date.slice(8))}</Text>

                  {(byDate[date] || []).map((h) => (
                    <View
                      key={h.id}
                      style={{
                        backgroundColor: `${circleById[h.circleId]?.color ?? '#999999'}33`,
                        borderRadius: 4,
                        paddingHorizontal: 1,
                        paddingVertical: 1,
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
                    </View>
                  ))}
                  </View>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}
      </ScrollView>
      </GestureDetector>
      </ScrollView>
    </View>
  );
}
