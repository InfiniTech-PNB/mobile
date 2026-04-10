import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ShieldAlert, FileSearch, Database, ChevronRight, UserCircle, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext'; // Import useAuth

export default function MoreScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Terminate Session",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: async () => await logout() }
      ]
    );
  };

  const menuItems = [
    { title: 'SCAN RESULTS', icon: <ShieldAlert size={20} color="#ef4444" />, route: '/results' },
    { title: 'CBOM HISTORY', icon: <FileSearch size={20} color="#3b82f6" />, route: '/cbom' },
    { title: 'ASSET INVENTORY', icon: <Database size={20} color="#8b5cf6" />, route: '/inventory' },
  ];

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-950">
      <View className="p-6">
        <Text className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[3px] mb-6">
          System Resources
        </Text>

        <View className="space-y-3">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(item.route)}
              className="flex-row items-center mb-5 justify-between p-5 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800"
            >
              <View className="flex-row items-center">
                <View className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                  {item.icon}
                </View>
                <Text className="ml-4 font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  {item.title}
                </Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        <View className="mt-12">
          <Text className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[3px] mb-6">
            Account Security
          </Text>
          <TouchableOpacity onPress={handleLogout} className="flex-row items-center p-5 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30">
            <LogOut size={20} color="#ef4444" />
            <Text className="ml-4 font-bold text-red-600 dark:text-red-400">TERMINATE SESSION</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}