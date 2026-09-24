import { useTheme } from '@/src/theme/ThemeProvider';
import { Text, TextInput } from '@/src/theme/primitives';
import { Circle } from '@/src/data/types';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useState } from 'react';
import { CircleColorPicker, ColorWheelSwatch } from './CircleColorPicker';

type EditCircleModalProps = {
  editingCircle: Circle | null;
  creatingCircle: boolean;
  newCircleName: string;
  circleColor: string;
  circles: Circle[];
  deletingCircle: boolean;
  circleHangoutCount: number;
  deleteDestinationId: string | null;
  onClose: () => void;
  onChangeNewCircleName: (value: string) => void;
  onChangeCircleColor: (value: string) => void;
  onSaveCircle: () => void;
  onStartDelete: () => void;
  onCancelDelete: () => void;
  onChangeDeleteDestination: (id: string) => void;
  onDelete: () => void;
};

const CIRCLE_COLORS = ['#E8674C', '#E0A73E', '#4C86E8', '#7B61C9', '#3FA372', '#D65B9A'];

export function EditCircleModal({
  editingCircle,
  creatingCircle,
  newCircleName,
  circleColor,
  circles,
  deletingCircle,
  circleHangoutCount,
  deleteDestinationId,
  onClose: onDismiss,
  onChangeNewCircleName,
  onChangeCircleColor,
  onSaveCircle,
  onStartDelete,
  onCancelDelete,
  onChangeDeleteDestination,
  onDelete,
}: EditCircleModalProps) {
  const { colors } = useTheme();
  const [customOpen, setCustomOpen] = useState(false);
  const [colorDragging, setColorDragging] = useState(false);
  const closePicker = () => { setColorDragging(false); setCustomOpen(false); };
  const onClose = () => { closePicker(); onDismiss(); };
  const open = creatingCircle || editingCircle !== null;
  const customSelected = !CIRCLE_COLORS.includes(circleColor.toUpperCase());

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => customOpen ? closePicker() : onClose()}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 34,
              maxHeight: '90%',
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={!colorDragging}
              bounces={false} overScrollMode="never" contentContainerStyle={{ gap: 12 }}>
            {customOpen ? (
              <CircleColorPicker color={circleColor} onCancel={closePicker} onInteractionChange={setColorDragging}
                onSelect={(color) => { onChangeCircleColor(color); closePicker(); }} />
            ) : <>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>
              {creatingCircle ? 'New circle' : 'Edit circle'}
            </Text>

            {deletingCircle ? (
              <>
                {circleHangoutCount > 0 ? (
                  <>
                    <Text style={{ color: colors.muted }}>
                      Move {circleHangoutCount} {circleHangoutCount === 1 ? 'hangout' : 'hangouts'} to:
                    </Text>
                    {circles
                      .filter((circle) => circle.id !== editingCircle?.id)
                      .map((circle) => {
                        const selected = circle.id === deleteDestinationId;
                        return (
                          <Pressable
                            key={circle.id}
                            onPress={() => onChangeDeleteDestination(circle.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              borderWidth: 1.5,
                              borderColor: selected ? circle.color : colors.border,
                              borderRadius: 10,
                              padding: 12,
                            }}
                          >
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: circle.color }} />
                            <Text style={{ color: colors.text }}>{circle.name}</Text>
                          </Pressable>
                        );
                      })}
                    {circles.length === 1 && (
                      <Text style={{ color: colors.danger }}>Create another circle before deleting this one.</Text>
                    )}
                  </>
                ) : (
                  <Text style={{ color: colors.muted }}>This circle has no hangouts to move.</Text>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <Pressable onPress={onCancelDelete} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Text style={{ color: colors.muted }}>Back</Text>
                  </Pressable>
                  <Pressable
                    disabled={circleHangoutCount > 0 && !deleteDestinationId}
                    onPress={onDelete}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: circleHangoutCount > 0 && !deleteDestinationId ? colors.pressed : colors.dangerFill,
                    }}
                  >
                    <Text style={{ color: colors.onColor, fontWeight: '600' }}>
                      {circleHangoutCount > 0 ? 'Move & delete' : 'Delete'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <TextInput
                  placeholder="circle name"
                  value={newCircleName}
                  onChangeText={onChangeNewCircleName}
                  onSubmitEditing={onSaveCircle}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 15,
                  }}
                />

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CIRCLE_COLORS.map((color) => {
                    const selected = color.toUpperCase() === circleColor.toUpperCase();
                    return (
                      <Pressable
                        key={color}
                        accessibilityLabel={`Choose ${color} circle color`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => onChangeCircleColor(color)}
                        style={{
                          flex: 1,
                          maxWidth: 40,
                          aspectRatio: 1,
                          borderRadius: 20,
                          backgroundColor: color,
                          borderWidth: selected ? 3 : 0,
                          borderColor: colors.border,
                        }}
                      />
                    );
                  })}
                  <Pressable accessibilityRole="button" accessibilityLabel="Choose a custom circle color"
                    accessibilityState={{ selected: customSelected }}
                    onPress={() => { Keyboard.dismiss(); setCustomOpen(true); }}
                    style={{ flex: 1, maxWidth: 40, aspectRatio: 1, borderRadius: 20, overflow: 'hidden',
                      borderWidth: customSelected ? 3 : 0, borderColor: colors.border }}>
                    <ColorWheelSwatch />
                  </Pressable>
                </View>

                {!creatingCircle && (
                  <Pressable onPress={onStartDelete} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
                    <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete circle</Text>
                  </Pressable>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Text style={{ color: colors.muted }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={onSaveCircle}
                    style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.action }}
                  >
                    <Text style={{ color: colors.onAction, fontWeight: '600' }}>
                      {creatingCircle ? 'Add' : 'Save'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
            </>}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
