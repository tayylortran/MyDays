import { Circle } from '@/src/data/types';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

type EditCircleModalProps = {
  editingCircle: Circle | null;
  creatingCircle: boolean;
  newCircleName: string;
  circleColor: string;
  onClose: () => void;
  onChangeNewCircleName: (value: string) => void;
  onChangeCircleColor: (value: string) => void;
  onSaveCircle: () => void;
};

const CIRCLE_COLORS = ['#E8674C', '#E0A73E', '#4C86E8', '#7B61C9', '#3FA372', '#D65B9A'];

export function EditCircleModal({
  editingCircle,
  creatingCircle,
  newCircleName,
  circleColor,
  onClose,
  onChangeNewCircleName,
  onChangeCircleColor,
  onSaveCircle,
}: EditCircleModalProps) {
  const open = creatingCircle || editingCircle !== null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 34,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600' }}>
              {creatingCircle ? 'New circle' : 'Edit circle'}
            </Text>

            <TextInput
              autoFocus
              placeholder="circle name"
              value={newCircleName}
              onChangeText={onChangeNewCircleName}
              onSubmitEditing={onSaveCircle}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {CIRCLE_COLORS.map((color) => {
                const selected = color === circleColor;
                return (
                  <Pressable
                    key={color}
                    accessibilityLabel={`Choose ${color} circle color`}
                    accessibilityRole="button"
                    onPress={() => onChangeCircleColor(color)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: color,
                      borderWidth: selected ? 3 : 0,
                      borderColor: '#222',
                    }}
                  />
                );
              })}
            </View>

            {!creatingCircle && editingCircle && (
              <Text style={{ color: '#666' }}>Changes apply to existing hangouts in this circle.</Text>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: '#666' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onSaveCircle}
                style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#333' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>
                  {creatingCircle ? 'Add' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
