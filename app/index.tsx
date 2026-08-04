import { useRepo } from '@/src/data/RepositoryProvider';
import { Circle, Hangout } from '@/src/data/types';
import { monthGrid, MONTHS, WEEKDAYS } from '@/src/lib/dates';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export default function Home() {
  const repo = useRepo();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [hangouts, setHangouts] = useState<Hangout[]>([]);
  const [circleById, setCircleById] = useState<Record<string, Circle>>({});

  const load = useCallback(async () => {
    const cs = await repo.listCircles();
    const map: Record<string, Circle> = {};
    cs.forEach((c) => (map[c.id] = c));
    setCircleById(map);
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    setHangouts(await repo.listHangouts(key));
  }, [repo, year, month]);

  useEffect(() => { load(); }, [load]);

  const byDate: Record<string, Hangout[]> = {};
  hangouts.forEach((h) => { (byDate[h.date] ||= []).push(h); });

  const prev = () => { if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1); };
  const next = () => { if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1); };

  // split the flat cell list into weeks of 7
  const cells = monthGrid(year, month);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Pressable onPress={prev} hitSlop={12}><Text style={{ fontSize: 26 }}>‹</Text></Pressable>
        <Text style={{ fontSize: 20, fontWeight: '600' }}>{MONTHS[month]} {year}</Text>
        <Pressable onPress={next} hitSlop={12}><Text style={{ fontSize: 26 }}>›</Text></Pressable>
      </View>

      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: '#999', fontSize: 12 }}>{w}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row' }}>
          {week.map((date, di) => (
            <View key={di} style={{ flex: 1, aspectRatio: 0.85, padding: 3 }}>
              {date && (
                <View style={{ flex: 1, borderRadius: 8, backgroundColor: '#f4f2ee', padding: 4 }}>
                  <Text style={{ fontSize: 11, color: '#666' }}>{Number(date.slice(8))}</Text>
                  {(byDate[date] || []).map((h) => (
                    <View key={h.id} style={{ backgroundColor: (circleById[h.circleId]?.color ?? '#999') + '33', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1, marginTop: 2 }}>
                      <Text numberOfLines={1} style={{ fontSize: 9 }}>{h.title}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}