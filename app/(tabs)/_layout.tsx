import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { PicturesPanelProvider } from '@/src/features/pictures/PicturesPanel';


export default function TabsLayout() {
  return (
    <PicturesPanelProvider>
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#333' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
        <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
    </PicturesPanelProvider>
  );
}
