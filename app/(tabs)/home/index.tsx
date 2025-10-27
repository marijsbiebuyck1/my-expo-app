import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DisplayImage } from "../../../components/display-image";
import LogoHeader from "../../../components/logo-header";
import { ThemedText } from "../../../components/themed-text";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <LogoHeader />
      <View style={styles.container}>
        {/* Toon icon.png */}
        <DisplayImage
          source={require("../../../assets/images/icon.png")}
          width={100}
          height={100}
          style={{ marginBottom: 20 }}
        />

        <ThemedText type="title">Hallo Marijs 🎉</ThemedText>
        <ThemedText type="subtitle">Dit is een subtitel</ThemedText>
        <ThemedText
          style={{ fontFamily: "Montserrat_400Regular", fontSize: 16 }}
        >
          Dit is een oefening met Montserrat Regular
        </ThemedText>

        {/* Berichten zijn uitgezet per verzoek — alleen de statische content tonen */}
      </View>
    </SafeAreaView>
  );
}

export const options = {
  title: "Home",
  tabBarLabel: "Home",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  msgCard: {
    width: "92%",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  msgSender: {
    fontWeight: "700",
    marginBottom: 4,
  },
  msgText: {
    fontSize: 15,
    marginBottom: 6,
  },
  msgMeta: {
    fontSize: 12,
    color: "#666",
  },
});
