import "../global.css"
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { View, ActivityIndicator } from "react-native";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // useEffect(() => {
  //   if (!isMounted || loading) return;

  //   const inTabs = segments[0] === '(tabs)';
  //   if (!inTabs) {
  //     router.replace('/(tabs)');
  //   }
  // }, [isMounted, loading, segments[0]]);

  useEffect(() => {
    // 1. Wait until everything is ready
    if (!isMounted || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // 2. Navigation Guard
    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to tabs if authenticated but trying to access auth screens
      router.replace('/(tabs)');
    }
  }, [user, segments[0], loading, isMounted]);

  // 3. Prevent rendering the Stack until we know where to send the user
  if (!isMounted || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0f19' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}