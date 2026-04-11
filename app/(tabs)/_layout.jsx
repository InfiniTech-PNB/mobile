import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Home, Radar, History, BarChart3, Menu, Sun, Moon, ShieldCheck } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function TabLayout() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerTitle: () => (
          <View className="flex-row items-center space-x-2">
            <View className="bg-black dark:bg-white p-1 rounded">
              <ShieldCheck size={16} color={isDark ? "black" : "white"} />
            </View>
            <Text className="font-black text-lg tracking-tighter dark:text-white">  KAVACHAI</Text>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity onPress={toggleColorScheme} className="mr-5 p-2 rounded-full bg-gray-100 dark:bg-slate-800">
            {isDark ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#1e293b" />}
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: isDark ? '#020617' : '#ffffff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#1e293b' : '#f1f5f9',
        },
        tabBarStyle: {
          backgroundColor: isDark ? '#020617' : '#ffffff',
          borderTopColor: isDark ? '#1e293b' : '#f1f5f9',
          height: 65,
        },
        tabBarActiveTintColor: isDark ? '#ffffff' : '#000000',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'HOME', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="scan" options={{ title: 'SCAN', tabBarIcon: ({ color }) => <Radar size={22} color={color} /> }} />
      <Tabs.Screen name="history" options={{ title: 'HISTORY', tabBarIcon: ({ color }) => <History size={22} color={color} /> }} />
      <Tabs.Screen name="reporting" options={{ title: 'REPORTS', tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: 'MORE', tabBarIcon: ({ color }) => <Menu size={22} color={color} /> }} />
      {/* ✅ HIDE RESULTS FROM BOTTOM TAB BAR */}
      <Tabs.Screen 
        name="results" 
        options={{ 
          href: null, // This is the magic line that hides it
          headerShown: true, 
          headerTitle: "SCAN ANALYSIS" 
        }} 
      />
      <Tabs.Screen 
        name="inventory" 
        options={{ 
          href: null, // This is the magic line that hides it
          headerShown: true, 
          headerTitle: "Asset Inventory" 
        }} 
      />
      <Tabs.Screen 
        name="cbom" 
        options={{ 
          href: null, // This is the magic line that hides it
          headerShown: true, 
          headerTitle: "CBOM" 
        }} 
      />
    </Tabs>
  );
}