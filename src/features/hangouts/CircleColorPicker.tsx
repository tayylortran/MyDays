import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { Text, TextInput } from '@/src/theme/primitives';
import { useTheme } from '@/src/theme/ThemeProvider';
import { clamp, hexToHsv, hsvToHex, wheelPosition, type HSV } from '@/src/lib/color';

const svgUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
const wedges = Array.from({ length: 360 }, (_, h) => {
  const a = h * Math.PI / 180, b = (h + 1.5) * Math.PI / 180;
  return `<path d="M128 128 L${128 + 128 * Math.cos(a)} ${128 + 128 * Math.sin(a)} A128 128 0 0 1 ${128 + 128 * Math.cos(b)} ${128 + 128 * Math.sin(b)} Z" fill="${hsvToHex({ h, s: 1, v: 1 })}"/>`;
}).join('');
const wheel = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><radialGradient id="s"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs>${wedges}<circle cx="128" cy="128" r="128" fill="url(#s)"/></svg>`);

export function ColorWheelSwatch() {
  return <Image source={{ uri: wheel }} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} pointerEvents="none" />;
}

type Props = {
  color: string;
  onSelect: (color: string) => void;
  onCancel: () => void;
  onInteractionChange: (active: boolean) => void;
};

export function CircleColorPicker({ color, onSelect, onCancel, onInteractionChange }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(240, width - 64);
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [hex, setHex] = useState(color.toUpperCase());
  const selected = hsvToHex(hsv);
  const valid = /^#[0-9a-f]{6}$/i.test(hex);
  const [trackWidth, setTrackWidth] = useState(size);
  const update = (next: HSV) => { setHsv(next); setHex(hsvToHex(next)); };
  const pick = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    update({ ...hsv, ...wheelPosition(locationX, locationY, size) });
  };
  const brightness = (event: GestureResponderEvent) => update({ ...hsv, v: clamp(event.nativeEvent.locationX / trackWidth) });
  const full = hsvToHex({ ...hsv, v: 1 });
  const gradient = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="28"><defs><linearGradient id="b"><stop stop-color="#000"/><stop offset="1" stop-color="${full}"/></linearGradient></defs><rect width="256" height="28" rx="14" fill="url(#b)"/></svg>`);
  const angle = hsv.h * Math.PI / 180;
  // A native ScrollView can intercept a drag even when responder termination is refused.
  // Lock it from touch-down until the gesture finishes, including interruptions.
  const dragHandlers = {
    onTouchStart: () => onInteractionChange(true),
    onTouchEnd: (event: GestureResponderEvent) => {
      if (event.nativeEvent.touches.length === 0) onInteractionChange(false);
    },
    onTouchCancel: () => onInteractionChange(false),
    onStartShouldSetResponderCapture: () => true,
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderRelease: () => onInteractionChange(false),
    onResponderTerminate: () => onInteractionChange(false),
  };

  return (
    <View style={{ gap: 16 }}>
      <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600' }}>Custom color</Text>
      <Text style={{ color: colors.muted }}>Drag on the wheel, then adjust the brightness.</Text>
      <View style={{ width: size, height: size, alignSelf: 'center' }}
        {...dragHandlers} onResponderGrant={pick} onResponderMove={pick}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={{ uri: wheel }} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
          <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: '#000', opacity: 1 - hsv.v }]} />
          <View style={{ position: 'absolute', left: size / 2 + Math.cos(angle) * hsv.s * size / 2 - 10,
            top: size / 2 + Math.sin(angle) * hsv.s * size / 2 - 10, width: 20, height: 20,
            borderRadius: 10, borderWidth: 3, borderColor: '#fff', backgroundColor: selected,
            shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 3 }} />
        </View>
      </View>
      <Text style={{ color: colors.muted }}>Brightness · {Math.round(hsv.v * 100)}%</Text>
      <View accessible accessibilityRole="adjustable" accessibilityLabel="Color brightness"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(hsv.v * 100) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => update({ ...hsv, v: clamp(hsv.v + (event.nativeEvent.actionName === 'increment' ? 0.05 : -0.05)) })}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        {...dragHandlers} onResponderGrant={brightness} onResponderMove={brightness}
        style={{ height: 44, justifyContent: 'center' }}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={{ uri: gradient }} contentFit="fill" style={{ height: 28, marginTop: 8, width: '100%' }} accessible={false} />
          <View style={{ position: 'absolute', left: clamp(hsv.v * trackWidth - 12, 0, trackWidth - 24), top: 10,
            height: 24, width: 24, borderRadius: 12, borderWidth: 3, borderColor: '#fff', backgroundColor: selected }} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: selected, borderColor: colors.border, borderWidth: 1 }} />
        <TextInput accessibilityLabel="Hex color" placeholder="#RRGGBB" value={hex} autoCapitalize="characters" autoCorrect={false} maxLength={7}
          onChangeText={(value) => {
            const next = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;
            setHex(next);
            if (/^#[0-9a-f]{6}$/i.test(next)) setHsv(hexToHsv(next));
          }} style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16 }} />
      </View>
      {!valid && <Text style={{ color: colors.danger }}>Enter six color digits, such as #7B61C9.</Text>}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={{ padding: 14 }}><Text>Cancel</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={!valid} accessibilityState={{ disabled: !valid }}
          onPress={() => onSelect(hex)} style={{ padding: 14, borderRadius: 10, backgroundColor: colors.action, opacity: valid ? 1 : 0.5 }}>
          <Text style={{ color: colors.onAction, fontWeight: '600' }}>Use color</Text>
        </Pressable>
      </View>
    </View>
  );
}
