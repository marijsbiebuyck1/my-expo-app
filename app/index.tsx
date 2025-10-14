import { DisplayImage } from "@/components/display-image";
import { ThemedText } from "@/components/themed-text";
import useMessages from "@/data/messages";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { data, isLoading, isError } = useMessages();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <ThemedText>Er ging iets mis bij het laden van berichten.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Toon icon.png */}
        <DisplayImage
          source={require("../assets/images/icon.png")}
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

        {/* Berichten weergegeven vanaf API (onder bestaande tekst) */}
        <ThemedText type="subtitle" style={{ marginTop: 12 }}>
          Berichten:
        </ThemedText>
        {Array.isArray(data) && data.length > 0 ? (
          <ScrollView
            style={{ width: "100%", marginTop: 8 }}
            contentContainerStyle={{ alignItems: "center", gap: 8 }}
          >
            {data.map((msg: any, idx: number) => (
              <View key={msg._id ?? idx} style={styles.msgCard}>
                <ThemedText style={styles.msgSender}>
                  {msg.sender?.username ??
                    (msg.recipients && msg.recipients.length
                      ? "Group"
                      : "Unknown")}
                </ThemedText>
                <ThemedText style={styles.msgText}>
                  {msg.text ?? JSON.stringify(msg)}
                </ThemedText>
                <ThemedText style={styles.msgMeta}>
                  {msg.recipients && msg.recipients.length > 0
                    ? `To: ${msg.recipients
                        .map((r: any) => r.username)
                        .join(", ")}`
                    : "No recipients"}{" "}
                  •{" "}
                  {msg.createdAt
                    ? new Date(msg.createdAt).toLocaleString()
                    : ""}
                </ThemedText>
              </View>
            ))}
          </ScrollView>
        ) : (
          <ThemedText>Geen berichten gevonden.</ThemedText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center", // verticaal centreren
    alignItems: "center", // horizontaal centreren
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
