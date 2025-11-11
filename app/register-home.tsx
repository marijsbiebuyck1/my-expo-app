import { ThemedText } from "@/components/themed-text";
// image upload removed per request
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "./lib/api";

// Hide header for this onboarding route
export const options = { headerShown: false, header: () => null };

const animalOptions = [
  "🐱 Kan met katten",
  "🐶 Kan met honden",
  "🐰 Kan met knaagdieren",
];
const childrenOptions = [
  "❌ Nee",
  "🙂 Ja, jonger dan 6 jaar",
  "👦 Ja, tussen 6 - 14 jaar",
];

export default function RegisterHome() {
  const router = useRouter();
  const [hasGarden, setHasGarden] = useState<boolean | null>(null);
  const [otherAnimals, setOtherAnimals] = useState<string[]>([]);
  const [children, setChildren] = useState<string | null>(null);
  // photo removed — we don't collect images here
  const [loading, setLoading] = useState(false);

  // image picker removed

  const toggleOther = (val: string) => {
    setOtherAnimals((prev) =>
      prev.includes(val) ? prev.filter((p) => p !== val) : [...prev, val]
    );
  };

  async function onSave() {
    setLoading(true);
    try {
      let userId = await SecureStore.getItemAsync("userId");
      const rawUser = await SecureStore.getItemAsync("user");
      if (!userId && rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          userId = parsed?.id ?? parsed?._id ?? null;
        } catch {
          // noop
        }
      }

      if (!userId) {
        Alert.alert(
          "Fout",
          "Kon je gebruikers-id niet vinden. Log in en probeer opnieuw."
        );
        return;
      }

      const token = await SecureStore.getItemAsync("userToken");

      // Map UI choices to HomeSchema and PATCH to /users/:id/home
      // Map children display strings to enum expected by backend
      let childrenEnum: string | null = null;
      if (children === "❌ Nee") childrenEnum = "none";
      else if (children === "🙂 Ja, jonger dan 6 jaar") childrenEnum = "under6";
      else if (children === "👦 Ja, tussen 6 - 14 jaar") childrenEnum = "6to14";

      // Map otherAnimals display strings to simple types the backend expects
      const mappedOtherPets = otherAnimals.map((a) => {
        if (a.includes("kat")) return "cat";
        if (a.includes("hond")) return "dog";
        if (a.includes("knaagdier") || a.includes("kn")) return "rodent";
        return a;
      });

      const homePayload: any = {
        garden: hasGarden === true,
        otherPets: mappedOtherPets,
        children: childrenEnum,
      };

      console.debug("PATCH home ->", {
        userId,
        hasToken: !!token,
        homePayload,
      });
      const resp = await api.patch(`/users/${userId}/home`, homePayload);

      const respText = await resp.text();
      console.debug("PATCH ownerHome response", {
        status: resp.status,
        body: respText,
      });
      if (!resp.ok) {
        console.error("Failed to save ownerHome", {
          status: resp.status,
          body: respText,
        });
        throw new Error(respText || `HTTP ${resp.status}`);
      }

      // Persist updated user returned by backend (if any)
      try {
        const json = await resp.json();
        console.debug("Saved user after ownerHome", json);
        if (json && typeof json === "object") {
          await SecureStore.setItemAsync("user", JSON.stringify(json));
          if (json.id || json._id) {
            await SecureStore.setItemAsync(
              "userId",
              String(json.id ?? json._id)
            );
          }
        }
      } catch {
        console.debug("No JSON body returned from ownerHome PATCH");
      }

      router.replace("/home" as any);
    } catch (err) {
      console.error("save ownerHome error", err);
      Alert.alert(
        "Fout",
        (err as any)?.message || "Kon thuissituatie niet opslaan."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar hidden />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title" style={styles.title}>
          Over je thuissituatie
        </ThemedText>

        <Text style={styles.sectionLabel}>Heeft toegang tot een tuin?</Text>
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, hasGarden === true && styles.chipSelected]}
            onPress={() => setHasGarden(true)}
          >
            <Text
              style={[
                styles.chipText,
                hasGarden === true && styles.chipTextSelected,
              ]}
            >
              🌳 Ja
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, hasGarden === false && styles.chipSelected]}
            onPress={() => setHasGarden(false)}
          >
            <Text
              style={[
                styles.chipText,
                hasGarden === false && styles.chipTextSelected,
              ]}
            >
              🏙️ Nee
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>
          Kan omgaan met andere dieren?
        </Text>
        <View style={styles.chipsRow}>
          {animalOptions.map((a) => (
            <TouchableOpacity
              key={a}
              style={[
                styles.chip,
                otherAnimals.includes(a) && styles.chipSelected,
              ]}
              onPress={() => toggleOther(a)}
            >
              <Text
                style={[
                  styles.chipText,
                  otherAnimals.includes(a) && styles.chipTextSelected,
                ]}
              >
                {a}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>
          Kan omgaan met kinderen
        </Text>
        <View style={styles.chipsRow}>
          {childrenOptions.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, children === c && styles.chipSelected]}
              onPress={() => setChildren(c)}
            >
              <Text
                style={[
                  styles.chipText,
                  children === c && styles.chipTextSelected,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 18 }} />

        <View style={{ height: 24 }} />

        <TouchableOpacity
          style={styles.cta}
          onPress={onSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Klaar!</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBF4E2" },
  container: { padding: 24, paddingTop: 30 },
  title: {
    fontSize: 22,
    marginBottom: 18,
    fontFamily: "MontserratAlternates-SemiBold",
    color: "#3F3F3F",
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: "#333",
    fontFamily: "Montserrat_700Bold",
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  chip: {
    backgroundColor: "#EFEFD1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 2,
    marginBottom: 2,
  },
  chipSelected: { backgroundColor: "#E0F0D9" },
  chipText: { color: "#333", fontFamily: "Montserrat_400Regular" },
  chipTextSelected: { fontFamily: "Montserrat_600SemiBold" },
  /* photo styles removed */
  cta: {
    backgroundColor: "#FDA0E9",
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontFamily: "Montserrat_600SemiBold" },
});
