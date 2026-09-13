import { saveCircle } from '@/src/data/supabase/circles';
import { listHangouts, saveHangout } from '@/src/data/supabase/hangouts';
import type { Hangout } from '@/src/data/types';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { todayISODate } from '@/src/lib/dates';
import { newId } from '@/src/lib/id';
import { supabase } from '@/src/lib/supabase';
import { useRef, useState } from 'react';
import { Button, ScrollView, Text } from 'react-native';

const key = 'mydays.dev.hangout-test';
type Fixture = { ownerId: string; hangout: Hangout; ready: boolean };

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export function HangoutsTestPanel() {
  const { user } = useAuth();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('Run as account A, then B, then A again. Use the same device.');

  async function run(cleanup = false) {
    if (!user || running.current) return;
    running.current = true;
    setBusy(true);
    setResult('Working… Wait for the result before switching accounts.');
    try {
      // Only test identifiers/data are retained so account switching needs no copy/paste.
      const stored = localStorage.getItem(key);
      let fixture: Fixture | null = stored ? JSON.parse(stored) : null;
      if (cleanup) {
        check(!!fixture, 'There are no saved test records to clean up.');
        check(fixture!.ownerId === user.id, 'Sign back into account A to clean up.');
        for (const [table, id] of [['hangouts', fixture!.hangout.id], ['circles', fixture!.hangout.circleId]]) {
          const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
          if (error) throw error;
        }
        localStorage.removeItem(key);
        setResult('Test records removed. Your normal calendar data was not changed.');
        return;
      }
      if (!fixture) {
        fixture = {
          ownerId: user.id, ready: false,
          hangout: { id: newId(), circleId: newId(), date: todayISODate(), title: 'Cloud hangout test', note: 'Test diary', updatedAt: Date.now() },
        };
        localStorage.setItem(key, JSON.stringify(fixture));
      }
      const { hangout } = fixture;
      const month = hangout.date.slice(0, 7);
      const read = async () => (await listHangouts(month)).find((item) => item.id === hangout.id);
      if (fixture.ownerId === user.id) {
        if (!fixture.ready) {
          await saveCircle({ id: hangout.circleId, name: 'Cloud test circle', color: '#3377cc', sort: 0, updatedAt: Date.now() });
          // Retry a partially completed test without creating duplicate fixtures.
          if (!(await read())) await saveHangout({ mode: 'create', hangout });
        }
        const before = await read();
        check(!!before && before.date === hangout.date && before.circleId === hangout.circleId && before.note === hangout.note,
          'The owner could not read the expected hangout fields.');
        if (fixture.ready) check(before!.title === 'Edited cloud test', 'The saved title changed unexpectedly.');
        await saveHangout({ mode: 'edit', hangout: { ...hangout, title: 'Edited cloud test' } });
        const after = await read();
        check(!!after && after.title === 'Edited cloud test' && after.date === hangout.date && after.circleId === hangout.circleId && after.note === hangout.note,
          'The edited hangout did not read back correctly.');
        fixture.ready = true;
        localStorage.setItem(key, JSON.stringify(fixture));
        setResult('PASS: owner create/read/edit, ID, date, circle, and diary. Now run as account B; return here afterward to verify it stayed unchanged.');
      } else {
        check(fixture.ready, 'Finish the test as account A first.');
        check(!(await read()), 'FAIL: account B can read account A’s hangout.');
        // Direct ID-based requests test server rules without client-side owner filters.
        const { data, error } = await supabase.from('hangouts')
          .update({ title: 'Unauthorized edit' }).eq('id', hangout.id).select('id');
        if (error) throw error;
        check(data.length === 0, 'FAIL: account B could edit account A’s hangout.');

        const probeId = newId();
        try {
          let blocked = false;
          try {
            await saveHangout({ mode: 'create', hangout: { ...hangout, id: probeId } });
          } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === '23503') blocked = true;
            else throw error;
          }
          check(blocked, 'FAIL: account B could create a hangout in account A’s circle.');
        } finally {
          const { error } = await supabase.from('hangouts').delete().eq('id', probeId).eq('user_id', user.id);
          if (error) throw error;
        }
        setResult('PASS: account B cannot read/edit A’s hangout or create one in A’s circle. Sign back into A and run once more before cleanup.');
      }
    } catch (error) {
      setResult(error && typeof error === 'object' && 'message' in error ? `Test stopped: ${String(error.message)}` : 'Test stopped: unexpected error.');
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ maxHeight: 240, flexGrow: 0, backgroundColor: '#eee' }} contentContainerStyle={{ padding: 12, gap: 8 }}>
      <Text style={{ fontWeight: '600' }}>Cloud hangout test</Text>
      <Text>Signed in: {user?.email ?? user?.id}</Text>
      <Button title="Run hangout checks" disabled={busy || !user} onPress={() => void run()} />
      <Button title="Clean up test records" disabled={busy || !user} onPress={() => void run(true)} />
      <Text selectable accessibilityLiveRegion="polite">{result}</Text>
    </ScrollView>
  );
}
