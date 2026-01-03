import { Stack } from "expo-router";

export default function AnimalChatsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[conversationId]" />
    </Stack>
  );
}
