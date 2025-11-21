import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import { Stack } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  if (!fontsLoaded) {
    // Show a small loading indicator while fonts are loading
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    // Don't force an initial route here; let the router preserve the current route on reload.
    // Disable the header globally for this Stack; individual screens can opt in if needed.
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      {/* Hide header for explicit register route to ensure no title bar appears */}
      <Stack.Screen name="register-owner" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
