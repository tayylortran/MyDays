import { useRepo } from '@/src/data/RepositoryProvider';
import { Circle, Hangout } from '@/src/data/types';
import { monthKey, todayISODate } from '@/src/lib/dates';
import { newId } from '@/src/lib/id';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function Home() {
  const repo = useRepo();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [hangouts, setHangouts] = useState<Hangout[]>([]);

  useEffect(() => {
    (async () => {
      let cs = await repo.listCircles();
      if (cs.length === 0) {
        await repo.saveCircle({ id: newId(), name: 'close friends', color: '#E8674C', sort: await repo.nextCircleSort(), updatedAt: Date.now() });
        await repo.saveCircle({ id: newId(), name: 'family', color: '#E0A73E', sort: await repo.nextCircleSort(), updatedAt: Date.now() });
        cs = await repo.listCircles();
      }
      setCircles(cs);

      const month = monthKey(todayISODate());
      let hs = await repo.listHangouts(month);
      if (hs.length === 0 && cs.length > 0) {
        await repo.saveHangout({ id: newId(), date: todayISODate(), title: 'coffee at starbucks', note: 'with sam', circleId: cs[0].id, updatedAt: Date.now() });
        hs = await repo.listHangouts(month);
      }
      setHangouts(hs);
    })();
  }, []);

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
          return <Text key={h.id} style={{ color: c?.color }}>{h.date} — {h.title} ({c?.name})</Text>;
        })}
      </View>
    </ScrollView>
  );
}