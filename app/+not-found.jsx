import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
// Built-in Expo icons (Material Design)
import { MaterialIcons } from '@expo/vector-icons'; 

export default function NotFoundScreen() {
  return (
    <>
      {/* Keeping the Stack.Screen for header management */}
      <Stack.Screen options={{ title: 'Hmm...', headerShown: true }} />
      
      {/* Container: bg-gray-50 provides a professional, warm background (like your web dashboard) 
        rather than stark white, and we add extra padding.
      */}
      <View className="flex-1 items-center justify-center p-8 bg-gray-50">
        
        {/* 1. Large Feedback Icon (Centered in a subtle circle) */}
        <View className="w-24 h-24 bg-red-100/50 rounded-full items-center justify-center mb-10">
          <MaterialIcons name="portable-wifi-off" size={60} color="#dc2626" />
        </View>

        {/* 2. Error Message Hierarchy */}
        <Text className="text-4xl font-black text-gray-900 mb-2">
          Page Not Found
        </Text>
        
        <Text className="text-lg text-gray-600 text-center px-4 leading-relaxed">
          The asset or report you are trying to view might have been moved, deleted, or is temporarily unavailable.
        </Text>
        
        {/* 3. Re-designed Button (Not just text) 
          We make the whole Link area a styled 'Button'
        */}
        <Link href="/(tabs)" className="mt-14 w-full">
          <View className="bg-blue-600 p-4 rounded-xl items-center w-full">
            <Text className="text-white text-lg font-semibold tracking-tight">
              Return to Dashboard
            </Text>
          </View>
        </Link>
        
        {/* Subtle Branding at the bottom */}
        <Text className="absolute bottom-6 text-sm text-gray-400 font-medium">
          KavachAI Security Platform
        </Text>
      </View>
    </>
  );
}