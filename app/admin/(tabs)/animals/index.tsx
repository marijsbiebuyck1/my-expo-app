import * as ImagePicker from "expo-image-picker";
// import useRouter only when needed; we keep the import commented out because navigation is not used here
// import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../../components/logo-header";
import { ThemedText } from "../../../../components/themed-text";
import { ADMIN_BASE, api } from "../../../_lib/api";
import { useAdminAuth } from "../../../_lib/useAuth";

export default function AnimalsScreen() {
  const { admin } = useAdminAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [species, setSpecies] = useState<"cat" | "dog" | "" | null>(null);
  const [gender, setGender] = useState<"male" | "female" | "" | null>(null);
  const [breed, setBreed] = useState("");
  const [properties, setProperties] = useState<string[]>([]);
  const [whoProperties, setWhoProperties] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function pickImage() {
    try {
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) {
        Alert.alert("Permission required", "We need access to your photos to upload a picture.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) setImage(res.assets[0].uri);
    } catch (err) {
      console.warn(err);
    }
  }

  async function takePhoto() {
    try {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) {
        Alert.alert("Permission required", "We need camera access to take a photo.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
      if (!res.canceled && res.assets && res.assets.length > 0) setImage(res.assets[0].uri);
    } catch (err) {
      console.warn(err);
    }
  }

  function resetForm() {
    setImage(null);
    setName("");
    setDay("");
    setMonth("");
    setYear("");
    setSpecies(null);
    setGender(null);
    setBreed("");
    setProperties([]);
    setStep(1);
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
    if (!name) return Alert.alert("Veld ontbreekt", "Vul de naam van het dier in.");
    if (!species) return Alert.alert("Veld ontbreekt", "Kies of het dier een kat of een hond is.");
    const birth = buildBirthdate();
    if (!birth) return Alert.alert("Veld ontbreekt", "Vul een geldige geboortedatum in (DD MM YYYY).");
    if (!gender) return Alert.alert("Veld ontbreekt", "Kies geslacht.");

    setSubmitting(true);
    try {
      let shelterId: string | null = null;
      if (admin) shelterId = String((admin as any)._id ?? (admin as any).id ?? (admin as any).shelterId ?? (admin as any).adminId ?? null);
      if (!shelterId) {
        const raw = await SecureStore.getItemAsync("admin");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            shelterId = String(parsed._id ?? parsed.id ?? parsed.shelterId ?? parsed.adminId ?? null);
          } catch {}
        }
      }
      if (!shelterId) {
        const direct = await SecureStore.getItemAsync("adminId");
        if (direct) shelterId = direct;
      }
      if (!shelterId) {
        setSubmitting(false);
        return Alert.alert("Veld ontbreekt", "Geen shelter gevonden. Log in als asiel en probeer opnieuw.");
      }
      const form = new FormData();
      if (image) {
        const uriParts = image.split("/");
        const filename = uriParts[uriParts.length - 1];
        const match = filename.match(/\.([0-9a-z]+)(?:\?|$)/i);
        const type = match ? `image/${match[1]}` : "image";
        // @ts-ignore
        form.append("image", { uri: Platform.OS === "ios" && image.startsWith("file://") ? image : image, name: filename, type });
      }
      form.append("name", name);
      form.append("birthdate", birth);
      form.append("species", species);
      form.append("gender", gender);
      form.append("shelterId", shelterId);
      if (breed) form.append("breed", breed);
      if (properties && properties.length > 0) form.append("properties", JSON.stringify(properties));

      const res = await api.post("/animals", form, true);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Status ${res.status}`);
      }
      await res.json().catch(() => null);
      Alert.alert("Klaar", "Dier succesvol toegevoegd.");
      await fetchAnimals();
      setModalVisible(false);
      resetForm();
    } catch (err: any) {
      console.warn("Add animal failed", err);
      Alert.alert("Upload mislukt", String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchAnimals() {
    setLoadingAnimals(true);
    try {
      const res = await api.get("/animals", true);
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
  }

  async function deleteAnimal(id: string) {
    Alert.alert("Verwijderen", "Weet je zeker dat je dit dier wilt verwijderen?", [
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
    ]);
  }

  useEffect(() => {
    fetchAnimals();
  }, []);

  const genderLabelMale = species === "cat" ? "Kat (mannetje)" : "Reu";
  const genderLabelFemale = species === "cat" ? "Kattin (vrouwtje)" : "Teefje";

  const propertyOptions = [
    "Zindelijk",
    "Kent basiscommando's",
    "Gecastreerd",
    "Kan in de auto",
    "Kan alleen zijn",
    "Ervaring vereist",
    "Andere...",
  ];

  const whoWorkOptions = ["Telewerk", "Vaak reizen", "9-to-5", "Nog op school", "Op pensioen"];
  const whoHobbyOptions = ["Wandelen", "Op vakantie gaan", "Series kijken", "Iets gaan drinken", "Sporten"];
  const whoLivingOptions = ["Gezin", "Alleen", "Met roomies", "Met partner"];

  function toggleWhoProperty(key: string) {
    setWhoProperties((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  function toggleProperty(key: string) {
    setProperties((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <LogoHeader />
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <ThemedText type="title">Jouw dieren 🐾</ThemedText>
        </View>

        <TouchableOpacity style={styles.addButtonFull} onPress={() => setModalVisible(true)}>
          <ThemedText style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>+ Dier toevoegen</ThemedText>
        </TouchableOpacity>

        {loadingAnimals ? (
          <View style={styles.emptyState}>
            <ActivityIndicator />
          </View>
        ) : animals && animals.length > 0 ? (
          <View style={{ width: "100%" }}>
            {animals.map((item) => {
              const photo = item.photo || item.image || item.avatar || item.photoUrl || null;
              let photoUri = photo || null;
              if (photoUri && !photoUri.startsWith("http")) photoUri = ADMIN_BASE + (photoUri.startsWith("/") ? photoUri : "/" + photoUri);
              return (
                <TouchableOpacity key={item._id || item.id || item.name} style={styles.animalRow}>
                  <Image source={{ uri: photoUri }} style={styles.avatar} />
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <ThemedText style={styles.animalName}>{item.name}</ThemedText>
                    <ThemedText style={styles.animalBreed}>{item.breed || item.species || "-"}</ThemedText>
                  </View>
                  {typeof item.matchesCount === "number" ? (
                    <View style={styles.animalsBadge}>
                      <ThemedText style={styles.animalsBadgeText}>{String(item.matchesCount)} matches</ThemedText>
                    </View>
                  ) : null}
                  <TouchableOpacity onPress={() => deleteAnimal(String(item._id || item.id))} style={styles.deleteBtn}>
                    <ThemedText style={{ color: "#c0392b" }}>Verwijder</ThemedText>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <ThemedText style={{ fontSize: 18, marginBottom: 8 }}>Nog geen Animals</ThemedText>
            <ThemedText style={{ color: "#666" }}>Er zijn nog geen Animals om te tonen. Voeg een dier toe om te beginnen.</ThemedText>
          </View>
        )}

        <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <SafeAreaView style={styles.modalWrap}>
            <ThemedText type="title">Dier toevoegen</ThemedText>

            {step === 1 ? (
              <View style={{ width: "100%", alignItems: "center" }}>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                  {image ? <Image source={{ uri: image }} style={styles.pickedImage} /> : <ThemedText style={{ color: "#999" }}>Upload foto</ThemedText>}
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity style={[styles.speciesButton]} onPress={pickImage}>
                    <ThemedText>Choose</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.speciesButton]} onPress={takePhoto}>
                    <ThemedText>Camera</ThemedText>
                  </TouchableOpacity>
                </View>

                <TextInput placeholder="Naam" value={name} onChangeText={setName} style={styles.input} />

                <View style={styles.rowSmall}>
                  <TextInput placeholder="DD" value={day} onChangeText={setDay} keyboardType="number-pad" style={[styles.inputSmall]} />
                  <TextInput placeholder="MM" value={month} onChangeText={setMonth} keyboardType="number-pad" style={[styles.inputSmall]} />
                  <TextInput placeholder="YYYY" value={year} onChangeText={setYear} keyboardType="number-pad" style={[styles.inputLarge]} />
                </View>

                <View style={styles.speciesRow}>
                  <TouchableOpacity style={[styles.speciesButton, species === "cat" ? styles.speciesActive : null]} onPress={() => setSpecies("cat")}>
                    <ThemedText>Kat</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.speciesButton, species === "dog" ? styles.speciesActive : null]} onPress={() => setSpecies("dog")}>
                    <ThemedText>Hond</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ width: "100%", marginTop: 16 }}>
                  <TouchableOpacity style={styles.shareButton} onPress={() => setStep(2)}>
                    <ThemedText style={{ color: "#fff" }}>Volgende</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.shareButton, { backgroundColor: "#eee", marginTop: 8 }]} onPress={() => setModalVisible(false)}>
                    <ThemedText>Annuleren</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : step === 2 ? (
              <View style={{ width: "100%", alignItems: "center" }}>
                <ThemedText>Is het dier een {species === "cat" ? "kat" : "hond"}? Vul ook het ras en eigenschappen in.</ThemedText>

                <TextInput placeholder="Welk ras?" value={breed} onChangeText={setBreed} style={[styles.input, { marginTop: 12 }]} />

                <View style={{ width: "100%", marginTop: 12 }}>
                  <ThemedText style={{ marginBottom: 8 }}>Eigenschappen</ThemedText>
                  <View style={[styles.speciesRow, { flexWrap: "wrap" }]}> 
                    {propertyOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.propertyButton, properties.includes(opt) ? styles.propertyActive : null]}
                        onPress={() => toggleProperty(opt)}
                      >
                        <ThemedText>{opt}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <ThemedText style={{ marginTop: 12 }}>Kies het geslacht</ThemedText>

                <View style={styles.speciesRow}>
                  <TouchableOpacity style={[styles.speciesButton, gender === "male" ? styles.speciesActive : null]} onPress={() => setGender("male")}>
                    <ThemedText>{genderLabelMale}</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.speciesButton, gender === "female" ? styles.speciesActive : null]} onPress={() => setGender("female")}>
                    <ThemedText>{genderLabelFemale}</ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={{ width: "100%", marginTop: 16 }}>
                  <TouchableOpacity style={styles.shareButton} onPress={() => setStep(3)}>
                    <ThemedText style={{ color: "#fff" }}>Volgende</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.shareButton, { backgroundColor: "#eee", marginTop: 8 }]} onPress={() => setStep(1)}>
                    <ThemedText>Terug</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ width: "100%", alignItems: "center" }}>
                <ThemedText type="title">Wie zoeken we?</ThemedText>

                <ThemedText style={{ marginTop: 12, alignSelf: "flex-start" }}>Werk of opleiding?</ThemedText>
                <View style={[styles.speciesRow, { flexWrap: "wrap", marginTop: 8 }] }>
                  {whoWorkOptions.map((opt) => (
                    <TouchableOpacity key={opt} style={[styles.propertyButton, whoProperties.includes(opt) ? styles.propertyActive : null]} onPress={() => toggleWhoProperty(opt)}>
                      <ThemedText>{opt}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={{ marginTop: 12, alignSelf: "flex-start" }}>In mijn vrije tijd houdt ze van...</ThemedText>
                <View style={[styles.speciesRow, { flexWrap: "wrap", marginTop: 8 }] }>
                  {whoHobbyOptions.map((opt) => (
                    <TouchableOpacity key={opt} style={[styles.propertyButton, whoProperties.includes(opt) ? styles.propertyActive : null]} onPress={() => toggleWhoProperty(opt)}>
                      <ThemedText>{opt}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText style={{ marginTop: 12, alignSelf: "flex-start" }}>Met wie woon je samen?</ThemedText>
                <View style={[styles.speciesRow, { flexWrap: "wrap", marginTop: 8 }] }>
                  {whoLivingOptions.map((opt) => (
                    <TouchableOpacity key={opt} style={[styles.propertyButton, whoProperties.includes(opt) ? styles.propertyActive : null]} onPress={() => toggleWhoProperty(opt)}>
                      <ThemedText>{opt}</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ width: "100%", marginTop: 16 }}>
                  <TouchableOpacity style={styles.shareButton} onPress={submitAnimal} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={{ color: "#fff" }}>Opslaan</ThemedText>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.shareButton, { backgroundColor: "#eee", marginTop: 8 }]} onPress={() => setStep(2)}>
                    <ThemedText>Terug</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addButton: { backgroundColor: "#FDA0E9", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalWrap: { flex: 1, padding: 20, alignItems: "center", backgroundColor: "#FFFCF5" },
  imagePicker: { width: 140, height: 140, backgroundColor: "#E6F0F8", borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 20, marginBottom: 12 },
  pickedImage: { width: 140, height: 140, borderRadius: 8 },
  input: { width: "100%", padding: 12, backgroundColor: "#fff", borderRadius: 8, marginTop: 12 },
  inputSmall: { width: 60, padding: 12, backgroundColor: "#fff", borderRadius: 8, marginTop: 12, textAlign: "center" },
  inputLarge: { flex: 1, padding: 12, backgroundColor: "#fff", borderRadius: 8, marginTop: 12, marginLeft: 8 },
  rowSmall: { flexDirection: "row", width: "100%", gap: 8 },
  speciesRow: { flexDirection: "row", marginTop: 12, gap: 8 },
  speciesButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#f2f2f2", borderRadius: 20 },
  speciesActive: { backgroundColor: "#E6F4FE" },
  propertyButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#f7f7f2", borderRadius: 20, marginRight: 8, marginBottom: 8 },
  propertyActive: { backgroundColor: "#E6F4FE" },
  shareButton: { backgroundColor: "#FDA0E9", paddingVertical: 12, borderRadius: 24, alignItems: "center" },
  addButtonFull: { backgroundColor: "#FDA0E9", paddingVertical: 14, borderRadius: 24, alignItems: "center", width: "100%", marginBottom: 12 },
  animalRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#eee" },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#ddd" },
  animalName: { fontWeight: "700", fontSize: 18 },
  animalBreed: { color: "#666", fontSize: 14 },
  animalsBadge: { backgroundColor: "#E6F0C8", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  animalsBadgeText: { color: "#333", fontSize: 13 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
});

export const options = { title: "Animals" };