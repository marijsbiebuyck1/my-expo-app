import { Stack } from "expo-router";

export default function AnimalDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="chats" />
    </Stack>
  );
}
