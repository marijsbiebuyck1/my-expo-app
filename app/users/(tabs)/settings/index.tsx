import { ThemedText } from "@/components/themed-text";
import BgCard from "@/components/ui/bg-card";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { ADMIN_BASE, api } from "../../../_lib/api";
import { manipulateImage } from "../../../lib/imageHelpers";
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
      <ThemedText>{label}</ThemedText>
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
        <ThemedText type="subtitle">{title}</ThemedText>
        {onEdit ? (
          <Pressable onPress={onEdit} style={{ padding: 6 }}>
            <ThemedText style={{ color: "#1a73e8" }}>Bewerk</ThemedText>
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

  const photoUri =
    user &&
    (user.photo ||
      user.photoUrl ||
      user.avatar ||
      user.image ||
      user.profileImage)
      ? String(
          user.photo ||
            user.photoUrl ||
            user.avatar ||
            user.image ||
            user.profileImage
        )
      : null;

  // Normalize display URI: backend may return a relative path like '/uploads/...' or 'uploads/...'
  let displayPhotoUri: string | null = photoUri;
  if (displayPhotoUri && !displayPhotoUri.startsWith("http")) {
    // ensure exactly one slash between ADMIN_BASE and the path
    if (displayPhotoUri.startsWith("/"))
      displayPhotoUri = ADMIN_BASE + displayPhotoUri;
    else displayPhotoUri = ADMIN_BASE + "/" + displayPhotoUri;
  }

  // In dev, log resolved URI to Metro logs (don't render long URIs in the UI)
  try {
    if (typeof global !== "undefined" && (global as any).__DEV__) {
      console.debug("displayPhotoUri ->", displayPhotoUri);
    }
  } catch {}

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

      // Resize & compress the image before upload to reduce payload size.
      // Use centralized helper so behavior is consistent across screens.
      let uploadUri = uri;
      let dataUrl: string | null = null;
      try {
        const manipulated = await manipulateImage(uri, true);
        if (manipulated.uploadUri) uploadUri = manipulated.uploadUri;
        if (manipulated.previewBase64) dataUrl = manipulated.previewBase64;
      } catch (err) {
        console.warn("image manipulation failed, uploading original", err);
      }
      if (!uri) return;

      // build multipart payload
  const uriParts = uploadUri.split("/");
  const fileName = uriParts[uriParts.length - 1];
  const match = fileName.match(/\.([0-9a-zA-Z]+)$/);
      const ext = match ? match[1].toLowerCase() : "jpg";
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";

      // determine id early so we can include it in the multipart form as well
      const id =
        user?.id || user?._id || (await SecureStore.getItemAsync("userId"));
      if (!id) {
        Alert.alert(
          "Fout",
          "Gebruikers-id niet gevonden. Log in en probeer het opnieuw."
        );
        return;
      }

  const form = new FormData();
      // @ts-ignore
      const fileField = {
        uri: Platform.OS === "ios" && uploadUri.startsWith("file://") ? uploadUri : uploadUri,
        name: fileName,
        type: mimeType,
      } as any;
      // append under several common keys to match whatever the backend expects
      form.append("avatar", fileField);
      form.append("image", fileField);
      form.append("file", fileField);
      // some backends look for a 'filename' field as a string
      form.append("filename", fileName);
      // include id hints as form fields too
      form.append("id", String(id));
      form.append("userId", String(id));

      

      // ensure we have an auth token
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Not logged in", "Je bent niet ingelogd. Log in en probeer opnieuw.");
        return;
      }

      // helper: if server response doesn't include a photo field, fetch the fresh user record
      async function hydrateUpdatedUser(maybe: any) {
        const hasPhoto = maybe && (maybe.photo || maybe.photoUrl || maybe.avatar || maybe.image || maybe.profileImage);
        if (hasPhoto) return maybe;
        try {
          const r = await api.get(`/users/${id}`);
          if (!r.ok) return maybe;
          const j = await r.json().catch(() => null);
          const fetched = Array.isArray(j) && j.length > 0 ? j[0] : j?.data || j?.user || j?.result || j;
          return fetched || maybe;
        } catch {
          return maybe;
        }
      }

      setUploading(true);

      // Prefer sending JSON with a data URL if available — many backends expect
      // { profileImage: dataURL } or { filename } instead of multipart. Try
      // JSON first when we have a base64 preview, then fall back to multipart.
      // helper to clear stored auth and redirect to login when the server reports invalid token
      async function handleInvalidToken() {
        try {
          await SecureStore.deleteItemAsync("userToken");
          await SecureStore.deleteItemAsync("user");
          await SecureStore.deleteItemAsync("userId");
        } catch {}
        Alert.alert("Sessie verlopen", "Je sessie is verlopen. Log opnieuw in.", [
          { text: "OK", onPress: () => router.push("/users/login") },
        ]);
      }

      if (dataUrl) {
        try {
          const tryJson = await api.post(`/users/${id}/avatar`, { profileImage: dataUrl });
          if (tryJson.status === 401) {
            await handleInvalidToken();
            setUploading(false);
            return;
          }
          if (tryJson.ok) {
            const j = await tryJson.json().catch(() => null);
            const updated = Array.isArray(j) && j.length > 0 ? j[0] : j?.data || j?.user || j?.result || j;
            if (updated) {
              const finalUser = await hydrateUpdatedUser(updated);
              setUser(finalUser);
              try {
                await SecureStore.setItemAsync("user", JSON.stringify(finalUser));
              } catch {}
            }
            Alert.alert("Klaar", "Profielfoto bijgewerkt.");
            setUploading(false);
            return;
          }
        } catch (e) {
          // continue to multipart fallback below
          console.warn("JSON profileImage upload failed, falling back to multipart", e);
        }
      }

      // If JSON wasn't available or failed, try multipart upload as a fallback
      const resp = await api.post(`/users/${id}/avatar`, form as any);
      if (!resp.ok) {
        // read text to decide on fallback
        const text = await resp.text().catch(() => "");
        let msg = text || `HTTP ${resp.status}`;
        try {
          const parsed = JSON.parse(text);
          msg = parsed.message || JSON.stringify(parsed);
        } catch {}

        if (resp.status === 401 || String(msg).toLowerCase().includes("invalid or expired token")) {
          await handleInvalidToken();
          setUploading(false);
          return;
        }

        // If the server complains about missing file, try additional JSON fallbacks
        const lc = String(msg).toLowerCase();
        if (dataUrl && (lc.includes("no file provided") || lc.includes("profileimage") || lc.includes("no file") || lc.includes("cannot patch users"))) {
          // Some backends expect a JSON body to this same endpoint, e.g. { filename } or { profileImage: dataURL }
          try {
            const jsonTry1 = await api.post(`/users/${id}/avatar`, { filename: fileName });
            if (jsonTry1.ok) {
              const j = await jsonTry1.json().catch(() => null);
              const updated = Array.isArray(j) && j.length > 0 ? j[0] : j?.data || j?.user || j?.result || j;
              if (updated) {
                const finalUser = await hydrateUpdatedUser(updated);
                setUser(finalUser);
                try {
                  await SecureStore.setItemAsync("user", JSON.stringify(finalUser));
                } catch {}
              }
              Alert.alert("Klaar", "Profielfoto bijgewerkt (filename JSON).");
              return;
            }
            // try profileImage:dataURL to the same endpoint as a second JSON attempt
            if (dataUrl) {
              const jsonTry2 = await api.post(`/users/${id}/avatar`, { profileImage: dataUrl });
              if (jsonTry2.ok) {
                const j2 = await jsonTry2.json().catch(() => null);
                const updated2 = Array.isArray(j2) && j2.length > 0 ? j2[0] : j2?.data || j2?.user || j2?.result || j2;
                if (updated2) {
                  const finalUser = await hydrateUpdatedUser(updated2);
                  setUser(finalUser);
                  try {
                    await SecureStore.setItemAsync("user", JSON.stringify(finalUser));
                  } catch {}
                }
                Alert.alert("Klaar", "Profielfoto bijgewerkt (profileImage JSON).");
                return;
              }
            }
            // fall through to more extensive probe below
          } catch (e) {
            console.warn('json avatar fallback failed', e);
            // continue to probe other endpoints
          }
          const probeEndpoints = [
            `/users/${id}/avatar`,
            `/users/${id}/photo`,
            `/users/avatar`,
            `/users/photo`,
            `/users/${id}/upload`,
            `/users/upload`,
          ];

          const probeResults: { endpoint: string; ok: boolean; status: number; body: string }[] = [];

          for (const ep of probeEndpoints) {
            try {
              const r = await api.post(ep, form as any);
              const body = await r.text().catch(() => "");
              probeResults.push({ endpoint: ep, ok: r.ok, status: r.status, body });
              if (r.ok) {
                // success: try parse JSON and update user
                try {
                  const j = JSON.parse(body || "null");
                  const updated = Array.isArray(j) && j.length > 0 ? j[0] : j?.data || j?.user || j?.result || j;
                  if (updated) {
                    const finalUser = await hydrateUpdatedUser(updated);
                    setUser(finalUser);
                    try {
                      await SecureStore.setItemAsync("user", JSON.stringify(finalUser));
                    } catch {}
                  }
                } catch {
                  /* ignore parse errors */
                }
                Alert.alert("Klaar", `Profielfoto bijgewerkt via ${ep}`);
                return;
              }
            } catch (e) {
              probeResults.push({ endpoint: ep, ok: false, status: 0, body: String(e) });
            }
          }

          // If none of the multipart endpoints worked, try JSON fallbacks (PATCH/POST)
          const jsonFallbacks = [
            { method: 'patch', path: `/users`, body: { profileImage: dataUrl } },
            { method: 'patch', path: `/users/${id}`, body: { profileImage: dataUrl } },
            { method: 'post', path: `/users`, body: { id, profileImage: dataUrl } },
            { method: 'patch', path: `/users`, body: { filename: fileName } },
            { method: 'patch', path: `/users/${id}`, body: { filename: fileName } },
          ];

          const jsonResults: { path: string; method: string; ok: boolean; status: number; body: string }[] = [];
          for (const fb of jsonFallbacks) {
            try {
              const r = fb.method === 'patch' ? await api.patch(fb.path, fb.body) : await api.post(fb.path, fb.body);
              const body = await r.text().catch(() => "");
              jsonResults.push({ path: fb.path, method: fb.method, ok: r.ok, status: r.status, body });
              if (r.ok) {
                try {
                  const j = JSON.parse(body || "null");
                  const updated = Array.isArray(j) && j.length > 0 ? j[0] : j?.data || j?.user || j?.result || j;
                  if (updated) {
                    const finalUser = await hydrateUpdatedUser(updated);
                    setUser(finalUser);
                    try { await SecureStore.setItemAsync("user", JSON.stringify(finalUser)); } catch {}
                  }
                } catch {}
                Alert.alert("Klaar", `Profielfoto bijgewerkt via ${fb.method.toUpperCase()} ${fb.path}`);
                return;
              }
            } catch (e) {
              jsonResults.push({ path: fb.path, method: fb.method, ok: false, status: 0, body: String(e) });
            }
          }

          // nothing succeeded — summarize results for debugging
          console.warn('Photo upload probe results', { probeResults, jsonResults, original: { status: resp.status, body: text } });
          const summaryLines: string[] = [];
          probeResults.forEach((p) => summaryLines.push(`${p.endpoint} -> ${p.status}${p.ok ? ' OK' : ''}`));
          jsonResults.forEach((j) => summaryLines.push(`${j.method.toUpperCase()} ${j.path} -> ${j.status}${j.ok ? ' OK' : ''}`));
          Alert.alert('Upload mislukt', `Probe finished. See console logs for details. Summary:\n${summaryLines.join('\n')}`);
          return;
        }

        Alert.alert("Upload mislukt", msg);
        return;
      }

      const json = await resp.json();
      // server may return updated user object or nested shapes
      const updated =
        Array.isArray(json) && json.length > 0
          ? json[0]
          : json.data || json.user || json.result || json;
      if (updated) {
        setUser(updated);
        try {
          await SecureStore.setItemAsync("user", JSON.stringify(updated));
        } catch {}
      }
      Alert.alert("Klaar", "Profielfoto bijgewerkt.");
    } catch (e) {
      console.error("photo upload error", e);
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

            <View style={styles.centerBlock}>
              <ThemedText type="subtitle" style={styles.nameText}>
                {displayName}
                {age ? `, ${age}` : ""}
              </ThemedText>

              {displayPhotoUri ? (
                <Image
                  source={{ uri: displayPhotoUri }}
                  style={styles.avatarLarge}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarLargePlaceholder} />
              )}

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
                    {photoUri ? "Wijzig profielfoto" : "Upload profielfoto"}
                  </ThemedText>
                )}
              </Pressable>
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
              title={`Regio: ${region}`}
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
  screen: { flex: 1, backgroundColor: "#FBF4E2" },
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
  nameText: {
    fontSize: 20,
    marginBottom: 6,
    width: "100%",
    textAlign: "center",
  },
  centerMeta: {
    color: "#333",
    marginBottom: 12,
    width: "100%",
    textAlign: "left",
  },
  avatarLarge: {
    width: 210,
    height: 210,
    borderRadius: 20,
    marginBottom: 18,
    alignSelf: "center",
  },
  avatarLargePlaceholder: {
    width: 210,
    height: 210,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginBottom: 18,
    alignSelf: "center",
  },
  editBtn: {
    backgroundColor: "#FDA0E9",
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 40,
    alignItems: "center",
  },
  editBtnText: { color: "#fff", fontSize: 18 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap" as any },
  chip: {
    backgroundColor: "#EFEFD1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  photoBtn: {
    backgroundColor: "#fff",
    borderColor: "#eee",
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: "center",
    marginBottom: 12,
    width: 220,
  },
  photoBtnText: {
    color: "#333",
    fontFamily: "Montserrat_600SemiBold",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
});

export const options = {
  title: "Profiel",
  tabBarLabel: "Profile",
};
