import { useRouter } from "expo-router";
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
import { api } from "../../../_lib/api";

type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  avatar?: string | null;
};

const MOCK: Conversation[] = [
  {
    id: "u1",
    name: "Sofie Jans",
    lastMessage: "Hoi! Is de hond nog beschikbaar?",
    avatar: null,
  },
  {
    id: "u2",
    name: "Dierentehuis Utrecht",
    lastMessage: "We kunnen morgen rond 15:00",
    avatar: null,
  },
  {
    id: "u3",
    name: "Peter",
    lastMessage: "Dankjewel voor je bericht!",
    avatar: null,
  },
];

export default function ChatListScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(MOCK);
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
              setConversations(list);
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
    return () => {
      mounted = false;
    };
  }, []);

  function openConversation(id: string) {
    // navigate to dynamic route /users/(tabs)/chat/[profileId]
    // use pathname + params to satisfy router typing
    router.push({
      pathname: "/users/(tabs)/chat/[profileId]",
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
          <ThemedText style={styles.preview}>{item.lastMessage}</ThemedText>
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
