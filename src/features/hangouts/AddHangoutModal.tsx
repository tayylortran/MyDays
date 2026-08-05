import { Circle } from '@/src/data/types';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

type AddHangoutModalProps = {
  openDate: string | null;
  title: string;
  note: string;
  pickedCircle: string | null;
  addingCircle: boolean;
  newCircleName: string;
  circles: Circle[];
  onClose: () => void;
  onChangeTitle: (value: string) => void;
  onChangeNote: (value: string) => void;
  onPickCircle: (id: string) => void;
  onStartAddCircle: () => void;
  onChangeNewCircleName: (value: string) => void;
  onCreateCircle: () => void;
  onSubmit: () => void;
};

export function AddHangoutModal({
  openDate,
  title,
  note,
  pickedCircle,
  addingCircle,
  newCircleName,
  circles,
  onClose,
  onChangeTitle,
  onChangeNote,
  onPickCircle,
  onStartAddCircle,
  onChangeNewCircleName,
  onCreateCircle,
  onSubmit,
}: AddHangoutModalProps) {
  return (
    <Modal visible={openDate !== null} transparent animationType="slide" onRequestClose={onClose}>
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
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600' }}>
              New hangout · {openDate}
            </Text>

            <TextInput
              autoFocus
              placeholder="what did you do?"
              value={title}
              onChangeText={onChangeTitle}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
              }}
            />

            <TextInput
              placeholder="who was there / notes (optional)"
              value={note}
              onChangeText={onChangeNote}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
              }}
            />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {circles.map((c) => {
                const on = pickedCircle === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => onPickCircle(c.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: c.color,
                      backgroundColor: on ? c.color : 'transparent',
                    }}
                  >
                    <Text style={{ color: on ? '#fff' : '#333', fontSize: 13 }}>{c.name}</Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={onStartAddCircle}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: '#bbb',
                  borderStyle: 'dashed',
                }}
              >
                <Text style={{ color: '#777', fontSize: 13 }}>+ circle</Text>
              </Pressable>
            </View>

            {addingCircle && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  autoFocus
                  placeholder="circle name"
                  value={newCircleName}
                  onChangeText={onChangeNewCircleName}
                  onSubmitEditing={onCreateCircle}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 14,
                  }}
                />
                <Pressable
                  onPress={onCreateCircle}
                  style={{
                    paddingHorizontal: 14,
                    justifyContent: 'center',
                    borderRadius: 10,
                    backgroundColor: '#333',
                  }}
                >
                  <Text style={{ color: '#fff' }}>Save</Text>
                </Pressable>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ color: '#666' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onSubmit}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#333',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}