import { Barriecito_400Regular, useFonts as useGFonts } from "@expo-google-fonts/barriecito";
import React, { useEffect } from "react";
import {
    Animated,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  visible: boolean;
  imageUri?: string | null;
  onClose?: () => void;
  onOpenChat?: () => void;
};

export default function MatchCard({ visible, imageUri, onClose, onOpenChat }: Props) {
  // load Barriecito via expo-google-fonts
  const [gfontsLoaded] = useGFonts({ Barriecito_400Regular });

  useEffect(() => {
    if (visible) {
      // auto-close after 3s
      const timer = setTimeout(() => {
        onClose?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
    return;
  }, [visible, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View style={styles.card}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}

          <View style={styles.textWrap}>
            <Text style={styles.small}>{"It's a"}</Text>
            <View style={styles.matchRow}>
              {(() => {
                const letters = ["M", "A", "T", "C", "H", "!"];
                const colorMap: Record<string, string> = {
                  M: "#037D4E", // green
                  A: "#FDA0E9", // pink
                  T: "#FF8E28", // orange
                  C: "#AEBA40", // light green
                  H: "#D3D1F6", // lila
                  "!": "#FF8E28",
                };
                return letters.map((ch, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.match,
                      { color: colorMap[ch] || styles.match.color },
                      gfontsLoaded ? { fontFamily: "Barriecito_400Regular" } : {},
                    ]}
                  >
                    {ch}
                  </Text>
                ));
              })()}
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={onClose} style={styles.actionButton} accessibilityLabel="Close">
              <Text style={styles.actionText}>Sluiten</Text>
            </TouchableOpacity>
            {onOpenChat ? (
              <TouchableOpacity onPress={onOpenChat} style={[styles.actionButton, styles.chatButton]} accessibilityLabel="Open chat">
                <Text style={[styles.actionText, styles.chatText]}>Open chat</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 12,
  },
  image: {
    width: "100%",
    height: 320,
    backgroundColor: "#eee",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    alignItems: "flex-start",
    marginTop: 12,
  },
  small: {
    fontFamily: "montserrat",
    fontSize: 16,
    color: "#FF8E28",
  },
  match: {
    fontSize: 40,
    color: "#FB4DA3",
    marginTop: 6,
    letterSpacing: 1,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    marginHorizontal: 6,
  },
  actionText: {
    color: "#333",
    fontSize: 14,
  },
  chatButton: {
    backgroundColor: "#037D4E",
  },
  chatText: {
    color: "#fff",
  },
});
