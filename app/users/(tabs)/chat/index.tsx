import { useRouter } from "expo-router";
// SecureStore usage removed - prefer provided ids from the conversation list
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,

  View,
} from "react-native";
import { RectButton, Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import BgCard from "../../../../components/ui/bg-card";
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

const rossePoes = require("../../../../assets/images/rossepoes.png");

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
    <View style={styles.swipeActions}>
      <RectButton
        style={[styles.swipeActionButton, styles.swipeDeleteButton]}
        onPress={() => confirmDelete(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <ThemedText style={styles.swipeActionText}>
          {pendingDeleteId === item.id ? "Bezig…" : "Verwijderen"}
        </ThemedText>
      </RectButton>
    </View>
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
        <Ionicons name="chevron-forward" size={20} style={styles.chevron} />
      </Pressable>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <LogoHeader />

      <View style={styles.container}>
        <View style={styles.cardShell}>
          <BgCard
            style={styles.bgCard}
            contentStyle={styles.cardContent}
            scrollEnabled={false}
          >
            <ThemedText type="title" style={styles.pageTitle}>
              Jouw matches 🐾
            </ThemedText>

            {loading ? (
              <View style={styles.loadingState}>
                <ThemedText>Bezig met laden...</ThemedText>
              </View>
            ) : (
              <View style={styles.listArea}>
                <FlatList
                  data={conversations}
                  keyExtractor={(i) => i.id}
                  renderItem={renderItem}
                  ItemSeparatorComponent={() => (
                    <View style={styles.separator} />
                  )}
                  contentContainerStyle={styles.listContent}
                  style={styles.list}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                      <ThemedText>Geen gesprekken beschikbaar.</ThemedText>
                    </View>
                  )}
                />
                <View style={styles.footerIllustration}>
                  <Image
                    source={rossePoes}
                    style={styles.footerImage}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>
              </View>
            )}
          </BgCard>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFCF5" },
  container: {
    flex: 1,
    padding: 20,
  },
  cardShell: {
    flex: 1,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  bgCard: {
    width: "100%",
    height: "92%",
  },
  cardContent: {
    flex: 1,
    flexGrow: 1,
    paddingBottom: 0,
  },
  pageTitle: {
    marginBottom: 30,
    paddingLeft: 6,
    marginTop: 6,
  },
  listArea: {
    flex: 1,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 6,
    paddingBottom: 0,
  },
  emptyState: {
    paddingVertical: 12,
    alignItems: "center",
  },
  loadingState: {
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 14,
    paddingRight: 6,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  meta: { flex: 1 },
  preview: { color: "#666", marginTop: 4 },
  chevron: {
    color: "#B5B5B5",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E2DC",
    marginLeft: 0,
  },
  footerIllustration: {
    alignItems: "flex-end",
    paddingTop: 22,
    marginTop: 16,
  },
  footerImage: {
    width: 180,
    height: 145,
    marginRight: -24,
  },
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
  swipeActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  swipeActionButton: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 26,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    minWidth: 72,
  },
  swipeDeleteButton: { backgroundColor: "#FDA0E9" },
  swipeActionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 4,
  },
});

export const options = {
  title: "Chat",
  tabBarLabel: "Chat",
};
