import type { ThemeColors } from '@/src/theme/palette';
import { useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { PhotoImage } from '@/src/components/PhotoImage';
import type { Circle, Photo } from '@/src/data/types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HangoutDetailView } from './HangoutDetailView';
import { HangoutEditorForm } from './HangoutEditorForm';
import type { HangoutEditorController } from './useHangoutEditor';

export function HangoutFlowModal({ controller, circles }: { controller: HangoutEditorController; circles: Circle[] }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [preview, setPreview] = useState<Photo | null>(null);
  const insets = useSafeAreaInsets();
  const mode = controller.state.mode;
  useEffect(() => { setPreview(null); }, [mode]);
  return (
    <Modal visible={mode !== 'closed'} transparent animationType="slide" statusBarTranslucent
      onRequestClose={() => preview ? setPreview(null) : controller.close()}>
      {mode === 'edit' && <HangoutEditorForm controller={controller} circles={circles} />}
      {mode === 'view' && <HangoutDetailView controller={controller} circles={circles} onPreview={setPreview} />}
      {mode === 'loading' && (
        <View style={styles.loading}>
          {controller.error ? (
            <>
              <Text style={styles.error}>{controller.error}</Text>
              <Pressable style={styles.action} accessibilityRole="button" onPress={() => {
                if (controller.state.mode === 'loading') void controller.openDetail(controller.state.hangout);
              }}><Text>Try again</Text></Pressable>
            </>
          ) : <ActivityIndicator size="large" color={colors.text} />}
          <Pressable style={styles.action} accessibilityRole="button" onPress={controller.close}><Text>Close</Text></Pressable>
        </View>
      )}
      {preview && (
        <View style={styles.preview} accessibilityViewIsModal>
          <PhotoImage photo={preview} style={StyleSheet.absoluteFill} contentFit="contain" />
          <Pressable accessibilityRole="button" accessibilityLabel="Close photo preview" onPress={() => setPreview(null)}
            style={[styles.close, { top: insets.top + 12 }]}>
            <Ionicons name="close" size={24} color={colors.onAction} />
          </Pressable>
        </View>
      )}
    </Modal>
  );
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, gap: 20, padding: 24 },
  error: { color: colors.danger, textAlign: 'center' },
  action: { paddingHorizontal: 24, paddingVertical: 14, backgroundColor: colors.surfaceAlt, borderRadius: 12 },
  preview: { ...StyleSheet.absoluteFill, backgroundColor: '#141414' },
  close: { position: 'absolute', right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center' },
});
