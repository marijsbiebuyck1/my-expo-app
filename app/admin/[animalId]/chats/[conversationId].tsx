import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import { api } from "../../../_lib/api";

const AUTO_MESSAGE_SUFFIX =
  "Twijfels of vragen? Je kunt ze altijd hier stellen. Geen vragen meer? Vul dan het formulier in en wie weet claim ik binnenkort mijn plekje op jouw bank 😸.";
const AUTO_MESSAGE_KEYWORDS = [
  "Twijfels of vragen",
  "Vul dan het formulier in",
  "plekje op jouw bank",
];
const NORMALIZED_AUTO_SUFFIX = normalizeMessageSignature(AUTO_MESSAGE_SUFFIX);
const NORMALIZED_AUTO_KEYWORDS = AUTO_MESSAGE_KEYWORDS.map((keyword) =>
  normalizeMessageSignature(keyword)
);

interface MessageItem {
  id: string;
  text: string;
  fromMe: boolean;
  createdAt?: string;
  authorDisplayName?: string;
  authorAvatar?: string | null;
}

export default function AdminConversationDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const conversationId = String(params.conversationId ?? "");
  const animalId = params.animalId ? String(params.animalId) : "";
  const animalName = params.animalName ? String(params.animalName) : "";
  const userName = params.userName ? String(params.userName) : "Adoptant";
  const avatar =
    typeof params.avatar === "string" && params.avatar.length > 0
      ? params.avatar
      : null;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scroller = useRef<ScrollView | null>(null);
  const userInitial = useMemo(
    () => userName.trim().charAt(0).toUpperCase(),
    [userName]
  );

  useEffect(() => {
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!conversationId) return;
      setLoading(true);
      try {
        const resp = await api.get(
          `/conversations/${encodeURIComponent(conversationId)}/messages${
            animalId ? `?animalId=${encodeURIComponent(animalId)}` : ""
          }`,
          true
        );
        if (!mounted) return;
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(text || `status ${resp.status}`);
        }
        const payload = await resp.json().catch(() => null);
        if (!mounted) return;
        const listSource = Array.isArray(payload?.messages)
          ? payload.messages
          : Array.isArray(payload)
          ? payload
          : [];
        const mapped: MessageItem[] = listSource.map((m: any) => {
          const textValue = m.text || "";
          const fromKind =
            typeof m.fromKind === "string"
              ? m.fromKind.trim().toLowerCase()
              : "";
          const autoMatch = isProbableAutoMessage(textValue);
          const authorAvatar =
            m.authorProfileImage || m.authorAvatar || m.authorPhoto || m.userAvatar || m.avatar || m.profileImage || null;
          return {
            id: String(m.id || m._id || Math.random()),
            text: textValue,
            fromMe: fromKind === "shelter" || autoMatch,
            createdAt: m.createdAt || undefined,
            authorDisplayName: m.authorDisplayName,
            authorAvatar,
          };
        });
        setMessages(mapped);
      } catch (err) {
        console.warn("Failed to load admin messages", err);
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [conversationId, animalId]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || sending) return;
    const tempId = `pending-${Date.now()}`;
    const optimistic: MessageItem = {
      id: tempId,
      text: trimmed,
      fromMe: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setSending(true);
    try {
      const resp = await api.post(
        `/conversations/${encodeURIComponent(conversationId)}/messages${
          animalId ? `?animalId=${encodeURIComponent(animalId)}` : ""
        }`,
        { text: trimmed },
        true
      );
      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `status ${resp.status}`);
      }
      const json = await resp.json().catch(() => null);
      if (json?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, id: json.id } : m))
        );
      }
    } catch (err) {
      console.warn("Failed to send admin message", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? -60 : 0}
        >
          <LogoHeader style={styles.logoHeader} />
          <View style={styles.pageContainer}>
            <View style={styles.chatCard}>
              <View style={styles.cardInner}>
                <View style={styles.headerRow}>
                  <Pressable
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    accessibilityLabel="Terug naar chats"
                  >
                    <Ionicons name="chevron-back" size={24} color="#2F2A28" />
                  </Pressable>
                  <View style={styles.headerMeta}>
                    {avatar ? (
                      <Image
                        source={{ uri: avatar }}
                        style={styles.headerAvatar}
                      />
                    ) : (
                      <View style={styles.headerAvatarFallback}>
                        <ThemedText style={styles.headerAvatarText}>
                          {userInitial}
                        </ThemedText>
                      </View>
                    )}
                    <View>
                      <ThemedText style={styles.headerTitle}>
                        {userName}
                      </ThemedText>
                      {animalName ? (
                        <ThemedText style={styles.headerSubtitle}>
                          {animalName}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                </View>

                {loading ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator />
                  </View>
                ) : (
                  <ScrollView
                    ref={scroller}
                    contentContainerStyle={styles.messagesList}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {messages.length === 0 ? (
                      <View style={styles.emptyState}>
                        <ThemedText style={styles.emptyTitle}>
                          Start een gesprek met deze match
                        </ThemedText>
                        <ThemedText style={styles.emptySubtitle}>
                          Deel extra informatie over {animalName || "het dier"}{" "}
                          of beantwoord vragen.
                        </ThemedText>
                      </View>
                    ) : null}
                    {messages.map((message) => (
                      <View
                        key={message.id}
                        style={[
                          styles.messageRow,
                          message.fromMe ? styles.rowRight : styles.rowLeft,
                        ]}
                      >
                        {!message.fromMe ? (
                          <View style={styles.avatarHolder}>
                            {message.authorAvatar || avatar ? (
                              <Image
                                source={{ uri: message.authorAvatar || avatar || undefined }}
                                style={styles.messageAvatar}
                              />
                            ) : (
                              <View style={styles.messageAvatarFallback}>
                                <ThemedText style={styles.messageAvatarText}>
                                  {(
                                    (message.authorDisplayName || "")
                                      .trim()
                                      .charAt(0)
                                      .toUpperCase() || userInitial
                                  )}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        ) : null}
                        <View
                          style={[
                            styles.bubble,
                            message.fromMe
                              ? styles.bubbleRight
                              : styles.bubbleLeft,
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.messageText,
                              message.fromMe
                                ? styles.messageTextRight
                                : styles.messageTextLeft,
                            ]}
                          >
                            {message.text}
                          </ThemedText>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}

                <View
                  style={[
                    styles.composerRow,
                    { paddingBottom: Math.max(20, insets.bottom) },
                  ]}
                >
                  <TextInput
                    placeholder="Schrijf een bericht"
                    placeholderTextColor="#9CA1AF"
                    value={text}
                    onChangeText={setText}
                    style={styles.input}
                    multiline
                  />
                  <Pressable
                    onPress={send}
                    disabled={!text.trim() || sending}
                    style={[
                      styles.sendBtn,
                      (!text.trim() || sending) && { opacity: 0.5 },
                    ]}
                    accessibilityLabel="Verstuur bericht"
                  >
                    <Ionicons name="paper-plane" size={18} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

function normalizeMessageSignature(value?: string | null) {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isProbableAutoMessage(text?: string | null) {
  const signature = normalizeMessageSignature(text);
  if (!signature) return false;
  if (NORMALIZED_AUTO_SUFFIX && signature.includes(NORMALIZED_AUTO_SUFFIX)) {
    return true;
  }
  let keywordHits = 0;
  for (const keyword of NORMALIZED_AUTO_KEYWORDS) {
    if (!keyword) continue;
    if (signature.includes(keyword)) {
      keywordHits += 1;
      if (keywordHits >= 2) {
        return true;
      }
    }
  }
  return false;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8EF" },
  logoHeader: { marginTop: 12, alignSelf: "center" },
  pageContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  chatCard: {
    flex: 1,
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 36,
    paddingHorizontal: 24,
    paddingVertical: 26,
    shadowColor: "#0F0B06",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  cardInner: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1EFE8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerAvatar: { width: 44, height: 44, borderRadius: 22 },
  headerAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFE3EE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontWeight: "700", color: "#B4448C" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#2A1F1A" },
  headerSubtitle: { fontSize: 14, color: "#6B6560" },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center" },
  messagesList: { paddingVertical: 12, flexGrow: 1 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2F2A28",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#726C67",
    textAlign: "center",
    marginTop: 6,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end" },
  avatarHolder: { marginRight: 12 },
  messageAvatar: { width: 34, height: 34, borderRadius: 17 },
  messageAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFE3EE",
    alignItems: "center",
    justifyContent: "center",
  },
  messageAvatarText: { fontWeight: "700", color: "#C05FA0" },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 28,
  },
  bubbleLeft: {
    backgroundColor: "#F3F0EB",
    borderBottomLeftRadius: 12,
  },
  bubbleRight: {
    backgroundColor: "#E7F6E6",
    borderBottomRightRadius: 12,
    alignSelf: "flex-end",
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageTextLeft: { color: "#2F2A28" },
  messageTextRight: { color: "#1F3C1A" },
  composerRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E1DED7",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#2F2A28",
    backgroundColor: "#fff",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F6B547",
    alignItems: "center",
    justifyContent: "center",
  },
});
