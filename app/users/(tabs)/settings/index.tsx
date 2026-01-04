import { ThemedText } from "@/components/themed-text";
import BgCard from "@/components/ui/bg-card";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { api } from "../../../_lib/api";
function calculateAge(birthdate?: string | number | null) {
  if (!birthdate) return null;
  const year =
    typeof birthdate === "number"
      ? birthdate
      : String(birthdate).match(/(\d{4})/)?.[1];
  if (!year) return null;
  const now = new Date();
  return now.getFullYear() - Number(year);
}

function mapSpeciesLabel(raw?: string) {
  if (!raw) return "Onbekend";
  const v = String(raw).toLowerCase();
  if (v.includes("hond") || v.includes("dog")) return "🐶 Hond";
  if (v.includes("kat") || v.includes("cat")) return "🐱 Kat";
  if (v.includes("konijn") || v.includes("rabbit")) return "🐰 Konijn";
  return String(raw).charAt(0).toUpperCase() + String(raw).slice(1);
}

function mapHomePetLabel(raw?: string) {
  if (!raw) return "-";
  const v = String(raw).toLowerCase();
  if (v.includes("andere")) return "🐾 Andere dieren";
  if (v.includes("geen")) return "🚫 Geen andere dieren";
  if (v.includes("hond") || v.includes("dog")) return "🐶 Hond";
  if (v.includes("kat") || v.includes("cat")) return "🐱 Kat";
  if (v.includes("konijn") || v.includes("rabbit")) return "🐰 Konijn";
  return String(raw).charAt(0).toUpperCase() + String(raw).slice(1);
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <ThemedText style={styles.chipText} numberOfLines={2} ellipsizeMode="tail">
        {label}
      </ThemedText>
    </View>
  );
}

