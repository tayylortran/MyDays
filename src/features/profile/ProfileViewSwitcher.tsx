import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { Pressable, View } from 'react-native';

type ProfileViewSwitcherProps = {
  viewMode: 'calendar' | 'grid';
  onChange: (mode: 'calendar' | 'grid') => void;
};

export function ProfileViewSwitcher({ viewMode, onChange }: ProfileViewSwitcherProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
      <Pressable
        onPress={() => onChange('calendar')}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: viewMode === 'calendar' ? colors.action : colors.surfaceAlt,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: viewMode === 'calendar' ? colors.onAction : colors.text, fontWeight: '600' }}>
          Calendar
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onChange('grid')}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: viewMode === 'grid' ? colors.action : colors.surfaceAlt,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: viewMode === 'grid' ? colors.onAction : colors.text, fontWeight: '600' }}>
          Grid
        </Text>
      </Pressable>
    </View>
  );
}
