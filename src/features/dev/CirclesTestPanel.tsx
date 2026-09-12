import { useAuth } from '@/src/features/auth/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { useRef, useState } from 'react';
import { Button, ScrollView, Text, TextInput, View } from 'react-native';

type Action = 'create' | 'read' | 'edit' | 'delete' | 'foreign';

export function CirclesTestPanel() {
  const { user } = useAuth();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [circleId, setCircleId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [result, setResult] = useState('Tap Read cloud circles to begin.');

  async function run(action: Action) {
    if (!user || running.current) return;

    if ((action === 'edit' || action === 'delete') && !circleId.trim()) {
      setResult('Paste the test circle ID first.');
      return;
    }
    if (action === 'foreign' && (!ownerId.trim() || ownerId.trim() === user.id)) {
      setResult('Paste a different account’s user ID first.');
      return;
    }

    running.current = true;
    setBusy(true);
    setResult('Working…');

    try {
      const table = supabase.from('circles');
      if (action === 'create' || action === 'foreign') {
        const { data, error } = await table.insert({
          name: `Test circle ${user.id.slice(0, 8)}`,
          color: '#3377cc',
          sort: 0,
          updated_at: Date.now(),
          ...(action === 'foreign' ? { user_id: ownerId.trim() } : {}),
        }).select('id, user_id, name');

        if (error) throw error;
        if (action === 'create' && data[0]) setCircleId(data[0].id);
        setResult(
          action === 'foreign'
            ? 'FAILED: creating a circle for another account was allowed.'
            : JSON.stringify(data, null, 2)
        );
        return;
      }

      if (action === 'edit' || action === 'delete') {
        const query = action === 'edit'
          ? table.update({ name: 'Edited test circle', updated_at: Date.now() })
          : table.delete();
        const { data, error } = await query.eq('id', circleId.trim()).select('id');
        if (error) throw error;
        setResult(`${action}: ${data.length} row(s) affected. Expected: 1 for the owner, 0 for another account. A missing ID also returns 0.`);
        return;
      }

      // No user filter: the database's ownership policy must restrict results.
      const { data, error } = await table
        .select('id, user_id, name')
        .order('sort');

      if (error) throw error;

      setResult(
        data.length === 0
          ? 'No cloud circles visible to this account.'
          : JSON.stringify(data, null, 2)
      );
    } catch (error) {
      setResult(
        error && typeof error === 'object' && 'message' in error
          ? `Request rejected: ${String(error.message)}`
          : 'The test failed.'
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ maxHeight: 300, flexGrow: 0, backgroundColor: '#eee' }}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <Text style={{ fontWeight: '600' }}>Cloud circles test</Text>
      <Text selectable>Signed-in user: {user?.id}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Button title="Create test circle" disabled={busy} onPress={() => void run('create')} />
        <Button title="Read cloud circles" disabled={busy} onPress={() => void run('read')} />
      </View>
      <TextInput
        accessibilityLabel="Test circle ID"
        placeholder="Test circle ID (not user ID)"
        placeholderTextColor="#666"
        value={circleId}
        onChangeText={setCircleId}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        style={{ padding: 8, backgroundColor: '#fff', color: '#222' }}
      />
      <View style={{ flexDirection: 'row' }}>
        <Button title="Edit test circle" disabled={busy} onPress={() => void run('edit')} />
        <Button title="Delete test circle" disabled={busy} onPress={() => void run('delete')} />
      </View>
      <TextInput
        accessibilityLabel="Other account user ID"
        placeholder="Other account’s user ID"
        placeholderTextColor="#666"
        value={ownerId}
        onChangeText={setOwnerId}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        style={{ padding: 8, backgroundColor: '#fff', color: '#222' }}
      />
      <Button title="Try creating for other user" disabled={busy} onPress={() => void run('foreign')} />
      <Text selectable>{result}</Text>
    </ScrollView>
  );
}
