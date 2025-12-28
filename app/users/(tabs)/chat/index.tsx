import { useRouter } from "expo-router";
// SecureStore usage removed - prefer provided ids from the conversation list
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import { getLocalConversations, subscribeLocalConversations } from "../../../../lib/localConversations";
import { api } from "../../../_lib/api";

type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  avatar?: string | null;
};

export default function ChatListScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // Try a few likely endpoints; fall back to MOCK
        const tryPaths = [
          "/conversations",
          "/messages/conversations",
          "/messages",
        ];

        for (const p of tryPaths) {
          try {
            const resp = await api.get(p);
            if (!mounted) return;
            if (!resp.ok) continue;
            const json = await resp.json().catch(() => null);
            if (!json) continue;

            // Normalize into Conversation[]
            const list: Conversation[] = (
              Array.isArray(json) ? json : json.items || []
            )
              .map((it: any) => ({
                id:
                  it.id ||
                  it._id ||
                  it.conversationId ||
                  String(it.to || it.with || it.userId || Math.random()),
                name:
                  it.name ||
                  it.title ||
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
              const local = getLocalConversations();
              const localAsConv: Conversation[] = local.map((l) => ({
                id: l.id,
                name: l.name,
                lastMessage: l.lastMessage || "",
                avatar: l.avatar ?? null,
              }));
              const merged = [
                ...localAsConv,
                ...list.filter((l) => !localAsConv.some((x) => x.id === l.id)),
              ];
              setConversations(merged);
              return;
            }
          } catch {
            // try next
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    // subscribe to local optimistic conversations so the list updates immediately
    const unsub = subscribeLocalConversations((items) => {
      setConversations((prev) => {
        // convert items to Conversation[] and keep fetched items that aren't in local
        const localAsConv: Conversation[] = items.map((l) => ({
          id: l.id,
          name: l.name,
          lastMessage: l.lastMessage || "",
          avatar: l.avatar ?? null,
        }));
        const fetched = prev.filter((p) => !localAsConv.some((i) => i.id === p.id));
        return [...localAsConv, ...fetched];
      });
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  function openConversation(id: string) {
    // Navigate to dynamic route /users/[profileId] using the id provided by the list.
    router.push({
      pathname: "/users/[profileId]",
      params: { profileId: id },
    } as any);
  }

  function renderItem({ item }: ListRenderItemInfo<Conversation>) {
    return (
      <Pressable
        onPress={() => openConversation(item.id)}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <View style={styles.meta}>
          <ThemedText type="subtitle">{item.name}</ThemedText>
          <ThemedText style={styles.preview} numberOfLines={1} ellipsizeMode="tail">
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
          Chats
        </ThemedText>

        {loading ? (
          <View style={{ padding: 16 }}>
            <ThemedText>Bezig met laden...</ThemedText>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ padding: 16 }}
          />
        )}
        {/* Could show a loading indicator here if desired */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFCF5",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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

export const options = {
  title: "Chat",
  tabBarLabel: "Chat",
};
