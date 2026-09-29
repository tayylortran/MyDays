import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import SignOutButton from '@/src/features/auth/SignOutButton';
import { BlockedUsersPanel } from '@/src/features/friends/BlockedUsersPanel';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, Switch, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  return visible ? <SettingsDialog onClose={onClose} /> : null;
}

function SettingsDialog({ onClose }: Pick<SettingsModalProps, 'onClose'>) {
  const { colors, mode, setMode, saveError } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const dismiss = () => {
    if (working) return;
    if (blockedOpen) setBlockedOpen(false);
    else onClose();
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        onPress={dismiss}
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
          {blockedOpen ? <View style={{ height: Math.min(520, height * 0.65), gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Back to settings" disabled={working}
                onPress={dismiss} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
              <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600' }}>Blocked users</Text>
            </View>
            <BlockedUsersPanel onWorkingChange={setWorking} />
          </View> : <>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Settings</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
            <Text style={{ fontSize: 16 }}>Dark mode</Text>
            <Switch accessibilityLabel="Dark mode" value={mode === 'dark'}
              onValueChange={(enabled) => setMode(enabled ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.onColor} ios_backgroundColor={colors.border} />
          </View>
          {saveError && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{saveError}</Text>}
          <Pressable accessibilityRole="button" onPress={() => setBlockedOpen(true)}
            style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16 }}>Blocked users</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
          <SignOutButton />
          </>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
