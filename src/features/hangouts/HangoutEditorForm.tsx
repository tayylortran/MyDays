import { PhotoImage } from '@/src/components/PhotoImage';
import { MAX_HANGOUT_PHOTOS, type Circle } from '@/src/data/types';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hangoutDate, hangoutSerif } from './hangoutStyles';
import type { HangoutEditorController } from './useHangoutEditor';

// The surrounding flow owns the native Modal so view/edit never stack modals.
export function HangoutEditorForm({ controller, circles }: { controller: HangoutEditorController; circles: Circle[] }) {
  const insets = useSafeAreaInsets();
  const [photoMenu, setPhotoMenu] = useState<{ left: number; top: number; width: number } | null>(null);
  const sheetRef = useRef<View>(null);
  const addPhotoRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const diaryRef = useRef<TextInput>(null);
  const scrollOffset = useRef(0);
  const revealDiary = useCallback(() => {
    const keyboard = Keyboard.metrics();
    if (!keyboard || !diaryRef.current?.isFocused()) return;
    diaryRef.current.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + 16 - keyboard.screenY;
      if (overlap > 0 && diaryRef.current?.isFocused()) {
        scrollRef.current?.scrollTo({ y: scrollOffset.current + overlap, animated: true });
      }
    });
  }, []);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', revealDiary);
    return () => subscription.remove();
  }, [revealDiary]);
  if (controller.state.mode !== 'edit') return null;
  const { draft, original } = controller.state;
  const circle = circles.find((c) => c.id === draft.hangout.circleId);
  const color = circle?.color ?? '#333';
  const disabled = controller.working !== null;

  function choosePhotoSource() {
    if (disabled) return;
    if (photoMenu) { setPhotoMenu(null); return; }
    Keyboard.dismiss();
    sheetRef.current?.measureInWindow((sheetX, sheetY, sheetWidth, sheetHeight) => {
      addPhotoRef.current?.measureInWindow((x, y, _width, height) => {
        const width = Math.min(260, sheetWidth - 24);
        const below = y - sheetY + height + 6;
        setPhotoMenu({
          width,
          left: Math.max(12, Math.min(x - sheetX, sheetWidth - width - 12)),
          top: Math.max(12, below + 112 <= sheetHeight - 12 ? below : y - sheetY - 118),
        });
      });
    });
  }

  return (
    <KeyboardAvoidingView style={[styles.outer, { paddingTop: insets.top + 16 }]} enabled={Platform.OS === 'android'} behavior="height">
      <View ref={sheetRef} collapsable={false} style={styles.sheet} onLayout={() => setPhotoMenu(null)}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.date}>{hangoutDate(draft.hangout.date)}</Text>
          <Pressable accessibilityRole="button" onPress={controller.close} disabled={disabled} style={styles.cancel}>
            <Text style={styles.muted}>Cancel</Text>
          </Pressable>
        </View>
        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}
          onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}
          automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Text style={styles.label}>Circle</Text>
          <View style={styles.circles}>
            {circles.map((c) => {
              const selected = c.id === draft.hangout.circleId;
              return (
                <Pressable key={c.id} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected, disabled }}
                  onPress={() => controller.change('circleId', c.id)}
                  style={[styles.circle, { borderColor: c.color, backgroundColor: selected ? c.color : 'transparent' }]}>
                  <Text style={{ color: selected ? '#fff' : '#333', fontSize: 13 }}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {circles.length === 0 && <Text style={styles.muted}>Create a circle with + on the calendar first.</Text>}
          <Text style={styles.label}>Title</Text>
          <TextInput accessibilityLabel="Hangout title" placeholder="What did you do?" placeholderTextColor="#777"
            value={draft.hangout.title} onChangeText={(value) => controller.change('title', value)} editable={!disabled}
            multiline style={[styles.title, { borderBottomColor: color }]} />
          <Text style={styles.label}>Photos · {draft.photos.length}/{MAX_HANGOUT_PHOTOS}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip} keyboardShouldPersistTaps="handled">
            {draft.photos.length < MAX_HANGOUT_PHOTOS && (
              <Pressable ref={addPhotoRef} collapsable={false} accessibilityRole="button" accessibilityLabel="Add photos" disabled={disabled}
                accessibilityState={{ expanded: photoMenu !== null, disabled }}
                onPress={choosePhotoSource} style={styles.addPhoto}>
                <Ionicons name="add" size={24} color="#756f66" />
                <Text style={styles.muted}>{controller.working === 'pick' ? 'Opening…' : 'Add'}</Text>
              </Pressable>
            )}
            {draft.photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoItem}>
                <PhotoImage photo={photo} thumbnail style={styles.photo} contentFit="cover" />
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${index + 1}`} disabled={disabled}
                  onPress={() => controller.removePhoto(photo.id)} style={styles.removePhoto}>
                  <Ionicons name="close" size={17} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.label}>Diary</Text>
          <TextInput accessibilityLabel="Diary" placeholder="Anything you want to remember…" placeholderTextColor="#777"
            value={draft.hangout.note} onChangeText={(value) => controller.change('note', value)} editable={!disabled}
            ref={diaryRef} onFocus={revealDiary} onLayout={revealDiary}
            multiline textAlignVertical="top" style={styles.diary} />
          {!!controller.error && <Text accessibilityLiveRegion="polite" style={styles.error}>{controller.error}</Text>}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: controller.working === 'save' }}
            disabled={disabled} onPress={controller.save}
            style={({ pressed }) => [styles.save, { backgroundColor: color, opacity: disabled || pressed ? 0.65 : 1 }]}>
            <Text style={styles.saveText}>{controller.working === 'save' ? 'Saving…' : original ? 'Save changes' : `Save${circle ? ` to ${circle.name}` : ''}`}</Text>
          </Pressable>
        </View>
        {photoMenu && !disabled && (
          <View style={StyleSheet.absoluteFill} accessibilityViewIsModal onAccessibilityEscape={() => setPhotoMenu(null)}>
            <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Dismiss photo menu"
              onPress={() => setPhotoMenu(null)} />
            <View style={[styles.photoMenu, photoMenu]}>
              {(['camera', 'library'] as const).map((source) => (
                <Pressable key={source} accessibilityRole="button"
                  onPress={() => { setPhotoMenu(null); void controller.pickPhotos(source); }}
                  style={({ pressed }) => [styles.photoSource, source === 'library' && styles.photoSourceDivider, pressed && styles.photoSourcePressed]}>
                  <Ionicons name={source === 'camera' ? 'camera-outline' : 'images-outline'} size={20} color="#49433b" />
                  <Text style={styles.photoSourceText}>{source === 'camera' ? 'Take photo' : 'Choose from camera roll'}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { flex: 1, backgroundColor: '#fffdfa', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd8d1', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 6 },
  date: { fontFamily: hangoutSerif, fontSize: 28, color: '#292622', flex: 1 },
  cancel: { minHeight: 44, paddingLeft: 16, justifyContent: 'center' },
  muted: { color: '#756f66', fontSize: 13 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  label: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700', color: '#817a70', textTransform: 'uppercase', marginTop: 22, marginBottom: 12 },
  circles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  circle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  title: { fontFamily: hangoutSerif, color: '#292622', fontSize: 25, paddingTop: 6, paddingBottom: 14, borderBottomWidth: 2 },
  photoStrip: { gap: 10, paddingTop: 6, paddingBottom: 2 },
  photoMenu: { position: 'absolute', borderRadius: 14, backgroundColor: '#fffdfa', borderWidth: 1, borderColor: '#e5e0d9', paddingVertical: 4, shadowColor: '#292622', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 8 },
  photoSource: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 },
  photoSourceDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e0d9' },
  photoSourcePressed: { backgroundColor: '#f2eee7' },
  photoSourceText: { flexShrink: 1, color: '#49433b', fontSize: 14 },
  photoItem: { width: 82, height: 104 },
  photo: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#eee' },
  addPhoto: { width: 72, height: 104, borderWidth: 1, borderColor: '#e5e0d9', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6 },
  removePhoto: { position: 'absolute', top: 2, right: 2, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  diary: { minHeight: 130, maxHeight: 160, backgroundColor: '#f2eee7', borderRadius: 18, padding: 16, color: '#49433b', fontSize: 15, lineHeight: 23 },
  error: { color: '#a33', marginTop: 16, lineHeight: 20 },
  footer: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#fffdfa' },
  save: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 14 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
