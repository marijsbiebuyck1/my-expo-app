import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
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
import { api } from "../lib/api";

export const options = {
  headerShown: false,
};

export default function AdminRegisterOwnerScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [region, setRegion] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.7,
      });

      const wasCancelled =
        (result as any).cancelled ?? (result as any).canceled ?? false;
      if (!wasCancelled) {
        const uri =
          (result.assets && result.assets[0] && result.assets[0].uri) ||
          (result as any).uri;
        if (uri) setPhotoUri(uri);
      }
    } catch (err) {
      console.warn("Image pick error", err);
    }
  }
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!name.trim()) return "Vul je naam in.";
    if (!email.trim() || !email.includes("@"))
      return "Vul een geldig e-mail adres in.";
    if (!birthdate.trim()) return "Vul je geboortedatum in (YYYY-MM-DD).";
    if (!password || password.length < 6)
      return "Kies een wachtwoord van minstens 6 tekens.";
    if (!region.trim()) return "Vul je regio in.";
    return null;
  }

  async function onContinue() {
    const err = validate();
    if (err) {
      Alert.alert("Ongeldige invoer", err);
      return;
    }

    setLoading(true);
    try {
      let resp;
      const debugPayload: any = { name, email, password, birthdate, region };
      if (photoUri) {
        const form = new FormData();
        form.append("name", name);
        form.append("email", email);
        form.append("password", password);
        form.append("birthdate", birthdate);
        form.append("region", region);

        const uriParts = photoUri.split("/");
        const fileName = uriParts[uriParts.length - 1];
        const match = fileName.match(/\.([0-9a-zA-Z]+)$/);
        const ext = match ? match[1].toLowerCase() : "jpg";
        const mimeType = ext === "png" ? "image/png" : "image/jpeg";

        // @ts-ignore - React Native FormData file object
        form.append("photo", { uri: photoUri, name: fileName, type: mimeType });

        debugPayload.photo = fileName;
        console.debug("Register (admin) payload (multipart)", debugPayload);

        resp = await fetch("https://my-express-app-ne4l.onrender.com/asielen", {
          method: "POST",
          body: form as any,
        });
      } else {
        const payload = { name, email, password, birthdate, region };
        debugPayload.payload = payload;
        console.debug("Register (admin) payload (no role)", payload);

        resp = await api.post("/asielen", payload);
      }

      if (!resp.ok) {
        const text = await resp.text();
        let message = text || "Server error";
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || JSON.stringify(parsed);
        } catch {}
        console.error("admin register failed", {
          status: resp.status,
          body: text,
          payload: debugPayload,
        });
        throw new Error(`HTTP ${resp.status}: ${message}`);
      }

      const json = await resp.json();

      let token: string | null = null;
      let adminObj: any = null;

      if (json) {
        if (Array.isArray(json) && json.length > 0) {
          adminObj = json[0];
        } else if (typeof json === "object") {
          adminObj = json;
          if ((json as any).data && typeof (json as any).data === "object")
            adminObj = (json as any).data;
          if ((json as any).user && typeof (json as any).user === "object")
            adminObj = (json as any).user;
          if ((json as any).result && typeof (json as any).result === "object")
            adminObj = (json as any).result;
        }

        const possibleTokenKeys = [
          "token",
          "accessToken",
          "access_token",
          "authToken",
          "jwt",
        ];
        for (const k of possibleTokenKeys) {
          if ((json as any)[k]) {
            token = String((json as any)[k]);
            break;
          }
        }
        if (!token && adminObj && typeof adminObj === "object") {
          for (const k of possibleTokenKeys) {
            if (adminObj[k]) {
              token = String(adminObj[k]);
              break;
            }
          }
        }
      }

      if (token) {
        await SecureStore.setItemAsync("adminToken", token);
      }

      if (adminObj && (adminObj.id || adminObj._id)) {
        await SecureStore.setItemAsync("admin", JSON.stringify(adminObj));
        await SecureStore.setItemAsync(
          "adminId",
          String(adminObj.id ?? adminObj._id)
        );
      } else if (json && (json as any).id) {
        await SecureStore.setItemAsync("adminId", String((json as any).id));
      } else {
        console.warn(
          "No auth token or id found in admin register response",
          json
        );
      }

      router.replace("/admin/register-interests" as any);
    } catch (e) {
      console.error("admin register error", e);
      Alert.alert(
        "Fout",
        (e && (e as any).message) || "Er is iets misgegaan bij het registreren."
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
            Eerst even over het asiel
          </ThemedText>

          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <Text style={styles.photoBtnText}>
              {photoUri ? "Wijzig profielfoto" : "Upload profielfoto"}
            </Text>
          </TouchableOpacity>

          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : null}

          <Text style={styles.label}>Wat is je naam?</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Voornaam Achternaam"
          />

          <Text style={styles.label}>Wat is je e-mailadres?</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Wachtwoord</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Wachtwoord"
            secureTextEntry
          />

          <Text style={styles.label}>Je geboortedatum</Text>
          <TextInput
            style={styles.input}
            value={birthdate}
            onChangeText={setBirthdate}
            placeholder="DD-MM-YYYY"
          />

          <Text style={styles.label}>Regio</Text>
          <TextInput
            style={styles.input}
            value={region}
            onChangeText={setRegion}
            placeholder="Bijv. Antwerpen"
          />

          <View style={{ height: 20 }} />

          <TouchableOpacity
            style={styles.cta}
            onPress={onContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Verder</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FBF4E2" },
  container: {
    padding: 24,
    paddingTop: 40,
    alignItems: "stretch",
  },
  title: {
    fontFamily: "MontserratAlternates-SemiBold",
    color: "#3F3F3F",
    fontSize: 22,
    marginBottom: 24,
  },
  label: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    marginBottom: 6,
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    fontFamily: "Montserrat_400Regular",
  },
  cta: {
    backgroundColor: "#FDA0E9",
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: "center",
  },
  ctaText: {
    color: "#fff",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
  },
  photoBtn: {
    backgroundColor: "#fff",
    borderColor: "#eee",
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: "center",
    marginBottom: 12,
  },
  photoBtnText: {
    color: "#333",
    fontFamily: "Montserrat_600SemiBold",
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 12,
  },
});
