import { listCircles, nextCircleSort, saveCircle } from '@/src/data/circles';
import { listHangouts, saveHangout } from '@/src/data/hangouts';
import { Circle, Hangout } from '@/src/data/types';
import { monthKey, todayISODate } from '@/src/lib/dates';
import { newId } from '@/src/lib/id';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function Home() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [hangouts, setHangouts] = useState<Hangout[]>([]);

  useEffect(() => {
    (async () => {
      // 1. seed circles once, if the table is empty
      let cs = await listCircles();
      if (cs.length === 0) {
        await saveCircle({ id: newId(), name: 'close friends', color: '#E8674C', sort: await nextCircleSort(), updatedAt: Date.now() });
        await saveCircle({ id: newId(), name: 'family', color: '#E0A73E', sort: await nextCircleSort(), updatedAt: Date.now() });
        cs = await listCircles();
      }
      setCircles(cs);

      // 2. seed one hangout for this month, if none yet
      const month = monthKey(todayISODate());
      let hs = await listHangouts(month);
      if (hs.length === 0 && cs.length > 0) {
        await saveHangout({
          id: newId(),
          date: todayISODate(),
          title: 'coffee at starbucks',
          note: 'with sam',
          circleId: cs[0].id,
          updatedAt: Date.now(),
        });
        hs = await listHangouts(month);
      }
      setHangouts(hs);
    })();
  }, []);

  // quick lookup: circleId -> Circle, so a hangout can show its color/name
  const circleById: Record<string, Circle> = {};
  circles.forEach((c) => (circleById[c.id] = c));

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Circles</Text>
        {circles.map((c) => (
          <Text key={c.id} style={{ color: c.color }}>● {c.name}</Text>
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>This month</Text>
        {hangouts.length === 0 && <Text style={{ color: '#999' }}>no hangouts yet</Text>}
        {hangouts.map((h) => {
          const c = circleById[h.circleId];
          return (
            <Text key={h.id} style={{ color: c?.color }}>
              {h.date} — {h.title} ({c?.name})
            </Text>
          );
        })}
      </View>
    </ScrollView>
  );
}