function Section({
  title,
  children,
  onEdit,
}: {
  title: string;
  children?: any;
  onEdit?: () => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            style={({ pressed }) => [
              styles.editIconBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
          </Pressable>
        ) : null}
      </View>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync("user");
        if (!mounted) return;
        if (raw) {
          try {
            setUser(JSON.parse(raw));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }

        // Try to fetch fresh user data from the backend if we have an id/token
        try {
          const parsed = raw ? JSON.parse(raw) : null;
          const storedId = parsed?.id || parsed?._id || (await SecureStore.getItemAsync("userId"));
          const token = await SecureStore.getItemAsync("userToken");
          if (storedId && token) {
            const resp = await api.get(`/users/${storedId}`);
            if (resp.ok) {
              const payload = await resp.json().catch(() => null);
              const fetchedUser = Array.isArray(payload) && payload.length > 0
                ? payload[0]
                : payload?.data || payload?.user || payload;
              if (fetchedUser && mounted) {
                setUser(fetchedUser);
                try {
                  await SecureStore.setItemAsync("user", JSON.stringify(fetchedUser));
                } catch {}
              }
            }
          }
        } catch (err) {
          console.warn("Failed to fetch user from API", err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <LogoHeader />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(user?.birthdate || user?.birthYear || null);
  const displayName = user?.name || user?.displayName || "-";
  // region is shown below in its Section; email is intentionally not displayed here
  const region = user?.region || user?.city || "-";

  const interests = user?.interests || {
    employment: user?.employmentLabels || [],
    freeTime: user?.freeTime || [],
    household: user?.householdCompanions || [],
  };

  const preferences = user?.preferences || user?.petPreferences || {};
  const home = user?.home || {};

  const photoUri = user.profileImage;

  console.log("photoUri ->", photoUri);

  function createPetPreferenceChips(preferredSpecies: any[] = []) {
    const chips: any[] = [];

    preferredSpecies.forEach((entry: any, idx: number) => {
      if (!entry && entry !== 0) return;

      // If entry is a simple string, try to clean common prefixes like 'breed:', 'ras:', 'age:' etc.
      if (typeof entry === "string") {
        const cleaned = String(entry)
          .replace(/^(breed|ras|age)[:\-\s]+/i, "")
          .trim();
        // If the cleaned value looks like a number (age), show as age chip, otherwise treat as species/breed
        if (/^\d+$/.test(cleaned)) {
          chips.push(<Chip key={`pet-age-${idx}`} label={`${cleaned} jaar`} />);
        } else {
          // show species/breed without extra prefix; try species mapping first
          chips.push(
            <Chip key={`pet-species-${idx}`} label={mapSpeciesLabel(cleaned)} />
          );
        }
        return;
      }

      // If entry is an object, extract common keys
      if (typeof entry === "object") {
        const species =
          entry.species || entry.type || entry.animal || entry.ras;
        const breed = entry.breed || entry.ras || entry.breedName || null;
        const age = entry.age || entry.years || entry.leeftijd || null;

        // Species chip (use emoji mapping)
        if (species) {
          chips.push(
            <Chip key={`pet-species-${idx}`} label={mapSpeciesLabel(species)} />
          );
        }

        // Breed chip (show raw breed value only, no 'breed' prefix)
        if (breed) {
          const b = String(breed)
            .replace(/^(breed|ras)[:\-\s]+/i, "")
            .trim();
          if (b) chips.push(<Chip key={`pet-breed-${idx}`} label={`${b}`} />);
        }

        // Age chip (show as 'N jaar' or raw if non-numeric)
        if (age !== undefined && age !== null && age !== "") {
          const ageStr = String(age).trim();
          if (/^\d+$/.test(ageStr))
            chips.push(
              <Chip key={`pet-age-${idx}`} label={`${ageStr} jaar`} />
            );
          else chips.push(<Chip key={`pet-age-${idx}`} label={ageStr} />);
        }

        return;
      }

      // fallback: render stringified
      chips.push(<Chip key={`pet-fallback-${idx}`} label={String(entry)} />);
    });

    return chips;
  }

  async function pickAndUploadPhoto() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Toestemming nodig",
          "Geef toegang tot je foto's om een profielfoto te kiezen."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.7,
      });

      const wasCancelled =
        (result as any).cancelled ?? (result as any).canceled ?? false;
      if (wasCancelled) return;

      // new expo returns assets array
      // @ts-ignore
      const uri =
        (result.assets && result.assets[0] && result.assets[0].uri) ||
        (result as any).uri;
      if (!uri) return;

      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 600 } }],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      if (!manipulated.base64) {
        Alert.alert("Fout", "Kon afbeelding niet verwerken.");
        return;
      }

      const base64Image = `data:image/jpeg;base64,${manipulated.base64}`;
      const id =
        user?.id || user?._id || (await SecureStore.getItemAsync("userId"));
      if (!id) {
        Alert.alert(
          "Fout",
          "Gebruikers-id niet gevonden. Log in en probeer het opnieuw."
        );
        return;
      }

      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert(
          "Not logged in",
          "Je bent niet ingelogd. Log in en probeer opnieuw."
        );
        return;
      }

      setUploading(true);

      const response = await api.post(`/users/${id}/avatar`, {
        profileImage: base64Image,
      });
      if (!response.ok) {
        const message =
          (await response.text().catch(() => "")) ||
          "Profielfoto bijwerken mislukt.";
        throw new Error(message);
      }

      const payload = await response.json().catch(() => null);
      const updatedUser =
        Array.isArray(payload) && payload.length > 0
          ? payload[0]
          : payload?.data || payload?.user || payload?.result || payload;

      if (updatedUser) {
        setUser(updatedUser);
        try {
          await SecureStore.setItemAsync("user", JSON.stringify(updatedUser));
        } catch {}
      }

      Alert.alert("Klaar", "Profielfoto bijgewerkt.");
    } catch (error) {
      console.error("photo upload error", error);
      Alert.alert("Fout", "Er is iets misgegaan bij het uploaden van de foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <LogoHeader />

      <ScrollView contentContainerStyle={styles.pageContainer}>
        <BgCard style={styles.bgCard}>
          <ScrollView
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="title" style={styles.pageTitle}>
              Profiel
            </ThemedText>

            <View style={styles.centerRow}>
              <View style={styles.avatarColumn}>
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.avatarLarge}
                    resizeMode="cover"
                  />
                ) : (
                  <Pressable
                    onPress={pickAndUploadPhoto}
                    style={styles.avatarLargePlaceholder}
                  >
                    <Ionicons name="add" size={28} color="#AEBA40" />
                  </Pressable>
                )}
              </View>

              <View style={styles.nameColumn}>
                <ThemedText type="subtitle" style={styles.nameText}>
                  {displayName}
                </ThemedText>
                {age ? (
                  <ThemedText style={styles.ageText}>{`${age} jaar`}</ThemedText>
                ) : null}
              </View>
            </View>

            <View style={styles.avatarBtnWrapper}>
              <View style={{ width: 120, alignItems: "center" }}>
                <Pressable
                  style={({ pressed }) => [
                    styles.photoBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={pickAndUploadPhoto}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator />
                  ) : (
                    <ThemedText style={styles.photoBtnText}>
                      {photoUri ? "Wijzig" : "Upload"}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
              <View style={{ flex: 1 }} />
            </View>

            <View style={{ height: 12 }} />

            <Section
              title="Mijn interesses"
              onEdit={() => router.push("/users/register-interests")}
            >
              {interests ? (
                <View style={styles.chipsRow}>
                  {(interests.employment || []).map((c: string) => (
                    <Chip key={String(c)} label={String(c)} />
                  ))}
                  {(interests.freeTime || []).map((c: string) => (
                    <Chip key={String(c)} label={String(c)} />
                  ))}
                  {(interests.household || []).map((c: string) => (
                    <Chip key={String(c)} label={String(c)} />
                  ))}
                </View>
              ) : (
                <ThemedText>Geen interesses opgeslagen.</ThemedText>
              )}
            </Section>

            <Section
              title="Wat ik zoek"
              onEdit={() => router.push("/users/register-pet")}
            >
              {preferences ? (
                <View style={styles.chipsRow}>
                  {createPetPreferenceChips(preferences.preferredSpecies || [])}
                  {(preferences.characteristics || []).map((c: string) => (
                    <Chip key={String(c)} label={String(c)} />
                  ))}
                  {preferences.notes ? (
                    <Chip label={String(preferences.notes)} />
                  ) : null}
                </View>
              ) : (
                <ThemedText>Geen voorkeuren opgeslagen.</ThemedText>
              )}
            </Section>

            <Section
              title="Thuissituatie"
              onEdit={() => router.push("/users/register-home")}
            >
              {home ? (
                <View>
                  <View style={styles.chipsRow}>
                    {typeof home.garden !== "undefined" ? (
                      <Chip
                        label={home.garden ? "🌿 Tuin: Ja" : "🚫 Tuin: Nee"}
                      />
                    ) : null}

                    {typeof home.children !== "undefined" ? (
                      <Chip
                        label={
                          home.children
                            ? `👶 Kinderen: ${home.children}`
                            : "👶 Geen kinderen"
                        }
                      />
                    ) : null}

                    {(home.otherPets || []).length > 0
                      ? (home.otherPets || []).map((h: string, i: number) => (
                          <Chip
                            key={`${String(h)}-${i}`}
                            label={mapHomePetLabel(h)}
                          />
                        ))
                      : null}
                  </View>
                </View>
              ) : (
                <ThemedText>Geen thuissituatie opgeslagen.</ThemedText>
              )}
            </Section>

            <Section
              title={`Regio`}
              onEdit={() => router.push("/users/register-owner")}
            >
              <ThemedText>{region}</ThemedText>
            </Section>

            <View style={{ height: 40 }} />
          </ScrollView>
        </BgCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFCF5" },
  container: { padding: 20 },
  // page container centers the white card on the screen
  pageContainer: { padding: 20, alignItems: "center" },
  // white background card dimensions and shadow
  bgCard: {
    width: 343,
    height: 666,
    paddingTop: 45,
    paddingRight: 15,
    paddingBottom: 15,
    paddingLeft: 15,
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    borderRadius: 20,
    backgroundColor: "#FFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: -1, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 23.4,
    elevation: 6,
  },
  cardContent: {
    width: "100%",
    flexDirection: "column",
    alignItems: "flex-start",
    paddingBottom: 10,
  },
  pageTitle: {
    marginTop: 6,
    marginBottom: 50,
    width: "100%",
    textAlign: "left",
  },
  centerBlock: { alignItems: "center", marginBottom: 8, width: "100%" },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  avatarColumn: {
    alignItems: "center",
    marginRight: 14,
    width: 120,
  },
  nameColumn: {
    flex: 1,
    justifyContent: "center",
  },
  nameText: {
    fontSize: 16,
    marginBottom: 6,
    textAlign: "left",
  },
  ageText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  avatarBtnWrapper: {
    width: "100%",
    flexDirection: "row",
    marginTop: 6,
    marginBottom: 8,
  },
  centerMeta: {
    color: "#333",
    marginBottom: 12,
    width: "100%",
    textAlign: "left",
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginBottom: 2,
    alignSelf: "center",
  },
  avatarLargePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 0,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    backgroundColor: "#037D4E",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 40,
    alignItems: "center",
  },
  editBtnText: { color: "#fff", fontSize: 18 },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap" as any,
    alignItems: "flex-start",
    width: "100%",
  },
  chip: {
    backgroundColor: "#EFEFD1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: 240,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    overflow: "hidden",
  },
  chipText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
    textAlign: "center",
  },
  photoBtn: {
    backgroundColor: "transparent",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 12,
    alignSelf: "center",
  },
  photoBtnText: {
    color: "0000",
    fontFamily: "Montserrat_600SemiBold",
    textDecorationLine: "underline",
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  sectionTitle: {
    fontSize: 16,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 36,
    backgroundColor: "#AEBA40",
    alignItems: "center",
    justifyContent: "center",
  },
});

export const options = {
  title: "Profiel",
  tabBarLabel: "Profile",
};
