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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { api } from "../lib/api";

// Admin copy of register-pet — stays within the admin namespace

const speciesOptions = [
  { key: "Hond", label: "🐶 Hond" },
  { key: "Kat", label: "🐱 Kat" },
];
const dogGenders = ["👦 Reu", "👧 Teef"];
const catGenders = ["👦 Kater", "👧 Kattin"];
const ageRanges = ["> 1 jaar", "1 - 5 jaar", "5 - 10 jaar", "<10 jaar"];
const featureChips = [
  "🚽 Zindelijk",
  "👮 Kent basiscommando's",
  "✂️ Gecastreerd",
  "🚗 Kan in de auto",
  "🏠 Kan alleen zijn",
  "👩‍🏫 Ervaring vereist",
];

export default function AdminRegisterPet() {
  const router = useRouter();
  const [species, setSpecies] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [breed, setBreed] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleFeature(f: string) {
    setFeatures((prev) =>
      prev.includes(f) ? prev.filter((p) => p !== f) : [...prev, f]
    );
  }

  async function onSave() {
    setLoading(true);
    try {
      let shelterId = await SecureStore.getItemAsync("adminId");
      const rawAdmin = await SecureStore.getItemAsync("admin");
      if (!shelterId && rawAdmin) {
        try {
          const parsed = JSON.parse(rawAdmin);
          shelterId = parsed?.id ?? parsed?._id ?? null;
        } catch {
          // noop
        }
      }

      if (!shelterId) {
        Alert.alert(
          "Fout",
          "Kon je admin-id niet vinden. Log in en probeer opnieuw."
        );
        return;
      }

      const preferredSpecies = species ? [species] : [];
      const animalType = species
        ? species.toLowerCase().includes("hond")
          ? "dog"
          : species.toLowerCase().includes("kat")
          ? "cat"
          : species.toLowerCase()
        : undefined;
      const characteristics = features.length ? features : undefined;
      const notesParts: string[] = [];
      if (breed) notesParts.push(`breed:${breed}`);
      if (ageRange) notesParts.push(`age:${ageRange}`);

      const preferencesPayload: any = {};
      if (preferredSpecies.length)
        preferencesPayload.preferredSpecies = preferredSpecies;
      if (animalType) preferencesPayload.animalType = animalType;
      if (characteristics) preferencesPayload.characteristics = characteristics;
      if (notesParts.length) preferencesPayload.notes = notesParts.join(" | ");

      console.debug("PATCH admin pet preferences ->", {
        shelterId,
        preferencesPayload,
      });

      // send preferences to admin backend route (use api helper with isAdmin=true)
      const resp = await api.patch(
        `/asielen/${shelterId}/preferences`,
        preferencesPayload,
        true
      );

      const respText = await resp.text();
      console.debug("PATCH admin petPreference response", {
        status: resp.status,
        body: respText,
      });
      if (!resp.ok) {
        console.error("Failed to save admin pet preference", {
          status: resp.status,
          body: respText,
        });
        throw new Error(respText || `HTTP ${resp.status}`);
      }

      try {
        const json = await resp.json();
        console.debug("Saved admin after petPreference", json);
        if (json && typeof json === "object") {
          await SecureStore.setItemAsync("admin", JSON.stringify(json));
          if (json.id || json._id) {
            await SecureStore.setItemAsync(
              "adminId",
              String(json.id ?? json._id)
            );
          }
        }
      } catch {
        console.debug("No JSON body returned from admin petPreference PATCH");
      }

      // success -> continue to admin home registration
      router.replace("/admin/register-home" as any);
    } catch (err) {
      console.error("save admin pet error", err);
      Alert.alert(
        "Fout",
        (err as any)?.message || "Kon voorkeuren niet opslaan."
      );
    } finally {
      setLoading(false);
    }
  }

  const genders =
    species === "Hond" ? dogGenders : species === "Kat" ? catGenders : [];

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="dark" backgroundColor="#FBF4E2" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText type="title" style={styles.title}>
          Wat zoek je in je nieuwe huisgenoot?
        </ThemedText>

        <Text style={styles.sectionLabel}>Welk dier wil je?</Text>
        <View style={styles.chipsRow}>
          {speciesOptions.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.chip, species === s.key && styles.chipSelected]}
              onPress={() => {
                setSpecies(s.key);
                setGender(null); // reset gender when species changes
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  species === s.key && styles.chipTextSelected,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {species && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>
              Geslacht
            </Text>
            <View style={styles.chipsRow}>
              {genders.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, gender === g && styles.chipSelected]}
                  onPress={() => setGender(g)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      gender === g && styles.chipTextSelected,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Leeftijd</Text>
        <View style={styles.chipsRow}>
          {ageRanges.map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.chip, ageRange === a && styles.chipSelected]}
              onPress={() => setAgeRange(a)}
            >
              <Text
                style={[
                  styles.chipText,
                  ageRange === a && styles.chipTextSelected,
                ]}
              >
                {a}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>
          Welk ras zoek je?
        </Text>
        <TextInput
          value={breed}
          onChangeText={setBreed}
          placeholder="Bijv. Labrador"
          style={styles.input}
        />

        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>
          Eigenschappen
        </Text>
        <View style={styles.chipsRow}>
          {featureChips.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, features.includes(f) && styles.chipSelected]}
              onPress={() => toggleFeature(f)}
            >
              <Text
                style={[
                  styles.chipText,
                  features.includes(f) && styles.chipTextSelected,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />

        <TouchableOpacity
          style={styles.cta}
          onPress={onSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Verder</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBF4E2" },
  container: { padding: 24 },
  title: {
    fontSize: 22,
    marginBottom: 18,
    fontFamily: "MontserratAlternates-SemiBold",
    color: "#3F3F3F",
  },
  sectionLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: "#333",
    fontFamily: "Montserrat_700Bold",
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  chip: {
    backgroundColor: "#EFEFD1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 0,
    marginBottom: 2,
  },
  chipSelected: { backgroundColor: "#E0F0D9" },
  chipText: { color: "#333", fontFamily: "Montserrat_400Regular" },
  chipTextSelected: { fontFamily: "Montserrat_600SemiBold" },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#eee",
    fontFamily: "Montserrat_400Regular",
    marginBottom: 8,
  },
  cta: {
    backgroundColor: "#FDA0E9",
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontFamily: "Montserrat_600SemiBold" },
});
