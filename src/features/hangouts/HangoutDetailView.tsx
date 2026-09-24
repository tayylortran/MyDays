import type { ThemeColors } from '@/src/theme/palette';
import { useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { PhotoImage } from '@/src/components/PhotoImage';
import type { Circle, Photo } from '@/src/data/types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { circleTint, hangoutDate, hangoutSerif } from './hangoutStyles';
import type { HangoutEditorController } from './useHangoutEditor';

export function HangoutDetailView({ controller, circles, onPreview }: {
  controller: HangoutEditorController;
  circles: Circle[];
  onPreview: (photo: Photo) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  if (controller.state.mode !== 'view') return null;
  const { hangout, photos } = controller.state.entry;
  const circle = circles.find((c) => c.id === hangout.circleId);
  const color = circle?.color ?? colors.muted;
  const cover = photos[0];
  const disabled = controller.working !== null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.cover, { backgroundColor: circleTint(color, colors.surfaceAlt) }]}>
          {cover ? <PhotoImage photo={cover} contentFit="cover" style={StyleSheet.absoluteFill} /> : (
            <Ionicons name="images-outline" size={48} color={color} />
          )}
        </View>
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={[styles.badge, { backgroundColor: circleTint(color, colors.surfaceAlt) }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.badgeText}>{circle?.name ?? 'Circle'}</Text>
          </View>
          <Text style={styles.title}>{hangout.title}</Text>
          <Text style={styles.meta}>{hangoutDate(hangout.date, true)}</Text>
          {hangout.note ? <Text style={styles.diary}>{hangout.note}</Text> : null}
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
              {photos.map((photo, index) => (
                <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel={`View photo ${index + 1}`}
                  onPress={() => onPreview(photo)}>
                  <PhotoImage photo={photo} thumbnail contentFit="cover" style={styles.thumbnail} />
                </Pressable>
              ))}
            </ScrollView>
          )}
          {!!controller.error && <Text accessibilityLiveRegion="polite" style={styles.error}>{controller.error}</Text>}
          {disabled && <Text style={styles.meta}>Deleting…</Text>}
        </View>
      </ScrollView>
      {menuOpen && <Pressable accessibilityLabel="Close hangout menu" onPress={() => setMenuOpen(false)} style={StyleSheet.absoluteFill} />}
      <View style={[styles.toolbar, { top: insets.top + 12 }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Close hangout" onPress={controller.close} disabled={disabled} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.menuContainer}>
          <Pressable accessibilityRole="button" accessibilityLabel="Hangout options" accessibilityState={{ expanded: menuOpen, disabled }}
            disabled={disabled} onPress={() => setMenuOpen(!menuOpen)} style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
          </Pressable>
          {menuOpen && (
            <View style={styles.menu}>
              <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => { setMenuOpen(false); controller.edit(); }}>
                <Ionicons name="create-outline" size={18} color={colors.text} /><Text style={styles.menuText}>Edit</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => { setMenuOpen(false); controller.confirmDelete(); }}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} /><Text style={[styles.menuText, { color: colors.danger }]}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  cover: { height: 350, alignItems: 'center', justifyContent: 'center' },
  toolbar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.floating, alignItems: 'center', justifyContent: 'center' },
  menuContainer: { alignItems: 'flex-end' },
  menu: { position: 'absolute', top: 52, right: 0, width: 156, borderRadius: 16, padding: 6, backgroundColor: colors.surface, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 44 },
  menuText: { color: colors.text, fontSize: 15 },
  card: { flex: 1, marginTop: -28, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.surface, padding: 24 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { color: colors.secondary, fontSize: 12, fontWeight: '600' },
  title: { fontFamily: hangoutSerif, fontSize: 30, lineHeight: 38, color: colors.text, marginTop: 18 },
  meta: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginTop: 12, lineHeight: 17 },
  diary: { fontFamily: hangoutSerif, fontSize: 18, lineHeight: 29, color: colors.secondary, marginTop: 24 },
  photos: { gap: 10, paddingTop: 26, paddingBottom: 10 },
  thumbnail: { width: 76, height: 94, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  error: { color: colors.danger, marginTop: 20 },
});
