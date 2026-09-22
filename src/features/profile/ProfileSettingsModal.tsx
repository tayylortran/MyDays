import { useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type ProfileSettingsModalProps = {
  visible: boolean;
  username: string;
  email: string | null;
  photoUri: string | null;
  onClose: () => void;
  onChangeUsername: (value: string) => void;
  onPickPhoto: () => void;
  onTakePhoto: () => void;
  onRemovePhoto: () => void;
  onSave: () => void;
};

export function ProfileSettingsModal({
  visible,
  username,
  email,
  photoUri,
  onClose,
  onChangeUsername,
  onPickPhoto,
  onTakePhoto,
  onRemovePhoto,
  onSave,
}: ProfileSettingsModalProps) {
  const [editingPicture, setEditingPicture] = useState(false);
  const close = () => {
    setEditingPicture(false);
    onClose();
  };
  const choosePictureAction = (action: () => void) => {
    setEditingPicture(false);
    action();
  };
  return (
    <Modal visible={visible} transparent animationType="slide"
      onRequestClose={() => editingPicture ? setEditingPicture(false) : close()}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={close}>
        <KeyboardAvoidingView
          accessibilityElementsHidden={editingPicture}
          importantForAccessibility={editingPicture ? 'no-hide-descendants' : 'auto'}
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
              <Pressable
                accessibilityRole="button"
                onPress={() => { Keyboard.dismiss(); setEditingPicture(true); }}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}
              >
                <Text style={{ color: '#333', fontWeight: '600', textDecorationLine: 'underline' }}>Edit picture</Text>
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600' }}>Username</Text>
            <TextInput
              placeholder="Username"
              accessibilityLabel="Username"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
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

            <Text style={{ color: '#666', fontSize: 12 }}>
              You can change your username twice in any 14-day period.
            </Text>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600' }}>Email</Text>
              <Text selectable style={{ color: '#666', fontSize: 15 }}>{email ?? 'No email available'}</Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Pressable onPress={close} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
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
        {editingPicture && (
          <Pressable
            onPress={() => setEditingPicture(false)}
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 24 }]}
          >
            <Pressable onPress={() => {}} accessibilityViewIsModal style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Edit picture</Text>
              <Pressable accessibilityRole="button" style={{ paddingVertical: 14 }} onPress={() => choosePictureAction(onPickPhoto)}>
                <Text style={{ fontSize: 16 }}>Upload photo</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={{ paddingVertical: 14 }} onPress={() => choosePictureAction(onTakePhoto)}>
                <Text style={{ fontSize: 16 }}>Take a picture</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: !photoUri }} disabled={!photoUri}
                style={{ paddingVertical: 14 }} onPress={() => choosePictureAction(onRemovePhoto)}>
                <Text style={{ fontSize: 16, color: photoUri ? '#a33' : '#aaa' }}>Delete photo</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={{ paddingVertical: 14 }} onPress={() => setEditingPicture(false)}>
                <Text style={{ fontSize: 16, color: '#666' }}>Cancel</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}
