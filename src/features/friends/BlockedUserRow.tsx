import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';

export function BlockedUserRow({ username, disabled, working, onUnblock }: {
  username: string;
  disabled: boolean;
  working: boolean;
  onUnblock: () => void;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${username}, blocked. Show unblock option`}
        accessibilityState={{ expanded, disabled }} disabled={disabled}
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.65 : 1 })}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: '600' }}>{username}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Blocked</Text>
        </View>
        {working ? <ActivityIndicator color={colors.muted} />
          : <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />}
      </Pressable>
      {expanded && <View style={{ paddingBottom: 12, gap: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
          Unblocking removes your block. To become friends again, send a new request.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setExpanded(false)}
            style={{ minHeight: 48, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={{ color: colors.muted }}>Cancel</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Unblock ${username}`}
            accessibilityState={{ disabled, busy: working }} disabled={disabled} onPress={onUnblock}
            style={{ minHeight: 48, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 12,
              backgroundColor: colors.action, opacity: disabled ? 0.5 : 1 }}>
            <Text style={{ color: colors.onAction, fontWeight: '600' }}>{working ? 'Unblocking…' : 'Unblock'}</Text>
          </Pressable>
        </View>
      </View>}
    </View>
  );
}
