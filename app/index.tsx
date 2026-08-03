import { getDb } from '@/src/data/db';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function Home() {
  const [status, setStatus] = useState('opening database…');

  useEffect(() => {
    getDb()
      .then(() => setStatus('database ready ✓'))
      .catch((e) => setStatus('error: ' + e.message));
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{status}</Text>
    </View>
  );
}
