import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../components/logo-header";
import { ThemedText } from "../../../components/themed-text";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <LogoHeader />
      <View style={styles.container}>
        <ThemedText type="title">Settings</ThemedText>
        <ThemedText>Hier kun je instellingen bouwen.</ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});

export const options = {
  title: "Settings",
  tabBarLabel: "Settings",
};
