import { Circle } from '@/src/data/types';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

type EditCircleModalProps = {
  editingCircle: Circle | null;
  creatingCircle: boolean;
  newCircleName: string;
  onClose: () => void;
  onChangeNewCircleName: (value: string) => void;
  onCreateCircle: () => void;
};

export function EditCircleModal({
  editingCircle,
  creatingCircle,
  newCircleName,
  onClose,
  onChangeNewCircleName,
  onCreateCircle,
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

            {creatingCircle && (
              <TextInput
                autoFocus
                placeholder="circle name"
                value={newCircleName}
                onChangeText={onChangeNewCircleName}
                onSubmitEditing={onCreateCircle}
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 15,
                }}
              />
            )}

            {!creatingCircle && editingCircle && (
              <Text style={{ color: '#666' }}>{editingCircle.name}</Text>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: '#666' }}>Cancel</Text>
              </Pressable>
              {creatingCircle && (
                <Pressable
                  onPress={onCreateCircle}
                  style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#333' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
