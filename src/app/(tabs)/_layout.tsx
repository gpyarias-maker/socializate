import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

const Icono = Ionicons as any;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0D0D15', borderTopColor: '#2A2A4A', height: 60 },
        tabBarActiveTintColor: '#00F0FF',
        tabBarInactiveTintColor: '#7E7E9A',
      }}
    >
      <Tabs.Screen
        name="comunidades"
        options={{
          title: 'Hobbies',
          tabBarIcon: ({ color, size }: any) => <Icono name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color, size }: any) => <Icono name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }: any) => <Icono name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cuenta"
        options={{
          title: 'Cuenta',
          tabBarIcon: ({ color, size }: any) => <Icono name="person-circle" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}