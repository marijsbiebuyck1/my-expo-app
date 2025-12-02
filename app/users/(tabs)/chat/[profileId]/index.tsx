import BgCard from "@/components/ui/bg-card";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import LogoHeader from "../../../../../components/logo-header";
import { ThemedText } from "../../../../../components/themed-text";
import { api } from "../../../../_lib/api";

type Message = {
  id: string;
  text: string;
  fromMe?: boolean;
  time?: string;
};

export default function ChatDetailScreen() {
  const params = useLocalSearchParams();
  const profileId = String(params.profileId ?? "unknown");
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "m1",
      text: "Hallo! Hoe kan ik je helpen?",
      fromMe: false,
      time: "10:00",
    },
    {
      id: "m2",
      text: "Ik heb interesse in het hondje.",
      fromMe: true,
      time: "10:02",
    },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const scroller = useRef<ScrollView | null>(null);

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
          } catch {
            // try next
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMessages();
    return () => {
      mounted = false;
    };
  }, [profileId]);

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
    <SafeAreaView
      style={styles.screen}
      edges={["top", "left", "right", "bottom"]}
    >
      <LogoHeader />

      <View style={styles.pageContainer}>
        <BgCard style={styles.bgCard} contentStyle={{ padding: 0 }}>
          <KeyboardAvoidingView
            style={{ flex: 1, width: "100%" }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.header}>
              <ThemedText type="title">Chat</ThemedText>
              <ThemedText>{`Profiel: ${profileId}`}</ThemedText>
            </View>

            {loading ? (
              <View style={{ padding: 16 }}>
                <ThemedText>Bezig met laden...</ThemedText>
              </View>
            ) : (
              <ScrollView
                ref={scroller}
                contentContainerStyle={styles.messages}
                keyboardShouldPersistTaps="handled"
              >
                {messages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.bubble,
                      m.fromMe ? styles.bubbleRight : styles.bubbleLeft,
                    ]}
                  >
                    <ThemedText style={{ color: m.fromMe ? "#fff" : "#111" }}>
                      {m.text}
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
            )}

            <View
              style={[
                styles.composerRow,
                { paddingBottom: Math.max(12, insets.bottom) },
              ]}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Schrijf een bericht..."
                style={styles.input}
                multiline
              />
              <Pressable onPress={send} style={styles.sendBtn}>
                <ThemedText style={{ color: "#fff" }}>Verstuur</ThemedText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </BgCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFCF5" },
  // page container centers the white card on the screen
  pageContainer: { padding: 10, alignItems: "center" },
  // white background card dimensions and shadow
  bgCard: { width: "100%", maxWidth: 343, height: 666 },
  header: { padding: 5, borderBottomWidth: 0 },
  messages: { padding: 5, paddingBottom: 24 },
  bubble: {
    maxWidth: "100%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  bubbleLeft: { backgroundColor: "#fff", alignSelf: "flex-start" },
  bubbleRight: { backgroundColor: "#1a73e8", alignSelf: "flex-end" },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 0,
  },
  input: {
    flex: 1,
    minHeight: 100,
    maxHeight: 120,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: "#1a73e8",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export const options = { title: "Chat" };
