import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../../components/themed-text";

export default function ChatListScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <View style={styles.container}>
        <ThemedText type="title">Chat</ThemedText>
        <ThemedText>Hier kun je een lijst van chats bouwen.</ThemedText>
        <Pressable
          onPress={() => router.push("/chat/details")}
          style={({ pressed }) => [
            { marginTop: 12, padding: 10, borderRadius: 6 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={{ color: "blue" }}>Open chat details</Text>
        </Pressable>
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
  title: "Chat",
  tabBarLabel: "Chat",
};
