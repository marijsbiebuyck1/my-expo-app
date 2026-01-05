import { useRouter } from "expo-router";
// SecureStore usage removed - prefer provided ids from the conversation list
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import {
  getLocalConversations,
  removeLocalConversation,
  subscribeLocalConversations,
} from "../../../../lib/localConversations";
import { api } from "../../../_lib/api";

type Conversation = {
  id: string;
  conversationId?: string | null;
  name: string;
  lastMessage: string;
  avatar?: string | null;
};

export default function ChatListScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const remoteRef = useRef<Conversation[]>([]);

  const mergeLocalWithRemote = useCallback(
    (
      remoteList: Conversation[],
      providedLocal?: ReturnType<typeof getLocalConversations>
    ) => {
      const localsSource = providedLocal ?? getLocalConversations();
      let merged = [...remoteList];
      localsSource.forEach((local) => {
        const normalized: Conversation = {
          id: local.id,
          conversationId: local.conversationId ?? null,
          name: local.name || "Onbekend",
          lastMessage: local.lastMessage || "",
          avatar: local.avatar ?? null,
        };
        const existingIndex = merged.findIndex(
          (item) => item.id === normalized.id
        );
        if (existingIndex >= 0) {
          const existing = merged[existingIndex];
          merged[existingIndex] = {
            ...existing,
            name: normalized.name || existing.name,
            lastMessage: normalized.lastMessage || existing.lastMessage,
            avatar: existing.avatar || normalized.avatar,
            conversationId:
              existing.conversationId || normalized.conversationId || null,
          };
        } else {
          merged = [normalized, ...merged];
        }
      });
      return merged;
    },
    []
  );

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get("/conversations");
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || `status ${resp.status}`);
      }
      const json = await resp.json().catch(() => []);
      const remoteList: Conversation[] = Array.isArray(json)
        ? json.map((it: any) => {
            const fallbackId =
              it.animalId ||
              it.id ||
              it.conversationId ||
              `tmp-${Date.now()}-${Math.random()}`;
            return {
              id: String(fallbackId),
              conversationId: it.id || it.conversationId || null,
              name: it.name || it.animalName || "Onbekend",
              lastMessage: it.lastMessage || "",
              avatar: it.avatar || it.animalPhoto || null,
            };
          })
        : [];
      remoteRef.current = remoteList;
      setConversations(mergeLocalWithRemote(remoteList));
    } catch (err) {
      console.warn("Failed to fetch conversations", err);
      remoteRef.current = [];
      const localFallback = getLocalConversations().map((entry) => ({
        id: entry.id,
        conversationId: entry.conversationId ?? null,
        name: entry.name || "Onbekend",
        lastMessage: entry.lastMessage || "",
        avatar: entry.avatar ?? null,
      }));
      setConversations(localFallback);
    } finally {
      setLoading(false);
    }
  }, [mergeLocalWithRemote]);

  useEffect(() => {
    loadConversations();
    const unsubscribe = subscribeLocalConversations((items) => {
      setConversations(mergeLocalWithRemote(remoteRef.current, items));
    });
    return () => {
      unsubscribe();
    };
  }, [loadConversations, mergeLocalWithRemote]);

  function openConversation(id: string) {
    router.push({
      pathname: "/users/[profileId]",
      params: { profileId: id },
    } as any);
  }

  const deleteConversation = useCallback(
    async (item: Conversation) => {
      setPendingDeleteId(item.id);
      setConversations((prev) => prev.filter((conv) => conv.id !== item.id));
      removeLocalConversation(item.id);
      const targetId = encodeURIComponent(item.conversationId || item.id);
      try {
        const resp = await api.del(`/conversations/${targetId}`);
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(text || `status ${resp.status}`);
        }
        await loadConversations();
      } catch (err) {
        console.warn("Failed to delete conversation", err);
        await loadConversations();
        Alert.alert(
          "Verwijderen mislukt",
          err instanceof Error
            ? err.message || "Probeer het later opnieuw."
            : "Probeer het later opnieuw."
        );
      } finally {
        setPendingDeleteId((prev) => (prev === item.id ? null : prev));
      }
    },
    [loadConversations]
  );

  const confirmDelete = useCallback(
    (item: Conversation) => {
      Alert.alert(
        "Chat verwijderen",
        `Wil je het gesprek met ${item.name} verwijderen?`,
        [
          { text: "Annuleren", style: "cancel" },
          {
            text: "Verwijderen",
            style: "destructive",
            onPress: () => deleteConversation(item),
          },
        ]
      );
    },
    [deleteConversation]
  );

  const renderSwipeActions = (item: Conversation) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => confirmDelete(item)}
      accessibilityRole="button"
    >
      <ThemedText style={styles.deleteActionText}>
        {pendingDeleteId === item.id ? "Bezig…" : "Verwijderen"}
      </ThemedText>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: ListRenderItemInfo<Conversation>) => (
    <Swipeable
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      renderRightActions={() => renderSwipeActions(item)}
    >
      <Pressable
        onPress={() => openConversation(item.id)}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        disabled={pendingDeleteId === item.id}
      >
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
    </Swipeable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <LogoHeader />

      <View style={styles.container}>
        <ThemedText type="title" style={{ marginBottom: 12, paddingLeft: 30 }}>
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
    width: "100%",
    padding: 15,
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
  deleteAction: {
    backgroundColor: "#FDA0E9",
    justifyContent: "center",
    alignItems: "center",
    width: 120,
    marginLeft: 12,
    borderRadius: 12,
  },
  deleteActionText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export const options = {
  title: "Chat",
  tabBarLabel: "Chat",
};
