import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import {
  GestureHandlerRootView,
  RectButton,
  Swipeable,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import CameraCapture from "../../../../components/camera-capture";
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import { api } from "../../../_lib/api";
import { useAdminAuth } from "../../../_lib/useAuth";

export default function AnimalsScreen() {
  const { admin } = useAdminAuth();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [step, setStep] = useState(1);
  const [editingAnimal, setEditingAnimal] = useState<any | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoPayload, setPhotoPayload] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [species, setSpecies] = useState<"cat" | "dog" | "" | null>(null);
  const [gender, setGender] = useState<"male" | "female" | "" | null>(null);
  const [breed, setBreed] = useState("");
  const [description, setDescription] = useState("");
  const [properties, setProperties] = useState<string[]>([]);
  const [whoProperties, setWhoProperties] = useState<string[]>([]);
  // home-situation labels (extra step)
  const [hasGarden, setHasGarden] = useState<boolean | null>(null);
  const [canWithCats, setCanWithCats] = useState(false);
  const [canWithDogs, setCanWithDogs] = useState(false);
  const [canWithRodents, setCanWithRodents] = useState(false);
  const [kidsOption, setKidsOption] = useState<
    "no" | "young" | "between" | null
  >(null);
  const [catTypes, setCatTypes] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);

  async function pickImage() {
    try {
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) {
        Alert.alert(
          "Permission required",
          "We need access to your photos to upload a picture."
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (res.canceled) return;
      const uri = res.assets && res.assets[0] && res.assets[0].uri;
      if (!uri) return;

      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 600 } }],
        {
          compress: 0.6,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!manipulated.base64) {
        Alert.alert("Fout", "Kon afbeelding niet verwerken.");
        return;
      }

      const dataUrl = `data:image/jpeg;base64,${manipulated.base64}`;
      setPhotoPreview(dataUrl);
      setPhotoPayload(dataUrl);
    } catch (err) {
      console.warn(err);
      Alert.alert("Fout", "Kon afbeelding niet verwerken.");
    }
  }

  async function takePhoto() {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission required",
          "We need camera access to take a photo."
        );
        return;
      }
      setCameraVisible(true);
    } catch (err) {
      console.warn(err);
    }
  }

  function resetForm() {
    setEditingAnimal(null);
    setPhotoPreview(null);
    setPhotoPayload(null);
    setName("");
    setDay("");
    setMonth("");
    setYear("");
    setSpecies(null);
    setGender(null);
    setBreed("");
    setDescription("");
    setProperties([]);
    setWhoProperties([]);
    setStep(1);

    // reset stap 4
    setHasGarden(null);
    setCanWithCats(false);
    setCanWithDogs(false);
    setCanWithRodents(false);
    setKidsOption(null);
    setCatTypes([]);
  }

  function buildBirthdate(): string | null {
    const d = parseInt(day || "", 10);
    const m = parseInt(month || "", 10);
    const y = parseInt(year || "", 10);
    if (!y || !m || !d) return null;
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  async function submitAnimal() {
    const isEditing = Boolean(editingAnimal);

    if (!name)
      return Alert.alert("Veld ontbreekt", "Vul de naam van het dier in.");
    if (!species)
      return Alert.alert(
        "Veld ontbreekt",
        "Kies of het dier een kat of een hond is."
      );

    const birth = buildBirthdate();
    if (!birth)
      return Alert.alert(
        "Veld ontbreekt",
        "Vul een geldige geboortedatum in (DD MM YYYY)."
      );

    if (!gender) return Alert.alert("Veld ontbreekt", "Kies geslacht.");
    if (!photoPreview && !photoPayload)
      return Alert.alert("Veld ontbreekt", "Upload een foto van het dier.");

    // Backend eist description bij CREATE
    const normalizedDescription = description.trim();
    if (!isEditing && !normalizedDescription) {
      return Alert.alert("Veld ontbreekt", "Vul een beschrijving in.");
    }

    setSubmitting(true);
    try {
      let shelterId: string | null = null;
      if (!isEditing) {
        if (admin)
          shelterId = String(
            (admin as any)._id ??
              (admin as any).id ??
              (admin as any).shelterId ??
              (admin as any).adminId ??
              null
          );

        if (!shelterId) {
          const raw = await SecureStore.getItemAsync("admin");
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              shelterId = String(
                parsed._id ??
                  parsed.id ??
                  parsed.shelterId ??
                  parsed.adminId ??
                  null
              );
            } catch {}
          }
        }

        if (!shelterId) {
          const direct = await SecureStore.getItemAsync("adminId");
          if (direct) shelterId = direct;
        }

        if (!shelterId) {
          return Alert.alert(
            "Veld ontbreekt",
            "Geen shelter gevonden. Log in als asiel en probeer opnieuw."
          );
        }
      }

      const payload: Record<string, any> = {
        name,
        birthdate: birth,
        description: normalizedDescription,
      };

      if (!isEditing) payload.shelterId = shelterId;

      // Foto: alleen meesturen als nieuw gekozen/genomen (edit behoudt bestaande)
      if (!isEditing || photoPayload) {
        if (photoPayload) payload.image = photoPayload;
      }

      const attributes: Record<string, any> = {};

      // required-ish in jouw UI
      attributes.species = species;
      attributes.sex = gender;

      if (breed || isEditing) attributes.breed = breed || "";

      if (properties.length > 0 || isEditing) attributes.traits = properties;

      if (whoProperties.length > 0) attributes.notes = whoProperties.join(", ");
      else if (isEditing) attributes.notes = "";

      // gardenAccess (backend)
      if (hasGarden !== null || isEditing)
        attributes.gardenAccess = Boolean(hasGarden);

      // otherAnimals (backend)
      const otherAnimals: string[] = [];
      if (canWithCats) otherAnimals.push("cats");
      if (canWithDogs) otherAnimals.push("dogs");
      if (canWithRodents) otherAnimals.push("rodents");
      if (otherAnimals.length > 0 || isEditing)
        attributes.otherAnimals = otherAnimals;

      // childrenCompatibility (backend)
      const kidsBackend = mapKidsOptionToBackend(kidsOption);

      // CREATE: default "no" als niets gekozen
      if (!isEditing) {
        attributes.childrenCompatibility = kidsBackend ?? "no";
      } else {
        // EDIT: alleen updaten als user iets gekozen heeft
        if (kidsBackend !== null)
          attributes.childrenCompatibility = kidsBackend;
      }

      // catType (backend) - alleen relevant voor kat
      const catTypeBackend =
        species === "cat" ? mapCatTypesToBackend(catTypes) : null;

      // CREATE: enkel meesturen als gekozen
      // EDIT: enkel meesturen als gekozen (anders niets overschrijven)
      if (catTypeBackend) attributes.catType = catTypeBackend;

      payload.attributes = attributes;

      let endpoint = "/animals";
      if (isEditing) {
        const targetId = editingAnimal?._id ?? editingAnimal?.id;
        if (!targetId) throw new Error("Kan dier niet identificeren.");
        endpoint = `/animals/${String(targetId)}`;
      }
      const method = isEditing ? api.patch : api.post;

      const res = await method(endpoint, payload, true);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Status ${res.status}`);
      }
      await res.json().catch(() => null);

      Alert.alert(
        isEditing ? "Bijgewerkt" : "Klaar",
        isEditing ? "Dier succesvol aangepast." : "Dier succesvol toegevoegd."
      );
      await fetchAnimals();
      closeModal();
    } catch (err: any) {
      console.warn("Save animal failed", err);
      Alert.alert("Opslaan mislukt", String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  const resolveShelterId = useCallback(async (): Promise<string | null> => {
    const pickId = (candidate: any): string => {
      if (!candidate) return "";
      if (typeof candidate === "string" || typeof candidate === "number") {
        return String(candidate).trim();
      }

      if (candidate.shelter) {
        const nested = pickId(candidate.shelter);
        if (nested) return nested;
      }

      const raw = (candidate._id ??
        candidate.id ??
        candidate.shelterId ??
        candidate.shelterID ??
        candidate.adminId ??
        candidate.ownerId ??
        "") as string | number;
      return raw ? String(raw).trim() : "";
    };

    const fromAdmin = pickId(admin);
    if (fromAdmin) return fromAdmin;

    try {
      const raw = await SecureStore.getItemAsync("admin");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const parsedId = pickId(parsed);
          if (parsedId) return parsedId;
        } catch {}
      }
    } catch {}

    try {
      const direct = await SecureStore.getItemAsync("adminId");
      if (direct) return String(direct).trim();
    } catch {}

    return null;
  }, [admin]);

  const fetchAnimals = useCallback(async () => {
    setLoadingAnimals(true);
    try {
      const shelterId = await resolveShelterId();
      if (!shelterId) {
        Alert.alert(
          "Geen shelter gevonden",
          "Log opnieuw in als asiel om jouw dieren te zien."
        );
        setAnimals([]);
        return;
      }
      const endpoint = `/animals?shelterId=${encodeURIComponent(shelterId)}`;
      const res = await api.get(endpoint, true);
      if (!res.ok) {
        const t = await res.text();
        console.warn("Failed to fetch animals", t || res.status);
        setAnimals([]);
        return;
      }
      const json = await res.json().catch(() => null);
      if (Array.isArray(json)) setAnimals(json as any[]);
      else setAnimals([]);
    } catch (err) {
      console.warn("Fetch animals error", err);
      setAnimals([]);
    } finally {
      setLoadingAnimals(false);
    }
  }, [resolveShelterId]);

  async function deleteAnimal(id: string) {
    Alert.alert(
      "Verwijderen",
      "Weet je zeker dat je dit dier wilt verwijderen?",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijder",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await api.del(`/animals/${id}`, true);
              if (!res.ok) {
                const t = await res.text().catch(() => null);
                throw new Error(t || `Status ${res.status}`);
              }
              await fetchAnimals();
              Alert.alert("Verwijderd", "Het dier is verwijderd.");
            } catch (err: any) {
              console.warn("Delete animal failed", err);
              Alert.alert("Fout", String(err?.message || err));
            }
          },
        },
      ]
    );
  }

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  const isEditing = Boolean(editingAnimal);
  const modalTitle = isEditing ? "Dier bewerken" : "Dier toevoegen";

  const propertyOptions = [
    "🚽Zindelijk",
    "✂️ Gecastreerd",
    "🤓 Kent basiscommando's",
    "🚗 Kan in de auto",
    "🏠 Kan alleen zijn",
    "👩‍🏫 Ervaring vereist",
  ];

  const whoWorkOptions = [
    "💻 Telewerk",
    "✈️ Vaak reizen",
    "🕘 9-to-5",
    "🎓 Nog op school",
    "🧓 Op pensioen",
  ];
  const whoHobbyOptions = [
    "🚶 Wandelen",
    "🏋️ Sporten",
    "✈️ Op vakantie gaan",
    "📺 Series",
    "🍻 Terrasje",
  ];
  const whoLivingOptions = [
    "👪 Gezin",
    "🏠 Alleen",
    "🛋️ Met roomies",
    "❤️ Met partner",
  ];

  function normalizeSpecies(value?: string | null): "cat" | "dog" | null {
    if (!value) return null;
    const v = String(value).toLowerCase();
    if (v.includes("cat") || v.includes("kat")) return "cat";
    if (v.includes("dog") || v.includes("hond")) return "dog";
    return null;
  }

  function normalizeGender(value?: string | null): "male" | "female" | null {
    if (!value) return null;
    const v = String(value).toLowerCase();
    if (
      v === "m" ||
      v.includes("male") ||
      v.includes("reu") ||
      v.includes("kater")
    ) {
      return "male";
    }
    if (
      v === "f" ||
      v.includes("female") ||
      v.includes("teef") ||
      v.includes("katt")
    ) {
      return "female";
    }
    return null;
  }

  function mapKidsOptionToBackend(
    v: "no" | "young" | "between" | null
  ): "no" | "younger_than_6" | "6_to_14" | null {
    if (!v) return null;
    if (v === "no") return "no";
    if (v === "young") return "younger_than_6";
    return "6_to_14";
  }

  function mapKidsOptionFromBackend(v: any): "no" | "young" | "between" | null {
    const s = typeof v === "string" ? v : "";
    if (!s) return null;
    if (s === "no") return "no";
    if (s === "younger_than_6") return "young";
    if (s === "6_to_14") return "between";
    return null;
  }

  function mapCatTypesToBackend(
    catTypes: string[]
  ): "indoor" | "outdoor" | "cuddle" | "farm" | null {
    const first = catTypes?.[0];
    if (!first) return null;

    if (first === "Binnenkat") return "indoor";
    if (first === "Buitenkat") return "outdoor";
    if (first === "Knuffelkat") return "cuddle";
    if (first === "Boerderijkat") return "farm";
    return null;
  }

  function mapCatTypeFromBackend(v: any): string[] {
    if (typeof v !== "string") return [];
    if (v === "indoor") return ["Binnenkat"];
    if (v === "outdoor") return ["Buitenkat"];
    if (v === "cuddle") return ["Knuffelkat"];
    if (v === "farm") return ["Boerderijkat"];
    return [];
  }

  function extractWhoPreferences(animal: any): string[] {
    if (!animal) return [];
    if (Array.isArray(animal.whoProperties))
      return animal.whoProperties.map(String);
    const attrs = animal.attributes || {};
    if (Array.isArray(attrs.whoProperties))
      return attrs.whoProperties.map(String);
    return splitNotesFromValue(attrs.notes);
  }

  function splitNotesFromValue(value?: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((entry) => String(entry));
    return String(value)
      .split(/[\n;,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function toggleWhoProperty(key: string) {
    setWhoProperties((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function toggleProperty(key: string) {
    setProperties((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function openCreateModal() {
    resetForm();
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    resetForm();
  }

  function beginEditAnimal(animal: any) {
    resetForm();
    if (!animal) return;

    setEditingAnimal(animal);
    const attrs = animal.attributes || {};

    const birth = animal.birthdate ? new Date(animal.birthdate) : null;
    if (birth && !Number.isNaN(birth.getTime())) {
      setDay(String(birth.getUTCDate()).padStart(2, "0"));
      setMonth(String(birth.getUTCMonth() + 1).padStart(2, "0"));
      setYear(String(birth.getUTCFullYear()));
    } else {
      setDay("");
      setMonth("");
      setYear("");
    }

    setName(animal.name || "");
    setBreed(attrs.breed || animal.breed || "");
    setDescription(
      typeof animal.description === "string" ? animal.description : ""
    );
    setSpecies(normalizeSpecies(attrs.species || animal.species));

    const genderRaw =
      attrs.sex ?? attrs.gender ?? animal.sex ?? animal.gender ?? null;
    setGender(normalizeGender(genderRaw));

    setProperties(
      Array.isArray(attrs.traits) ? attrs.traits.map((t: any) => String(t)) : []
    );
    setWhoProperties(extractWhoPreferences(animal));

    // gardenAccess (backend)
    setHasGarden(
      typeof attrs.gardenAccess === "boolean" ? attrs.gardenAccess : null
    );

    // otherAnimals (backend)
    const oa = Array.isArray(attrs.otherAnimals)
      ? attrs.otherAnimals.map(String)
      : [];
    setCanWithCats(oa.includes("cats"));
    setCanWithDogs(oa.includes("dogs"));
    setCanWithRodents(oa.includes("rodents"));

    // childrenCompatibility (backend)
    setKidsOption(mapKidsOptionFromBackend(attrs.childrenCompatibility));

    // catType (backend)
    setCatTypes(mapCatTypeFromBackend(attrs.catType));

    const existingPhoto =
      typeof animal.photo === "string" && animal.photo ? animal.photo : null;
    setPhotoPreview(existingPhoto);
    setPhotoPayload(null);

    setStep(1);
    setModalVisible(true);
  }

  function renderSwipeActions(item: any) {
    const id = String(item._id ?? item.id ?? "");
    return (
      <View style={styles.swipeActions}>
        <RectButton
          style={[styles.swipeActionButton, styles.swipeMoreButton]}
          onPress={() => {
            router.push({
              pathname: "/admin/[animalId]/chats",
              params: { animalId: id },
            } as any);
          }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={20}
            color="#4b5563"
          />
          <ThemedText
            style={[styles.swipeActionText, styles.swipeActionTextDark]}
          >
            Chats
          </ThemedText>
        </RectButton>

        <RectButton
          style={[styles.swipeActionButton, styles.swipeDeleteButton]}
          onPress={() => deleteAnimal(id)}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <ThemedText style={styles.swipeActionText}>Verwijder</ThemedText>
        </RectButton>

        <RectButton
          style={[styles.swipeActionButton, styles.swipeEditButton]}
          onPress={() => beginEditAnimal(item)}
        >
          <Ionicons name="pencil-outline" size={20} color="#fff" />
          <ThemedText style={styles.swipeActionText}>Bewerk</ThemedText>
        </RectButton>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
        <LogoHeader />
        <View style={styles.root}>
          <View style={styles.root}>
            <View style={styles.fixedTop}>
              <View style={styles.headerRow}>
                <ThemedText type="title">Jouw dieren 🐾</ThemedText>
              </View>

              <TouchableOpacity
                style={styles.addButtonFull}
                onPress={openCreateModal}
              >
                <ThemedText
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  + Dier toevoegen
                </ThemedText>
              </TouchableOpacity>
            </View>

            {loadingAnimals ? (
              <View style={styles.emptyState}>
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={animals}
                keyExtractor={(item) =>
                  String(item._id ?? item.id ?? item.name)
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const id = String(item._id ?? item.id ?? "");
                  const photoUri =
                    typeof item.photo === "string" && item.photo
                      ? item.photo
                      : null;
                  const descriptionSnippet =
                    typeof item.description === "string"
                      ? item.description.trim()
                      : "";

                  return (
                    <Swipeable
                      renderRightActions={() => renderSwipeActions(item)}
                      overshootRight={false}
                      friction={2}
                      rightThreshold={40}
                    >
                      <View style={styles.swipeRowContainer}>
                        <TouchableOpacity
                          style={styles.animalRow}
                          onPress={() => {
                            router.push({
                              pathname: "/admin/[animalId]/chats",
                              params: { animalId: id },
                            } as any);
                          }}
                          activeOpacity={0.9}
                        >
                          {photoUri ? (
                            <Image
                              source={{ uri: photoUri }}
                              style={styles.avatar}
                            />
                          ) : (
                            <View style={styles.avatar} />
                          )}

                          <View style={{ flex: 1, marginLeft: 16 }}>
                            <ThemedText style={styles.animalName}>
                              {item.name}
                            </ThemedText>

                            {item.breed || item.species ? (
                              <ThemedText style={styles.animalBreed}>
                                {item.breed || item.species}
                              </ThemedText>
                            ) : null}

                            {descriptionSnippet ? (
                              <ThemedText
                                numberOfLines={2}
                                style={styles.animalDescription}
                              >
                                {descriptionSnippet}
                              </ThemedText>
                            ) : null}
                          </View>

                          {typeof item.matchesCount === "number" ? (
                            <View style={styles.animalsBadge}>
                              <ThemedText style={styles.animalsBadgeText}>
                                {String(item.matchesCount)} matches
                              </ThemedText>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      </View>
                    </Swipeable>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <ThemedText style={{ fontSize: 18, marginBottom: 8 }}>
                      Nog geen dieren
                    </ThemedText>
                    <ThemedText style={{ color: "#666" }}>
                      Er zijn nog geen dieren om te tonen. Voeg een dier toe om
                      te beginnen.
                    </ThemedText>
                  </View>
                }
              />
            )}

            {/* ⚠️ Verwijderd: dubbele CameraCapture (er stond er al één onderaan) */}
          </View>

          <Modal
            visible={modalVisible}
            animationType="slide"
            onRequestClose={closeModal}
          >
            <SafeAreaView style={styles.modalWrap}>
              <TouchableWithoutFeedback
                onPress={Keyboard.dismiss}
                accessible={false}
              >
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  style={styles.modalAvoiding}
                >
                  <ScrollView
                    contentContainerStyle={styles.modalContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <ThemedText type="title">{modalTitle}</ThemedText>

                    {step === 1 ? (
                      <View style={{ width: "100%", alignItems: "flex-start" }}>
                        <View style={{ width: "100%", alignItems: "center" }}>
                          <TouchableOpacity
                            style={styles.imagePicker}
                            onPress={pickImage}
                          >
                            {photoPreview ? (
                              <Image
                                source={{ uri: photoPreview }}
                                style={styles.pickedImage}
                              />
                            ) : (
                              <Ionicons
                                name="camera-outline"
                                size={28}
                                color="#999"
                              />
                            )}
                          </TouchableOpacity>

                          <View
                            style={{
                              flexDirection: "row",
                              gap: 4,
                              marginTop: 8,
                            }}
                          >
                            <TouchableOpacity
                              style={[styles.speciesButton]}
                              onPress={pickImage}
                            >
                              <ThemedText>Kies</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.speciesButton]}
                              onPress={takePhoto}
                            >
                              <ThemedText>Camera</ThemedText>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <ThemedText
                          style={{
                            marginTop: 12,
                            alignSelf: "flex-start",
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Naam van het diertje
                        </ThemedText>
                        <TextInput
                          placeholder="Naam"
                          value={name}
                          onChangeText={setName}
                          style={[styles.input, styles.inputWithBorder]}
                        />

                        <ThemedText
                          style={{
                            marginTop: 12,
                            alignSelf: "flex-start",
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Geboortedatum
                        </ThemedText>
                        <View style={styles.rowSmall}>
                          <TextInput
                            placeholder="DD"
                            value={day}
                            onChangeText={setDay}
                            keyboardType="number-pad"
                            style={[styles.inputSmall, styles.inputWithBorder]}
                          />
                          <TextInput
                            placeholder="MM"
                            value={month}
                            onChangeText={setMonth}
                            keyboardType="number-pad"
                            style={[styles.inputSmall, styles.inputWithBorder]}
                          />
                          <TextInput
                            placeholder="YYYY"
                            value={year}
                            onChangeText={setYear}
                            keyboardType="number-pad"
                            style={[styles.inputLarge, styles.inputWithBorder]}
                          />
                        </View>

                        <ThemedText
                          style={{
                            marginTop: 12,
                            alignSelf: "flex-start",
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Kat of hond?
                        </ThemedText>
                        <View style={styles.speciesRow}>
                          <TouchableOpacity
                            style={[
                              styles.speciesButton,
                              species === "cat" ? styles.speciesActive : null,
                            ]}
                            onPress={() => setSpecies("cat")}
                          >
                            <ThemedText
                              style={
                                species === "cat"
                                  ? styles.propertyActiveText
                                  : undefined
                              }
                            >
                              🐱 Kat
                            </ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.speciesButton,
                              species === "dog" ? styles.speciesActive : null,
                            ]}
                            onPress={() => setSpecies("dog")}
                          >
                            <ThemedText
                              style={
                                species === "dog"
                                  ? styles.propertyActiveText
                                  : undefined
                              }
                            >
                              🐶 Hond
                            </ThemedText>
                          </TouchableOpacity>
                        </View>

                        {species ? (
                          <>
                            <ThemedText
                              style={{
                                marginTop: 12,
                                fontFamily: "montserrat-bold",
                              }}
                            >
                              Kies het geslacht
                            </ThemedText>
                            <View style={styles.speciesRow}>
                              <TouchableOpacity
                                style={[
                                  styles.speciesButton,
                                  gender === "male"
                                    ? styles.speciesActive
                                    : null,
                                ]}
                                onPress={() => setGender("male")}
                              >
                                <ThemedText
                                  style={
                                    gender === "male"
                                      ? styles.propertyActiveText
                                      : undefined
                                  }
                                >
                                  {species === "cat" ? "Kater" : "Reu"}
                                </ThemedText>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.speciesButton,
                                  gender === "female"
                                    ? styles.speciesActive
                                    : null,
                                ]}
                                onPress={() => setGender("female")}
                              >
                                <ThemedText
                                  style={
                                    gender === "female"
                                      ? styles.propertyActiveText
                                      : undefined
                                  }
                                >
                                  {species === "cat" ? "Kattin" : "Teefje"}
                                </ThemedText>
                              </TouchableOpacity>
                            </View>
                          </>
                        ) : null}
                      </View>
                    ) : step === 2 ? (
                      <View style={{ width: "100%", alignItems: "center" }}>
                        <ThemedText
                          style={{
                            marginTop: 12,
                            alignSelf: "flex-start",
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Wat is het ras?
                        </ThemedText>
                        <TextInput
                          value={breed}
                          onChangeText={setBreed}
                          style={[
                            styles.input,
                            styles.inputWithBorder,
                            { marginTop: 12 },
                          ]}
                        />

                        <ThemedText
                          style={{
                            marginTop: 12,
                            alignSelf: "flex-start",
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Beschrijving van het diertje
                        </ThemedText>

                        <TextInput
                          value={description}
                          onChangeText={setDescription}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                          style={[
                            styles.input,
                            styles.textArea,
                            styles.inputWithBorder,
                          ]}
                        />

                        <View style={{ width: "100%", marginTop: 12 }}>
                          <ThemedText
                            style={{
                              marginBottom: 8,
                              fontFamily: "montserrat-bold",
                            }}
                          >
                            Eigenschappen
                          </ThemedText>
                          <View
                            style={[styles.speciesRow, { flexWrap: "wrap" }]}
                          >
                            {propertyOptions.map((opt) => (
                              <TouchableOpacity
                                key={opt}
                                style={[
                                  styles.propertyButton,
                                  properties.includes(opt)
                                    ? styles.propertyActive
                                    : null,
                                ]}
                                onPress={() => toggleProperty(opt)}
                              >
                                <ThemedText
                                  style={
                                    properties.includes(opt)
                                      ? styles.propertyActiveText
                                      : undefined
                                  }
                                >
                                  {opt}
                                </ThemedText>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>
                    ) : step === 3 ? (
                      <View style={{ width: "100%", alignItems: "center" }}>
                        <ThemedText
                          style={{
                            marginTop: 12,
                            alignSelf: "flex-start",
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Ideale werkomstandigheden baasje?
                        </ThemedText>
                        <View
                          style={[
                            styles.speciesRow,
                            { flexWrap: "wrap", marginTop: 8 },
                          ]}
                        >
                          {whoWorkOptions.map((opt) => (
                            <TouchableOpacity
                              key={opt}
                              style={[
                                styles.propertyButton,
                                whoProperties.includes(opt)
                                  ? styles.propertyActive
                                  : null,
                              ]}
                              onPress={() => toggleWhoProperty(opt)}
                            >
                              <ThemedText
                                style={
                                  whoProperties.includes(opt)
                                    ? styles.propertyActiveText
                                    : undefined
                                }
                              >
                                {opt}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <ThemedText
                          style={{
                            marginTop: 12,
                            alignSelf: "flex-start",
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Tijdens vrije tijd houdt hij/zij/x van...
                        </ThemedText>
                        <View
                          style={[
                            styles.speciesRow,
                            { flexWrap: "wrap", marginTop: 8 },
                          ]}
                        >
                          {whoHobbyOptions.map((opt) => (
                            <TouchableOpacity
                              key={opt}
                              style={[
                                styles.propertyButton,
                                whoProperties.includes(opt)
                                  ? styles.propertyActive
                                  : null,
                              ]}
                              onPress={() => toggleWhoProperty(opt)}
                            >
                              <ThemedText
                                style={
                                  whoProperties.includes(opt)
                                    ? styles.propertyActiveText
                                    : undefined
                                }
                              >
                                {opt}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <ThemedText
                          style={{
                            marginTop: 12,
                            alignSelf: "flex-start",
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Met wie woont hij/zij/x samen?
                        </ThemedText>
                        <View
                          style={[
                            styles.speciesRow,
                            { flexWrap: "wrap", marginTop: 8 },
                          ]}
                        >
                          {whoLivingOptions.map((opt) => (
                            <TouchableOpacity
                              key={opt}
                              style={[
                                styles.propertyButton,
                                whoProperties.includes(opt)
                                  ? styles.propertyActive
                                  : null,
                              ]}
                              onPress={() => toggleWhoProperty(opt)}
                            >
                              <ThemedText
                                style={
                                  whoProperties.includes(opt)
                                    ? styles.propertyActiveText
                                    : undefined
                                }
                              >
                                {opt}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : step === 4 ? (
                      <View style={{ width: "100%", alignItems: "flex-start" }}>
                        <ThemedText
                          style={{
                            marginTop: 12,
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Heeft het diertje toegang nodig tot een tuin?
                        </ThemedText>
                        <View
                          style={[
                            styles.speciesRow,
                            { flexWrap: "wrap", marginTop: 8 },
                          ]}
                        >
                          <TouchableOpacity
                            style={[
                              styles.speciesButton,
                              hasGarden === true ? styles.speciesActive : null,
                            ]}
                            onPress={() => setHasGarden(true)}
                          >
                            <ThemedText>🌳 Ja</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.speciesButton,
                              hasGarden === false ? styles.speciesActive : null,
                            ]}
                            onPress={() => setHasGarden(false)}
                          >
                            <ThemedText>🏙️ Nee</ThemedText>
                          </TouchableOpacity>
                        </View>

                        <ThemedText
                          style={{
                            marginTop: 12,
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Kan het diertje omgaan met andere dieren?
                        </ThemedText>
                        <View
                          style={[
                            styles.speciesRow,
                            { flexWrap: "wrap", marginTop: 8 },
                          ]}
                        >
                          <TouchableOpacity
                            style={
                              canWithCats
                                ? [styles.propertyButton, styles.propertyActive]
                                : styles.propertyButton
                            }
                            onPress={() => setCanWithCats((v) => !v)}
                          >
                            <ThemedText
                              style={
                                canWithCats
                                  ? styles.propertyActiveText
                                  : undefined
                              }
                            >
                              🐱 Kan met katten
                            </ThemedText>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={
                              canWithDogs
                                ? [styles.propertyButton, styles.propertyActive]
                                : styles.propertyButton
                            }
                            onPress={() => setCanWithDogs((v) => !v)}
                          >
                            <ThemedText
                              style={
                                canWithDogs
                                  ? styles.propertyActiveText
                                  : undefined
                              }
                            >
                              🐶 Kan met honden
                            </ThemedText>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={
                              canWithRodents
                                ? [styles.propertyButton, styles.propertyActive]
                                : styles.propertyButton
                            }
                            onPress={() => setCanWithRodents((v) => !v)}
                          >
                            <ThemedText
                              style={
                                canWithRodents
                                  ? styles.propertyActiveText
                                  : undefined
                              }
                            >
                              🐭 Kan met knaagdieren
                            </ThemedText>
                          </TouchableOpacity>
                        </View>

                        <ThemedText
                          style={{
                            marginTop: 12,
                            fontFamily: "montserrat-bold",
                          }}
                        >
                          Kan het diertje omgaan met kinderen?
                        </ThemedText>

                        <View
                          style={[
                            styles.speciesRow,
                            { flexWrap: "wrap", marginTop: 8 },
                          ]}
                        >
                          <TouchableOpacity
                            style={[
                              styles.propertyButton,
                              kidsOption === "no"
                                ? styles.propertyActive
                                : null,
                            ]}
                            onPress={() => setKidsOption("no")}
                          >
                            <ThemedText
                              style={
                                kidsOption === "no"
                                  ? styles.propertyActiveText
                                  : undefined
                              }
                            >
                              ❌ Nee
                            </ThemedText>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.propertyButton,
                              kidsOption === "young"
                                ? styles.propertyActive
                                : null,
                            ]}
                            onPress={() => setKidsOption("young")}
                          >
                            <ThemedText
                              style={
                                kidsOption === "young"
                                  ? styles.propertyActiveText
                                  : undefined
                              }
                            >
                              🧒 Ja, jonger dan 6 jaar
                            </ThemedText>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.propertyButton,
                              kidsOption === "between"
                                ? styles.propertyActive
                                : null,
                            ]}
                            onPress={() => setKidsOption("between")}
                          >
                            <ThemedText
                              style={
                                kidsOption === "between"
                                  ? styles.propertyActiveText
                                  : undefined
                              }
                            >
                              👦 Ja, tussen 6 - 14 jaar
                            </ThemedText>
                          </TouchableOpacity>
                        </View>

                        {species === "cat" ? (
                          <>
                            <ThemedText
                              style={{
                                marginTop: 12,
                                fontFamily: "montserrat-bold",
                              }}
                            >
                              Soort kat?
                            </ThemedText>
                            <View
                              style={[
                                styles.speciesRow,
                                { flexWrap: "wrap", marginTop: 8 },
                              ]}
                            >
                              {[
                                { key: "Binnenkat", label: "🐱 Binnenkat" },
                                { key: "Buitenkat", label: "🌳 Buitenkat" },
                                { key: "Knuffelkat", label: "😽 Knuffelkat" },
                                {
                                  key: "Boerderijkat",
                                  label: "🌾 Boerderijkat",
                                },
                              ].map((opt) => (
                                <TouchableOpacity
                                  key={opt.key}
                                  style={
                                    catTypes.includes(opt.key)
                                      ? [
                                          styles.propertyButton,
                                          styles.propertyActive,
                                        ]
                                      : styles.propertyButton
                                  }
                                  onPress={() =>
                                    setCatTypes((prev) =>
                                      prev.includes(opt.key)
                                        ? prev.filter((p) => p !== opt.key)
                                        : [...prev, opt.key]
                                    )
                                  }
                                >
                                  <ThemedText
                                    style={
                                      catTypes.includes(opt.key)
                                        ? styles.propertyActiveText
                                        : undefined
                                    }
                                  >
                                    {opt.label}
                                  </ThemedText>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </>
                        ) : null}
                      </View>
                    ) : null}
                  </ScrollView>
                </KeyboardAvoidingView>
              </TouchableWithoutFeedback>

              <View style={styles.footerWrap}>
                <View style={styles.footerInner}>
                  {step > 1 ? (
                    <TouchableOpacity
                      style={styles.footerSecondary}
                      onPress={() => setStep((s) => Math.max(1, s - 1))}
                    >
                      <ThemedText style={{ color: "#037D4E" }}>
                        Terug
                      </ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.footerSecondary}
                      onPress={closeModal}
                    >
                      <ThemedText style={{ color: "#037D4E" }}>
                        Annuleren
                      </ThemedText>
                    </TouchableOpacity>
                  )}

                  {step < 4 ? (
                    <TouchableOpacity
                      style={styles.footerPrimary}
                      onPress={() => setStep((s) => Math.min(4, s + 1))}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <ThemedText style={{ color: "#fff" }}>
                          Volgende
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.footerPrimary}
                      onPress={submitAnimal}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <ThemedText style={{ color: "#fff" }}>
                          Klaar!
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </SafeAreaView>
          </Modal>

          {/* ✅ Enige CameraCapture (niet dubbel) */}
          <CameraCapture
            visible={cameraVisible}
            onClose={() => setCameraVisible(false)}
            onCapture={(res) => {
              if (!res || !res.previewBase64) {
                Alert.alert("Fout", "Kon foto niet verwerken.");
                return;
              }
              setPhotoPreview(res.previewBase64);
              setPhotoPayload(res.previewBase64);
            }}
          />
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootContent: { paddingTop: 80, padding: 30, paddingBottom: 80 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: "#037D4E",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalWrap: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#FFFCF5",
  },
  modalAvoiding: {
    flex: 1,
    width: "100%",
  },
  modalContent: {
    flexGrow: 1,
    width: "100%",
    alignItems: "center",
    paddingBottom: 140,
  },
  imagePicker: {
    width: 140,
    height: 140,
    backgroundColor: "#EFEFD1",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  pickedImage: { width: 140, height: 140, borderRadius: 8 },
  input: {
    width: "100%",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 12,
  },
  textArea: { minHeight: 120 },
  inputWithBorder: { borderWidth: 1, borderColor: "#E5E7EB" },
  inputSmall: {
    width: 60,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 12,
    textAlign: "center",
  },
  inputLarge: {
    flex: 1,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 12,
    marginLeft: 8,
  },
  rowSmall: { flexDirection: "row", width: "100%", gap: 2 },
  speciesRow: {
    justifyContent: "flex-start",
    flexDirection: "row",
    marginTop: 12,
    gap: 2,
  },
  speciesButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#EFF1D9",
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  speciesActive: { backgroundColor: "#AEBA40" },
  propertyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#EFF1D9",
    borderRadius: 20,
    marginRight: 4,
    marginBottom: 4,
  },
  propertyActive: { backgroundColor: "#AEBA40" },
  propertyActiveText: { color: "#fff" },
  addButtonFull: {
    backgroundColor: "#037D4E",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  swipeRowContainer: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 6,
    marginHorizontal: 4,
    shadowColor: "#00000020",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  animalRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f2f2f2",
  },
  animalName: { fontWeight: "700", fontSize: 18 },
  animalBreed: { color: "#666", fontSize: 14 },
  animalDescription: { color: "#555", fontSize: 13, marginTop: 4 },
  animalsBadge: {
    backgroundColor: "#E6F0C8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  animalsBadgeText: { color: "#333", fontSize: 13 },
  swipeActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  swipeActionButton: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 26,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    minWidth: 72,
  },
  swipeMoreButton: { backgroundColor: "#E5E7EB" },
  swipeEditButton: { backgroundColor: "#AEBA40" },
  swipeDeleteButton: { backgroundColor: "#FDA0E9" },
  swipeActionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 4,
  },
  swipeActionTextDark: { color: "#374151" },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFCF5",
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 26 : 14,
    paddingHorizontal: 20,
  },
  footerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  footerPrimary: {
    backgroundColor: "#037D4E",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  footerSecondary: {
    borderWidth: 2,
    borderColor: "#037D4E",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  fixedTop: {
    paddingHorizontal: 30,
    paddingBottom: 12,
    backgroundColor: "#FFFCF5",
    zIndex: 10,
  },
  listContent: { paddingHorizontal: 30, paddingBottom: 30 },
});

export const options = { title: "Animals" };
