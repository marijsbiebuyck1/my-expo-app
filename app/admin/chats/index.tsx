import { Ionicons } from "@expo/vector-icons";
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
import LogoHeader from "../../../components/logo-header";
import { ThemedText } from "../../../components/themed-text";
import {
  getLocalConversations,
  subscribeLocalConversations,
} from "../../../lib/localConversations";
import { api } from "../../_lib/api";

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
        const mapped: Conversation[] = listSource.map((item: any) => {
          // prefer explicit nested user object
          const userObj = item.user || item.userInfo || item.userProfile || null;
          // fallback: if conversation includes a messages array, try to derive user from the first message
          const firstMsg = Array.isArray(item.messages) && item.messages.length ? item.messages[0] : null;
          const msgUser =
            firstMsg && (firstMsg.user || firstMsg.author || firstMsg.from)
              ? firstMsg.user || firstMsg.author || firstMsg.from
              : null;
          const userId =
            item.userId ||
            item.user_id ||
            (userObj && (userObj.id || userObj._id)) ||
            (msgUser && (msgUser.id || msgUser._id)) ||
            null;
          const userName =
            (userObj && (userObj.name || userObj.displayName || userObj.username)) ||
            (msgUser && (msgUser.name || msgUser.displayName || msgUser.username)) ||
            item.userName ||
            item.name ||
            item.displayName ||
            "Onbekende gebruiker";
          const userAvatar =
            (userObj && (userObj.photo || userObj.avatar || userObj.image)) ||
            (msgUser && (msgUser.photo || msgUser.avatar || msgUser.image)) ||
            item.userAvatar ||
            item.avatar ||
            null;
          return {
            id: String(item.id || item._id || Math.random()),
            name: userName,
            userId: userId,
            animalName: item.animalName || undefined,
            lastMessage: item.lastMessage || (firstMsg && (firstMsg.text || firstMsg.message)) || "",
            userAvatar: item.userAvatar || null,
            avatar: userAvatar,
          };
        });
        // merge with any optimistic local conversations (local has id=animalId)
        const local = getLocalConversations();
        const localMapped: Conversation[] = local
          .filter((l) => String(l.id) === animalId)
          .map((l) => ({
            id: l.id,
            name: l.name,
            userId: null,
            lastMessage: l.lastMessage || "",
            avatar: l.avatar ?? null,
          }));
        const merged = [...localMapped, ...mapped.filter((m) => !localMapped.some((x) => x.id === m.id))];
        setConversations(merged);

        // Try to enrich conversations with user profile data when possible
        (async () => {
          try {
            const toFetch = merged.filter((c) => c.userId && (!c.name || c.name === "Onbekende gebruiker"));
            await Promise.all(
              toFetch.map(async (conv) => {
                try {
                  const uid = String(conv.userId);
                  const res = await api.get(`/users/${encodeURIComponent(uid)}`, true);
                  if (!res.ok) return;
                  const data = await res.json().catch(() => null);
                  if (!data) return;
                  const displayName = data.name || data.displayName || data.username || null;
                  const avatar = data.photo || data.avatar || null;
                  if (displayName || avatar) {
                    setConversations((prev) =>
                      (prev || []).map((p) =>
                        p.id === conv.id ? { ...p, name: displayName || p.name, avatar: avatar || p.avatar } : p
                      )
                    );
                  }
                } catch {
                  // ignore per-conversation fetch errors
                }
              })
            );
          } catch {
            // ignore
          }
        })();
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (animalId) load();
    return () => {
      mounted = false;
    };
  }, [animalId]);

  useEffect(() => {
    // listen for optimistic local conversations and add them if they match this animal
    const unsub = subscribeLocalConversations((items) => {
      setConversations((prev) => {
        const localForThis = items
          .filter((l) => String(l.id) === animalId)
          .map((l) => ({ id: l.id, name: l.name, lastMessage: l.lastMessage || "", avatar: l.avatar ?? null }));
        // keep remote ones that are not duplicates
        const remoteKept = (prev || []).filter((p) => !localForThis.some((x) => x.id === p.id));
        return [...localForThis, ...remoteKept];
      });
    });
    return unsub;
  }, [animalId]);

  function openConversation(conversation: Conversation) {
    router.push({
      pathname: "/admin/animals/[animalId]/chats/[conversationId]",
      params: {
        animalId,
        conversationId: conversation.id,
        animalName: conversation.animalName || "",
        userName: conversation.name,
        avatar: conversation.userAvatar || conversation.avatar || "",
        userId: conversation.userId ?? null,
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
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push(("/admin/animals" as any))} style={styles.backBtn} accessibilityLabel="Terug naar animals">
            <Ionicons name="chevron-back" size={24} color="#2F2A28" />
          </Pressable>
          <ThemedText type="title" style={{ marginBottom: 12, marginLeft: 8 }}>
            Chats voor dier
          </ThemedText>
        </View>

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
              <View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: { padding: 6 },
});
