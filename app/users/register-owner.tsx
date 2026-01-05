import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { api } from "../_lib/api";

export const options = { headerShown: false };

export default function RegisterOwnerScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthdate, setBirthdate] = useState(""); // DD/MM/YYYY
  const [region, setRegion] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const birthdateRef = useRef<TextInput | null>(null);
  const regionRef = useRef<TextInput | null>(null);

  const [loading, setLoading] = useState(false);

  async function pickImage() {
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
        mediaTypes: ["Images"] as any,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.85,
      });

      const wasCancelled =
        (result as any).cancelled ?? (result as any).canceled ?? false;

      if (wasCancelled) return;

      const uri =
        ((result as any).assets &&
          (result as any).assets[0] &&
          (result as any).assets[0].uri) ||
        (result as any).uri;

      if (!uri) return;

      // Resize/compress to keep base64 upload reasonable
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
        );
        setPhotoUri(manipulated?.uri || uri);
      } catch (err) {
        console.warn("image manipulation failed, using original uri", err);
        setPhotoUri(uri);
      }
    } catch (err) {
      console.warn("Image pick error", err);
    }
  }

  function validate() {
    if (!name.trim()) return "Vul je naam in.";
    if (!email.trim() || !email.includes("@"))
      return "Vul een geldig e-mail adres in.";
    if (!birthdate.trim()) return "Vul je geboortedatum in (DD/MM/YYYY).";

    const dateMatch = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateMatch.test(birthdate.trim()))
      return "Gebruik het formaat DD/MM/YYYY voor je geboortedatum.";

    if (!password || password.length < 6)
      return "Kies een wachtwoord van minstens 6 tekens.";

    if (!region.trim()) return "Vul je regio in.";
    return null;
  }

  function normalizeBirthdate(input: string) {
    const parts = input.split("/");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    const d = parseInt(dd, 10);
    const m = parseInt(mm, 10);
    const y = parseInt(yyyy, 10);
    if (!d || !m || !y) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; // YYYY-MM-DD
  }

  // ✅ Robust base64 helper: supports Android content:// by copying to cache first
  async function toBase64DataUrl(uri: string) {
    if (!uri) throw new Error("Geen image URI");

    let fileUri = uri;

    // Android: content:// URIs can't be read directly by readAsStringAsync
    if (Platform.OS === "android" && uri.startsWith("content://")) {
      const fileName = uri.split("/").pop() || `photo-${Date.now()}.jpg`;
      // Some versions of expo-file-system's types may not expose cacheDirectory/documentDirectory
      // at compile time — use a runtime-safe access via any and fallback to empty string.
      const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || "";
      const dest = cacheDir + fileName;

      await FileSystem.copyAsync({ from: uri, to: dest });

      fileUri = dest;
    }

    // iOS: sometimes it is already file://, sometimes it’s a normal path. Ensure file:// is ok.
    // FileSystem.readAsStringAsync works with either file:// or a local path in Expo.
    // Some versions of expo-file-system may not expose EncodingType in types; use the
    // string literal 'base64' which the runtime accepts.
    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: "base64" as any });

    // We manipulated to JPEG, so safe default:
    return `data:image/jpeg;base64,${base64}`;
  }

  async function onContinue() {
    const err = validate();
    if (err) {
      Alert.alert("Ongeldige invoer", err);
      return;
    }

    const normalizedBirth = normalizeBirthdate(birthdate.trim());
    if (!normalizedBirth) {
      Alert.alert("Ongeldige invoer", "Gebruik DD/MM/YYYY voor geboortedatum.");
      return;
    }

    setLoading(true);
    try {
      // Clear any old session so we never keep previous user's token
      await SecureStore.deleteItemAsync("userToken");
      await SecureStore.deleteItemAsync("user");
      await SecureStore.deleteItemAsync("userId");

      // 1) Register user (JSON-only, matches your backend)
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password,
        birthdate: normalizedBirth,
        region: region.trim(),
      };

      const resp = await api.post("/users", payload);

      // Read as text first (safer) then JSON parse
      const raw = await resp.text().catch(() => "");
      if (!resp.ok) {
        Alert.alert("Fout bij registratie", raw || `HTTP ${resp.status}`);
        return;
      }

      

      // Your backend POST /users currently returns the saved user (no token).
      // So: after registering, we immediately log in to get a token.
      // ✅ This guarantees posts work.
      const loginResp = await api.post("/users/login", {
        email: payload.email,
        password: payload.password,
      });

      const loginRaw = await loginResp.text().catch(() => "");
      if (!loginResp.ok) {
        Alert.alert(
          "Fout",
          loginRaw || "Registratie gelukt, maar automatisch inloggen faalde."
        );
        return;
      }

      const loginJson = loginRaw ? JSON.parse(loginRaw) : null;
      const token = loginJson?.token ? String(loginJson.token) : null;
      const userObj = loginJson?.user ?? null;

      if (!token || !userObj) {
        console.log("LOGIN RESPONSE (missing token/user):", loginJson);
        Alert.alert("Fout", "Kon token/user niet ophalen na registratie.");
        return;
      }

      const userId = String(userObj.id ?? userObj._id ?? "");
      if (!userId) {
        console.log("LOGIN RESPONSE (missing userId):", loginJson);
        Alert.alert("Fout", "Kon userId niet vinden na registratie.");
        return;
      }

      // 2) Persist session so Feed can post
      await SecureStore.setItemAsync("userToken", token);
      await SecureStore.setItemAsync("user", JSON.stringify(userObj));
      await SecureStore.setItemAsync("userId", userId);

      // 3) Optional: upload profile image as base64 data URL (backend expects { profileImage })
      if (photoUri) {
        try {
          const dataUrl = await toBase64DataUrl(photoUri);

          const up = await api.post(`/users/${userId}/photo`, {
            profileImage: dataUrl,
          });

          if (!up.ok) {
            const upText = await up.text().catch(() => "");
            console.warn("Profile image upload failed:", up.status, upText);
            // not fatal
          } else {
            // update stored user if backend returns user object
            try {
              const upJson = await up.json();
              if (upJson && typeof upJson === "object") {
                await SecureStore.setItemAsync("user", JSON.stringify(upJson));
              }
            } catch {
              // ignore if no json
            }
          }
        } catch (e) {
          console.warn("Profile image upload exception", e);
          // not fatal
        }
      }

      // 4) Next onboarding step
      router.replace("/users/register-interests" as any);
    } catch (e) {
      console.error("register error", e);
      Alert.alert(
        "Fout",
        (e as any)?.message || "Er is iets misgegaan bij het registreren."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText type="title" style={styles.title}>
            Eerst even over jou
          </ThemedText>

          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <Text style={styles.photoBtnText}>
              {photoUri ? "Wijzig profielfoto" : "Upload profielfoto"}
            </Text>
          </TouchableOpacity>

          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : null}

          <Text style={styles.label}>Wat is je naam?</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={name}
            onChangeText={setName}
            placeholder="Voornaam Achternaam"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
            autoComplete="name"
            autoCapitalize="words"
            autoCorrect={false}
          />

          <Text style={styles.label}>Wat is je e-mailadres?</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            ref={emailRef}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Wachtwoord</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={password}
            onChangeText={setPassword}
            placeholder="Wachtwoord"
            secureTextEntry
            ref={passwordRef}
            returnKeyType="next"
            onSubmitEditing={() => birthdateRef.current?.focus()}
            blurOnSubmit={false}
            textContentType="password"
            autoComplete="password"
          />

          <Text style={styles.label}>Je geboortedatum</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={birthdate}
            onChangeText={setBirthdate}
            placeholder="DD/MM/YYYY"
            ref={birthdateRef}
            returnKeyType="next"
            onSubmitEditing={() => regionRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Regio</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={region}
            onChangeText={setRegion}
            placeholder="Bijv. Antwerpen"
            ref={regionRef}
            returnKeyType="done"
            onSubmitEditing={onContinue}
            blurOnSubmit
          />

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Image
        source={require("../../assets/images/kat.png")}
        style={styles.katBottom}
        resizeMode="contain"
      />

      <View style={styles.footerBar} pointerEvents={loading ? "none" : "auto"}>
        <View style={styles.footerInner}>
          <TouchableOpacity style={styles.ctaButton} onPress={onContinue} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Verder</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBF4E2" },
  container: { padding: 24, paddingTop: 40, alignItems: "stretch" },
  title: {
    fontFamily: "MontserratAlternates-SemiBold",
    color: "#3F3F3F",
    fontSize: 22,
    marginBottom: 24,
  },
  label: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 14,
    marginBottom: 6,
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    fontFamily: "Montserrat_400Regular",
  },
  inputWithBorder: { borderWidth: 1, borderColor: "#E5E7EB" },
  photoBtn: {
    backgroundColor: "#fff",
    borderColor: "#eee",
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: "center",
    marginBottom: 12,
  },
  photoBtnText: { color: "#333", fontFamily: "Montserrat_600SemiBold" },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 12,
  },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FBF4E2",
    borderTopWidth: 1,
    borderTopColor: "#F0E9DB",
    paddingVertical: 12,
    paddingTop: 10,
    paddingBottom: 24,
  },
  footerInner: { alignItems: "center" },
  ctaButton: {
    backgroundColor: "#037D4E",
    height: 56,
    width: "90%",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#fff", fontFamily: "Montserrat_600SemiBold", fontSize: 16 },
  katBottom: {
    position: "absolute",
    right: 16,
    bottom: 88,
    width: 120,
    height: 120,
    zIndex: 5,
    opacity: 1,
  },
});
