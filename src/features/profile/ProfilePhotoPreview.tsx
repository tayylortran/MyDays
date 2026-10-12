import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { PhotoImage } from '@/src/components/PhotoImage';
import type { SharedCover } from '@/src/data/friendTypes';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { photo: SharedCover | null; title?: string; onClose: () => void };

export function ProfilePhotoPreview({ photo, title, onClose }: Props) {
  return (
    <Modal visible={photo !== null} transparent animationType="fade" onRequestClose={onClose}>
      {photo && <PreviewContent key={`${photo.id}:${photo.uri}`} photo={photo} title={title} onClose={onClose} />}
    </Modal>
  );
}

function PreviewContent({ photo, title, onClose }: Props & { photo: SharedCover }) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [ratio, setRatio] = useState(3 / 4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const maxHeight = Math.max(80, height - insets.top - insets.bottom - 140);
  const frameWidth = Math.min(width - 32, 720, maxHeight * ratio);

  return (
    <Pressable accessible={false} onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close photo preview" onPress={onClose}
        style={{ position: 'absolute', top: insets.top + 8, right: 16, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="close" size={26} color={colors.onColor} />
      </Pressable>
      <Pressable accessible={false} onPress={() => {}} style={{ width: frameWidth, height: frameWidth / ratio, borderRadius: 12, overflow: 'hidden', backgroundColor: '#191816' }}>
        <PhotoImage photo={photo} contentFit="cover" contentPosition="center" accessible accessibilityLabel={title ?? `Photo from ${photo.date}`}
          style={{ width: '100%', height: '100%' }}
          onLoad={({ source }) => {
            setRatio(source.width > source.height ? 4 / 3 : source.width === source.height ? 1 : 3 / 4);
            setLoading(false);
          }}
          onError={() => { setError(true); setLoading(false); }} />
        {loading && <ActivityIndicator color={colors.onColor} style={{ position: 'absolute', inset: 0 }} />}
        {error && <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: colors.onColor, textAlign: 'center' }}>Could not load this photo. Close and try again.</Text>
        </View>}
        {title !== undefined && !error && <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: colors.overlay }}>
          <Text style={{ fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 14, lineHeight: 21, color: colors.onColor }}>{title}</Text>
        </View>}
      </Pressable>
      {title === undefined && <Text style={{ color: colors.disabled, fontSize: 13, marginTop: 16 }}>{photo.date}</Text>}
    </Pressable>
  );
}
