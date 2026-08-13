import { Pressable, Text, View } from 'react-native';

type ProfileViewSwitcherProps = {
  viewMode: 'calendar' | 'grid';
  onChange: (mode: 'calendar' | 'grid') => void;
};

export function ProfileViewSwitcher({ viewMode, onChange }: ProfileViewSwitcherProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
      <Pressable
        onPress={() => onChange('calendar')}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: viewMode === 'calendar' ? '#333' : '#eee',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: viewMode === 'calendar' ? '#fff' : '#333', fontWeight: '600' }}>
          Calendar
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onChange('grid')}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: viewMode === 'grid' ? '#333' : '#eee',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: viewMode === 'grid' ? '#fff' : '#333', fontWeight: '600' }}>
          Grid
        </Text>
      </Pressable>
    </View>
  );
}