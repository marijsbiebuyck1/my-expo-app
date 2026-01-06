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
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import BgCard from "../../../../components/ui/bg-card";
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

const rossePoes = require("../../../../assets/images/rossepoes.png");

export default function AnimalChatsScreen() {
  const params = useLocalSearchParams();
  const animalId = String(params.animalId ?? "");
  const initialAnimalName =
    typeof params.animalName === "string" && params.animalName.trim().length
      ? params.animalName
      : "";
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [animalName, setAnimalName] = useState(initialAnimalName);

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
        const nextName = mapped[0]?.animalName || "";
        if (nextName) {
          setAnimalName((prev) => prev || nextName);
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
      <Pressable
        onPress={() => openConversation(item)}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <ThemedText style={styles.avatarInitial}>
              {(item.name || "").trim().charAt(0).toUpperCase()}
            </ThemedText>
          </View>
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
    );
  }

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
            <View style={styles.cardHeaderRow}>
              <Pressable
                onPress={() => router.push("/admin/(tabs)/animals" as any)}
                style={styles.backButton}
                accessibilityLabel="Terug"
              >
                <Ionicons name="chevron-back" size={18} color="#2F2A28" />
              </Pressable>
              <ThemedText type="title" style={styles.pageTitle}>
                {`Matches voor ${animalName}`}
              </ThemedText>
            </View>

            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator />
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
                      <ThemedText>
                        Geen gesprekken gevonden voor dit dier.
                      </ThemedText>
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
    height: "100%",
  },
  cardContent: {
    flex: 1,
    flexGrow: 1,
    paddingBottom: 0,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1EFE8",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    marginBottom: 0,
    fontSize: 20,
    fontWeight: "bold",
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
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: "#EFEFD1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontWeight: "700", color: "#000" },
  meta: { flex: 1 },
  preview: { color: "#666", marginTop: 4 },
  chevron: {
    color: "#B5B5B5",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E2DC",
    marginLeft: 68,
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
});
