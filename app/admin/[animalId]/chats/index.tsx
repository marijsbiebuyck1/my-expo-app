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
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import { api } from "../../../_lib/api";

type Conversation = {
  id: string;
  name: string;
  userId?: string | null;
  animalName?: string;
  lastMessage: string;
  avatar?: string | null;
  userAvatar?: string | null;
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
        const resp = await api.get(
          `/conversations?animalId=${encodeURIComponent(animalId)}`,
          true
        );
        if (!mounted) return;
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(text || `status ${resp.status}`);
        }
        const json = await resp.json().catch(() => []);
        if (!mounted) return;
        const listSource = Array.isArray(json) ? json : [];
        const mapped: Conversation[] = listSource.map((item: any) => ({
          id: String(item.id || item._id || Math.random()),
          name:
            item.userName ||
            item.name ||
            item.displayName ||
            "Onbekende gebruiker",
          userId: item.userId || null,
          animalName: item.animalName || undefined,
          lastMessage: item.lastMessage || "",
          userAvatar: item.userAvatar || null,
          avatar: item.userAvatar || item.avatar || null,
        }));
        setConversations(mapped);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (animalId) load();
    return () => {
      mounted = false;
    };
  }, [animalId]);

  function openConversation(conversation: Conversation) {
    router.push({
      pathname: "/admin/[animalId]/chats/[conversationId]",
      params: {
        animalId,
        conversationId: conversation.id,
        animalName: conversation.animalName || "",
        userName: conversation.name,
        avatar: conversation.userAvatar || conversation.avatar || "",
      },
    } as any);
  }

  function renderItem({ item }: { item: Conversation }) {
    return (
      <Pressable onPress={() => openConversation(item)} style={styles.row}>
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
