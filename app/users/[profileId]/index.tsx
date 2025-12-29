import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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

import LogoHeader from "../../../components/logo-header";
import { ThemedText } from "../../../components/themed-text";
import { api } from "../../_lib/api";

type Message = {
  id: string;
  text: string;
  fromMe?: boolean;
  time?: string;
};

export default function ChatDetailScreen() {
  const params = useLocalSearchParams();
  const profileId = String(params.profileId ?? "unknown");
  const autoMessageParam =
    typeof params.autoMessage === "string" ? params.autoMessage : undefined;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [animal, setAnimal] = useState<{
    name?: string;
    photo?: string;
  } | null>(null);

  const [messages, setMessages] = useState<Message[]>(() => []);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const scroller = useRef<ScrollView | null>(null);
  const firstIncomingIndex = useMemo(
    () => messages.findIndex((m) => !m.fromMe),
    [messages]
  );
  const avatarInitial = useMemo(() => {
    if (animal?.name) {
      return animal.name.trim().charAt(0).toUpperCase();
    }
    return "P";
  }, [animal?.name]);

  const keyboardOffset = Platform.OS === "ios" ? -80 : 0; // keep chat card just above keyboard on iOS

  const handleFormPress = () => {
    router.push("/users/register-owner" as any);
  };

  useEffect(() => {
    // scroll to bottom when messages change
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  useEffect(() => {
    let mounted = true;

    async function loadMessages() {
      setLoading(true);
      try {
        const tryPaths = [
          `/messages?profileId=${encodeURIComponent(profileId)}`,
          `/messages/profile/${encodeURIComponent(profileId)}`,
          `/messages/${encodeURIComponent(profileId)}`,
          "/messages",
        ];

        for (const p of tryPaths) {
          try {
            const resp = await api.get(p);
            if (!mounted) return;
            if (!resp.ok) continue;
            const json = await resp.json().catch(() => null);
            if (!json) continue;

            let list: Message[] = [];
            if (Array.isArray(json)) {
              list = json.map((m: any) => ({
                id: m.id || m._id || String(Math.random()),
                text: m.text || m.message || m.body || "",
                fromMe: !!(m.from === "me" || m.fromMe || m.isFromCurrentUser),
                time: m.time || m.createdAt || m.ts || undefined,
              }));
            } else if (Array.isArray(json.items)) {
              list = json.items.map((m: any) => ({
                id: m.id || m._id || String(Math.random()),
                text: m.text || m.message || m.body || "",
                fromMe: !!(m.from === "me" || m.fromMe || m.isFromCurrentUser),
                time: m.time || m.createdAt || m.ts || undefined,
              }));
            }

            if (list.length > 0) {
              setMessages(list);
              return;
            }
          } catch (err) {
            // try next
            console.warn && console.warn("message fetch attempt failed", err);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMessages().finally(() => {
      // fetch animal profile to render header/avatar
      (async () => {
        try {
          const r = await api.get(`/animals/${encodeURIComponent(profileId)}`);
          if (r.ok) {
            const j = await r.json().catch(() => null);
            if (j) {
              setAnimal({
                name: j.name || j.title || undefined,
                photo: j.photo || undefined,
              });
            }
          }
        } catch (err) {
          console.warn("fetch animal failed", err);
        }
      })();

      // If an auto message param was provided, ensure it's shown (avoid duplicates)
      if (autoMessageParam) {
        setMessages((prev) => {
          if (prev.some((m) => m.text === autoMessageParam)) return prev;
          const autoMsg: Message = {
            id: `auto-${Date.now()}`,
            text: autoMessageParam,
            fromMe: false,
            time: new Date().toLocaleTimeString().slice(0, 5),
          };
          return [...prev, autoMsg];
        });
      }
    });

    return () => {
      mounted = false;
    };
  }, [profileId, autoMessageParam]);

  function send() {
    if (!text.trim()) return;
    const next: Message = {
      id: String(Date.now()),
      text: text.trim(),
      fromMe: true,
      time: new Date().toLocaleTimeString().slice(0, 5),
    };
    // optimistic UI
    setMessages((s) => [...s, next]);
    setText("");

    (async () => {
      try {
        const payload = { to: profileId, text: next.text };
        const resp = await api.post("/messages", payload);
        if (!resp.ok) return;
        const json = await resp.json().catch(() => null);
        if (json && json.id) {
          setMessages((s) =>
            s.map((m) => (m.id === next.id ? { ...m, id: json.id } : m))
          );
        }
      } catch {
        // keep optimistic message on network failure
      }
    })();
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={keyboardOffset}
        >
          <LogoHeader style={styles.logoHeader} />
          <View style={styles.pageContainer}>
            <View style={styles.chatCard}>
              <View style={styles.cardInner}>
                <View style={styles.headerRow}>
                  <Pressable
                    onPress={() => router.push("/users/chat")}
                    style={styles.backBtn}
                    accessibilityLabel="Terug naar chats"
                  >
                    <Ionicons name="chevron-back" size={24} color="#2F2A28" />
                  </Pressable>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {animal?.photo ? (
                      <Image
                        source={{ uri: animal.photo }}
                        style={styles.headerAvatar}
                      />
                    ) : (
                      <View style={styles.headerAvatarFallback}>
                        <ThemedText style={styles.headerAvatarText}>
                          {avatarInitial}
                        </ThemedText>
                      </View>
                    )}
                    <ThemedText style={styles.headerTitle}>
                      {animal?.name ? `${animal.name}` : "Chat"}
                    </ThemedText>
                  </View>
                </View>

                {loading ? (
                  <View style={styles.loadingState}>
                    <ThemedText>Bezig met laden...</ThemedText>
                  </View>
                ) : (
                  <ScrollView
                    style={{ flex: 1 }}
                    ref={scroller}
                    contentContainerStyle={styles.messagesList}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {messages.length === 0 ? (
                      <View style={styles.emptyState}>
                        <ThemedText style={styles.emptyTitle}>
                          Start een gesprek met {animal?.name ?? "dit diertje"}
                        </ThemedText>
                        <ThemedText style={styles.emptySubtitle}>
                          Stel vragen of vertel meer over jezelf.
                        </ThemedText>
                      </View>
                    ) : null}
                    {messages.map((m, index) => {
                      const isMine = !!m.fromMe;
                      const showCta = !isMine && index === firstIncomingIndex;
                      return (
                        <View
                          key={m.id}
                          style={[
                            styles.messageRow,
                            isMine ? styles.rowRight : styles.rowLeft,
                          ]}
                        >
                          {!isMine && (
                            <View style={styles.avatarHolder}>
                              {animal?.photo ? (
                                <Image
                                  source={{ uri: animal.photo }}
                                  style={styles.messageAvatar}
                                />
                              ) : (
                                <View style={styles.avatarFallback}>
                                  <ThemedText style={styles.avatarInitial}>
                                    {avatarInitial}
                                  </ThemedText>
                                </View>
                              )}
                            </View>
                          )}
                          <View
                            style={[
                              styles.bubble,
                              isMine ? styles.bubbleRight : styles.bubbleLeft,
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.messageText,
                                isMine
                                  ? styles.messageTextDark
                                  : styles.messageTextLight,
                              ]}
                            >
                              {m.text}
                            </ThemedText>
                            {showCta ? (
                              <Pressable
                                style={styles.ctaButton}
                                onPress={handleFormPress}
                              >
                                <ThemedText style={styles.ctaButtonText}>
                                  Invulformulier
                                </ThemedText>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                <View
                  style={[
                    styles.composerRow,
                    { paddingBottom: Math.max(20, insets.bottom) },
                  ]}
                >
                  <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Verstuur een bericht"
                    placeholderTextColor="#9CA1AF"
                    style={styles.input}
                    multiline
                  />
                  <Pressable
                    onPress={send}
                    style={styles.sendBtn}
                    accessibilityLabel="Verstuur bericht"
                  >
                    <Ionicons name="paper-plane" size={20} color="#fff" />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8EF" },
  logoHeader: { marginTop: 12, alignSelf: "center" },
  pageContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  chatCard: {
    flex: 1,
    width: "100%",
    maxWidth: 360,
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
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#2A1F1A" },
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
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFE3EE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontWeight: "700", color: "#C05FA0" },
  bubble: {
    maxWidth: "80%",
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
  messageTextLight: { color: "#2F2A28" },
  messageTextDark: { color: "#1F3C1A" },
  ctaButton: {
    marginTop: 18,
    alignSelf: "flex-start",
    backgroundColor: "#FDA0E9",
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  ctaButtonText: { color: "#fff", fontWeight: "700" },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 110,
    borderRadius: 28,
    backgroundColor: "#F1F1F4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: "#2F2A28",
    marginRight: 12,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#AEBA40",
    alignItems: "center",
    justifyContent: "center",
  },
});

export const options = { title: "Chat" };
