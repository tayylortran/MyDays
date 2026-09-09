import { Circle } from '@/src/data/types';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

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
  onClose,
  onChangeNewCircleName,
  onChangeCircleColor,
  onSaveCircle,
  onStartDelete,
  onCancelDelete,
  onChangeDeleteDestination,
  onDelete,
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

            {deletingCircle ? (
              <>
                {circleHangoutCount > 0 ? (
                  <>
                    <Text style={{ color: '#666' }}>
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
                              borderColor: selected ? circle.color : '#ddd',
                              borderRadius: 10,
                              padding: 12,
                            }}
                          >
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: circle.color }} />
                            <Text style={{ color: '#333' }}>{circle.name}</Text>
                          </Pressable>
                        );
                      })}
                    {circles.length === 1 && (
                      <Text style={{ color: '#B42318' }}>Create another circle before deleting this one.</Text>
                    )}
                  </>
                ) : (
                  <Text style={{ color: '#666' }}>This circle has no hangouts to move.</Text>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                  <Pressable onPress={onCancelDelete} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Text style={{ color: '#666' }}>Back</Text>
                  </Pressable>
                  <Pressable
                    disabled={circleHangoutCount > 0 && !deleteDestinationId}
                    onPress={onDelete}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: circleHangoutCount > 0 && !deleteDestinationId ? '#D8A6A1' : '#B42318',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>
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

                {!creatingCircle && (
                  <Pressable onPress={onStartDelete} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
                    <Text style={{ color: '#B42318', fontWeight: '600' }}>Delete circle</Text>
                  </Pressable>
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
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
