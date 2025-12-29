import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../../../components/logo-header";
import { ThemedText } from "../../../../../../components/themed-text";
import { api } from "../../../../../_lib/api";

type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  avatar?: string | null;
};

export default function AnimalChatsScreen() {
  const params = useLocalSearchParams();
  const animalId = String(params.animalId ?? "");
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const tryPaths = [
          `/conversations?to=${encodeURIComponent(animalId)}`,
          `/conversations?profileId=${encodeURIComponent(animalId)}`,
          `/messages/conversations?to=${encodeURIComponent(animalId)}`,
          `/messages/conversations?profileId=${encodeURIComponent(animalId)}`,
          `/messages?to=${encodeURIComponent(animalId)}`,
          `/messages?profileId=${encodeURIComponent(animalId)}`,
        ];

        for (const p of tryPaths) {
          try {
            const resp = await api.get(p, true);
            if (!mounted) return;
            if (!resp.ok) continue;
            const json = await resp.json().catch(() => null);
            if (!json) continue;

            const list: Conversation[] = (
              Array.isArray(json) ? json : json.items || []
            )
              .map((it: any) => ({
                id:
                  it.id ||
                  it._id ||
                  it.userId ||
                  it.from ||
                  it.with ||
                  String(Math.random()),
                name:
                  it.name ||
                  it.displayName ||
                  it.withName ||
                  it.fromName ||
                  "Onbekend",
                lastMessage:
                  it.lastMessage ||
                  it.preview ||
                  it.message ||
                  (it.text && String(it.text).slice(0, 80)) ||
                  "",
                avatar: it.avatar || it.photo || null,
              }))
              .filter(Boolean);

            if (list.length > 0) {
              setConversations(list);
              return;
            }
          } catch (err) {
            console.warn(err);
            // try next
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (animalId) load();
    return () => {
      mounted = false;
    };
  }, [animalId]);

  function openConversation(userId: string) {
    // navigate to the user profile chat (admin can view) — reuse existing user chat route
    router.push({
      pathname: "/users/[profileId]",
      params: { profileId: userId },
    } as any);
  }

  function renderItem({ item }: { item: Conversation }) {
    return (
      <Pressable onPress={() => openConversation(item.id)} style={styles.row}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <View style={styles.meta}>
          <ThemedText type="subtitle">{item.name}</ThemedText>
          <ThemedText
            style={styles.preview}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.lastMessage}
          </ThemedText>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <LogoHeader />
      <View style={styles.container}>
        <ThemedText type="title" style={{ marginBottom: 12 }}>
          Chats voor dier
        </ThemedText>

        {loading ? (
          <View style={{ padding: 16 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => renderItem({ item })}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={() => (
              <View style={{ padding: 16 }}>
                <ThemedText>Geen gesprekken gevonden voor dit dier.</ThemedText>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFCF5", padding: 30 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 12, marginRight: 12 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  meta: { flex: 1 },
  preview: { color: "#666", marginTop: 4 },
});
