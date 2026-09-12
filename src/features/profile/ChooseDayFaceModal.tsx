import { PhotoImage } from '@/src/components/PhotoImage';
import type { Photo } from '@/src/data/types';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ChooseDayFaceModalProps = {
  openDate: string | null;
  dayPhotos: Photo[];
  selectedPhotoId: string | null;
  onSelectPhoto: (id: string) => void;
  saving: boolean;
  error: string;
  onClose: () => void;
  onChooseFace: () => void;
};

export function ChooseDayFaceModal({
  openDate, dayPhotos, selectedPhotoId, onSelectPhoto, saving, error, onClose, onChooseFace,
}: ChooseDayFaceModalProps) {
  const insets = useSafeAreaInsets();
  const [year, month, day] = (openDate ?? '').split('-').map(Number);
  const date = openDate
    ? new Date(year, month - 1, day)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  const disabled = saving || !selectedPhotoId;

  return (
    <Modal visible={openDate !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close photo picker" onPress={onClose} disabled={saving} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Cover for {date}</Text>
          <Text style={styles.caption}>{"Pick this day's photo"}</Text>
          <FlatList
            key={openDate ?? 'closed'}
            data={dayPhotos}
            extraData={{ selectedPhotoId, saving }}
            keyExtractor={(photo) => photo.id}
            numColumns={3}
            style={styles.grid}
            contentContainerStyle={styles.gridContent}
            renderItem={({ item }) => {
              const selected = item.id === selectedPhotoId;
              return (
                <View style={styles.cell}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Select photo"
                    accessibilityState={{ selected, disabled: saving }} disabled={saving}
                    onPress={() => onSelectPhoto(item.id)}
                    style={[styles.photoButton, selected && styles.selected]}>
                    <PhotoImage photo={item} thumbnail contentFit="cover" style={styles.photo} />
                    {selected && (
                      <View style={styles.check}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            }}
          />
          {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: saving }}
            disabled={disabled} onPress={onChooseFace}
            style={({ pressed }) => [styles.confirm, { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }]}>
            <Text style={styles.confirmText}>{saving ? 'Saving?' : 'Use this photo'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '80%', backgroundColor: '#fffdfa', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd8d1', alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  title: { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 27, color: '#292622' },
  caption: { fontSize: 13, color: '#756f66', marginTop: 6, marginBottom: 18 },
  grid: { flexGrow: 0, flexShrink: 1, marginHorizontal: -3 },
  gridContent: { paddingBottom: 6 },
  cell: { width: '33.333333%', padding: 3 },
  photoButton: { aspectRatio: 0.8, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', padding: 1 },
  selected: { borderColor: '#bd3d39' },
  photo: { width: '100%', height: '100%', borderRadius: 10, backgroundColor: '#eee' },
  check: { position: 'absolute', right: 7, top: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: '#bd3d39', alignItems: 'center', justifyContent: 'center' },
  error: { color: '#a33', marginTop: 8, fontSize: 13 },
  confirm: { minHeight: 48, borderRadius: 14, backgroundColor: '#211e1a', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
