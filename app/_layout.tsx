import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from "@expo-google-fonts/montserrat";
import { Stack } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {!fontsLoaded ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator />
        </View>
      ) : (
        // Don't force an initial route here; let the router preserve the current route on reload.
        // Disable the header globally for this Stack; individual screens can opt in if needed.
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          {/* Hide header for explicit register route to ensure no title bar appears */}
          <Stack.Screen name="register-owner" />
          {/* Explicitly include the users and admin tab groups that exist in this repo */}
          <Stack.Screen name="users/(tabs)" />
          <Stack.Screen name="admin/(tabs)" />
        </Stack>
      )}
    </GestureHandlerRootView>
  );
}
