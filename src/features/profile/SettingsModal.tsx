import SignOutButton from '@/src/features/auth/SignOutButton';
import { Modal, Pressable, Text } from 'react-native';

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
        onPress={onClose}
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
          <Text style={{ fontSize: 16, fontWeight: '600' }}>Settings</Text>
          {visible && <SignOutButton />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
