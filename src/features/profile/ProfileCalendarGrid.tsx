import { PhotoImage } from '@/src/components/PhotoImage';
import type { Photo } from '@/src/data/types';
import { monthGrid, WEEKDAYS } from '@/src/lib/dates';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

type ProfileCalendarGridProps = {
  year: number;
  month: number;
  faces: Record<string, Pick<Photo, 'uri' | 'thumbUri' | 'cacheKey' | 'thumbCacheKey'>>;
  photoDates?: ReadonlySet<string>;
  onPressDay?: (date: string) => void;
};

export function ProfileCalendarGrid({
  year,
  month,
  faces,
  photoDates = new Set(),
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
                  onPress={() => onPressDay?.(date)}
                  accessibilityRole={onPressDay ? 'button' : faces[date] ? 'image' : 'text'}
                  accessibilityLabel={`${date}, ${!onPressDay ? faces[date] ? 'Cover photo' : 'No cover photo' : faces[date] ? 'Change cover photo' : photoDates.has(date) ? 'Choose cover photo' : 'No photos'}`}
                  disabled={!onPressDay || (!faces[date] && !photoDates.has(date))}
                  style={({ pressed }) => ({
                    flex: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f4f2ee',
                    borderWidth: !faces[date] && photoDates.has(date) ? 1 : 0,
                    borderColor: '#b4aa9c',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  {faces[date] ? (
                    <PhotoImage
                      photo={faces[date]}
                      thumbnail
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : (
                    <>
                      <Text style={{ fontSize: 11, color: photoDates.has(date) ? '#766d60' : '#bbb', padding: 4 }}>
                        {Number(date.slice(8))}
                      </Text>
                      {photoDates.has(date) && (
                        <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="image-outline" size={20} color="#8a7e6d" />
                        </View>
                      )}
                    </>
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
