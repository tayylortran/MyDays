import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import SignOutButton from '@/src/features/auth/SignOutButton';
import { Modal, Pressable, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { colors, mode, setMode, saveError } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: Math.max(insets.bottom, 20),
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Settings</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
            <Text style={{ fontSize: 16 }}>Dark mode</Text>
            <Switch accessibilityLabel="Dark mode" value={mode === 'dark'}
              onValueChange={(enabled) => setMode(enabled ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.onColor} ios_backgroundColor={colors.border} />
          </View>
          {saveError && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{saveError}</Text>}
          {visible && <SignOutButton />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
