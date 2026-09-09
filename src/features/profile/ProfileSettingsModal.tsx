import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';

type ProfileSettingsModalProps = {
  visible: boolean;
  username: string;
  photoUri: string | null;
  onClose: () => void;
  onChangeUsername: (value: string) => void;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
  onSave: () => void;
};

export function ProfileSettingsModal({
  visible,
  username,
  photoUri,
  onClose,
  onChangeUsername,
  onPickPhoto,
  onRemovePhoto,
  onSave,
}: ProfileSettingsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Profile settings</Text>

            <View style={{ alignItems: 'center' }}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: 96, height: 96, borderRadius: 48 }} />
              ) : (
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: '#ddd',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#999', fontSize: 12 }}>No photo</Text>
                </View>
              )}
            </View>

            <TextInput
              placeholder="Your name"
              value={username}
              onChangeText={onChangeUsername}
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 15,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={onPickPhoto}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#333',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Upload photo</Text>
              </Pressable>
              <Pressable
                onPress={onRemovePhoto}
                disabled={!photoUri}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: photoUri ? '#eee' : '#f5f5f5',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: photoUri ? '#333' : '#aaa', fontWeight: '600' }}>Delete photo</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
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
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
