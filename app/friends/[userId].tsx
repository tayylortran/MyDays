import { FriendProfileScreen } from '@/src/features/friends/FriendProfileScreen';
import { useLocalSearchParams } from 'expo-router';

export default function FriendProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <FriendProfileScreen key={userId} userId={userId ?? ''} />;
}
