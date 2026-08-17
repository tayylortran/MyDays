import { Circle } from '@/src/data/types';
import { Modal, Pressable, Text, View } from 'react-native';

type EditCircleModalProps = {
  editingCircle: Circle | null;
  creatingCircle: boolean;
  onClose: () => void;
};

export function EditCircleModal({
  editingCircle,
  creatingCircle,
  onClose,
}: EditCircleModalProps) {
  const open = creatingCircle || editingCircle !== null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 34,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600' }}>
            {creatingCircle ? 'New group' : 'Edit group'}
          </Text>

          {!creatingCircle && editingCircle && (
            <Text style={{ color: '#666' }}>{editingCircle.name}</Text>
          )}

          <Pressable onPress={onClose} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: '#333', fontWeight: '600' }}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
