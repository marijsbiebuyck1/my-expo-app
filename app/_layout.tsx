import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Layout() {
  const [fontsLoaded] = useFonts({ Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold });

  if (!fontsLoaded) {
    // Show a small loading indicator while fonts are loading
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    // Start with the login screen so the bottom tab bar isn't visible on login
    <Stack initialRouteName="login">
      <Stack.Screen name="login" options={{ headerShown: false }} />
      {/* Hide header for explicit register route to ensure no title bar appears */}
      <Stack.Screen name="register-owner" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
