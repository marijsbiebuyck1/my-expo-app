import { useRouter } from "expo-router";
// SecureStore usage removed - prefer provided ids from the conversation list
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView, RectButton, Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import {
  getLocalConversations,
  subscribeLocalConversations,
} from "../../../../lib/localConversations";
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
  
  async function removeConversationLocal(id: string) {
    // remove locally immediately
    setConversations((prev) => prev.filter((c) => c.id !== id));
    try {
      await api.del(`/conversations/${encodeURIComponent(id)}`, true);
    } catch (err) {
      console.warn("Failed to delete conversation", err);
      Alert.alert("Verwijderen mislukt", "Kon gesprek niet verwijderen. Probeer het opnieuw.");
    }
    // also remove any optimistic local conversation
    try {
      const { removeLocalConversation } = await import(
        "../../../../lib/localConversations"
      );
      removeLocalConversation(id);
    } catch {
      // ignore
    }
    // NOTE: Do NOT delete the animal resource here. Only remove the conversation
    // so the animal no longer appears in the conversation list.
  }

  useEffect(() => {
    let mounted = true;
    const mergeWithLocal = (remote: Conversation[]) => {
      const local = getLocalConversations();
      const localAsConv: Conversation[] = local.map((l) => ({
        id: l.id,
        name: l.name,
        lastMessage: l.lastMessage || "",
        avatar: l.avatar ?? null,
      }));
      const merged = [
        ...localAsConv,
        ...remote.filter((l) => !localAsConv.some((x) => x.id === l.id)),
      ];
      return merged;
    };

    async function load() {
      setLoading(true);
      try {
        const resp = await api.get("/conversations");
        if (!mounted) return;
        if (!resp.ok) throw new Error(`status ${resp.status}`);
        const json = await resp.json().catch(() => null);
        if (!json || !Array.isArray(json)) throw new Error("Invalid payload");
        const list: Conversation[] = json.map((it: any) => ({
          id: it.animalId || it.id || String(Math.random()),
          name: it.name || it.animalName || "Onbekend",
          lastMessage: it.lastMessage || "",
          avatar: it.avatar || it.animalPhoto || null,
        }));
        setConversations(mergeWithLocal(list));
      } catch (err) {
        console.warn("Failed to fetch conversations", err);
        const local = getLocalConversations().map((l) => ({
          id: l.id,
          name: l.name,
          lastMessage: l.lastMessage || "",
          avatar: l.avatar ?? null,
        }));
        if (!mounted) return;
        setConversations(local);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    // subscribe to local optimistic conversations so the list updates immediately
    const unsub = subscribeLocalConversations((items) => {
      setConversations((prev) => {
        const localAsConv: Conversation[] = items.map((l) => ({
          id: l.id,
          name: l.name,
          lastMessage: l.lastMessage || "",
          avatar: l.avatar ?? null,
        }));
        const fetched = prev.filter(
          (p) => !localAsConv.some((i) => i.id === p.id)
        );
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

  function renderRightActions(item: Conversation) {
    return (
      <View style={{ width: 120, flexDirection: "row", justifyContent: "flex-end" }}>
        <RectButton
          style={[styles.swipeActionButton, styles.swipeDeleteButton]}
          onPress={() => {
            Alert.alert(
              "Verwijder gesprek",
              "Weet je zeker dat je dit gesprek wilt verwijderen?",
              [
                { text: "Annuleer", style: "cancel" },
                {
                  text: "Verwijder",
                  style: "destructive",
                  onPress: () => removeConversationLocal(item.id),
                },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <ThemedText style={styles.swipeActionText}>Verwijder</ThemedText>
        </RectButton>
      </View>
    );
  }

  function renderItem({ item }: ListRenderItemInfo<Conversation>) {
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
      >
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
  }

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
          <GestureHandlerRootView style={{ flex: 1 }}>
          <FlatList
            data={conversations}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={() => (
              <View style={{ padding: 16, alignItems: "center" }}>
                <ThemedText style={{ color: "#666" }}>Nog geen matches</ThemedText>
              </View>
            )}
          />
          </GestureHandlerRootView>
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
  swipeActionButton: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 72,
  },
  swipeDeleteButton: { backgroundColor: "#FDA0E9" },
  swipeActionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 6,
  },
});

export const options = {
  title: "Chat",
  tabBarLabel: "Chat",
};
