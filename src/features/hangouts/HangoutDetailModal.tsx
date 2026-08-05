import { Circle, Hangout, Photo } from '@/src/data/types';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

const MAX_PHOTOS = 5;

type HangoutDetailModalProps = {
  openHangout: Hangout | null;
  editTitle: string;
  editNote: string;
  editCircle: string | null;
  circles: Circle[];
  photos: Photo[];
  onClose: () => void;
  onChangeTitle: (value: string) => void;
  onChangeNote: (value: string) => void;
  onPickCircle: (id: string) => void;
  onPickPhoto: () => void;
  onRemovePhoto: (id: string) => void;
  onRemoveHangout: () => void;
  onSave: () => void;
};

export function HangoutDetailModal({
  openHangout,
  editTitle,
  editNote,
  editCircle,
  circles,
  photos,
  onClose,
  onChangeTitle,
  onChangeNote,
  onPickCircle,
  onPickPhoto,
  onRemovePhoto,
  onRemoveHangout,
  onSave,
}: HangoutDetailModalProps) {
  return (
    <Modal visible={openHangout !== null} transparent animationType="slide" onRequestClose={onClose}>
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
            {openHangout && (
              <>
                <Text style={{ fontSize: 12, color: '#888' }}>{openHangout.date}</Text>

                <TextInput
                  placeholder="what did you do?"
                  value={editTitle}
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
                  placeholder="who was there / notes"
                  value={editNote}
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

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {circles.map((c) => {
                    const on = editCircle === c.id;
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
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {photos.map((p) => (
                    <Pressable key={p.id} onLongPress={() => onRemovePhoto(p.id)}>
                      <Image source={{ uri: p.uri }} style={{ width: 78, height: 78, borderRadius: 8 }} />
                    </Pressable>
                  ))}

                  {photos.length < MAX_PHOTOS && (
                    <Pressable
                      onPress={onPickPhoto}
                      style={{
                        width: 78,
                        height: 78,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        borderColor: '#ccc',
                        borderStyle: 'dashed',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 28, color: '#bbb' }}>+</Text>
                    </Pressable>
                  )}
                </View>

                <Text style={{ fontSize: 11, color: '#bbb' }}>
                  {photos.length}/{MAX_PHOTOS} photos - long-press to remove
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Pressable onPress={onRemoveHangout} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Text style={{ color: '#c0392b' }}>Delete</Text>
                  </Pressable>

                  <View style={{ flex: 1 }} />

                  <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Text style={{ color: '#666' }}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={onSave}
                    style={{
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: '#333',
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
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
