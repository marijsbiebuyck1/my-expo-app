import { ThemedText } from "@/components/themed-text";
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
import { api } from "../_lib/api";

export const options = { headerShown: false };

export default function RegisterOwnerScreen() {
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
        mediaTypes: ["Images"] as any,
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.7,
      });
      const wasCancelled =
        (result as any).cancelled ?? (result as any).canceled ?? false;
      if (!wasCancelled) {
        // @ts-ignore
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
    if (err) return Alert.alert("Ongeldige invoer", err);

    setLoading(true);
    try {
  let resp;
  let parsedRespJson: any = null;
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
  // @ts-ignore
  const fileField = { uri: photoUri, name: fileName, type: mimeType } as any;
  // append multiple keys commonly used by servers to increase compatibility
  form.append("photo", fileField);
  form.append("image", fileField);
  form.append("avatar", fileField);
        debugPayload.photo = fileName;
        resp = await fetch("https://my-express-app-ne4l.onrender.com/users", {
          method: "POST",
          // do NOT set Content-Type so the runtime adds the multipart boundary
          body: form as any,
        });
        // If the server doesn't parse multipart bodies correctly it may
        // return a 400 listing missing required fields. In that case try a
        // fallback: create the user with JSON (no photo) and then upload
        // the photo in a second request.
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          let message = text || "Server error";
          try {
            const parsed = JSON.parse(text);
            message = parsed.message || JSON.stringify(parsed);
          } catch {}
          console.error("register failed (multipart)", { status: resp.status, body: text, debugPayload });
          if (message && /missing required fields/i.test(message)) {
            // fallback: create without photo
            const payload = { name, email, password, birthdate, region };
            const resp2 = await api.post("/users", payload);
            if (!resp2.ok) {
              const t2 = await resp2.text().catch(() => "");
              const errMsg = `Fallback JSON create failed: HTTP ${resp2.status}: ${t2}`;
              Alert.alert("Fout bij registratie", errMsg);
              return;
            }
            // try uploading photo to the user's photo endpoint
            try {
              const json2 = await resp2.json().catch(() => null);
              // save parsed JSON so we can reuse it later without re-reading the Response
              parsedRespJson = json2;
              const created = (Array.isArray(json2) && json2[0]) || (json2 && (json2.data || json2.user || json2));
              const createdId = created?.id ?? created?._id ?? (json2 as any)?.id ?? null;
              if (createdId) {
                const photoForm = new FormData();
                // @ts-ignore
                photoForm.append("photo", { uri: photoUri, name: fileName, type: mimeType });
                // try direct upload first
                const uploadUrl = `https://my-express-app-ne4l.onrender.com/users/${createdId}/photo`;
                // include token if present (some backends require auth for uploads)
                const uploadToken = await SecureStore.getItemAsync("userToken");
                const uploadHeaders: Record<string, string> = {};
                if (uploadToken) uploadHeaders.Authorization = `Bearer ${uploadToken}`;
                const r = await fetch(uploadUrl, { method: "POST", body: photoForm as any, headers: uploadHeaders });
                if (!r.ok) {
                  const bodyText = await r.text().catch(() => "");
                  console.warn("direct upload failed", r.status, bodyText);
                  // fallback to api helper attempts
                  let up = await api.patch(`/users/${createdId}`, photoForm as any);
                  if (!up.ok) up = await api.post(`/users/${createdId}/photo`, photoForm as any);
                  if (!up.ok) {
                    const upText = await up.text().catch(() => "");
                    console.warn("fallback upload also failed", up.status, upText);
                  }
                }
              }
            } catch (uploadErr) {
              console.warn("Photo upload after JSON create failed", uploadErr);
            }
            // continue with resp2 as the successful create response
            resp = resp2;
          }
        }
      } else {
        const payload = { name, email, password, birthdate, region };
        debugPayload.payload = payload;
        resp = await api.post("/users", payload);
      }

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        let message = text || "Server error";
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || JSON.stringify(parsed);
        } catch {}
        // surface server message and stop gracefully
        const errMsg = `HTTP ${resp.status}: ${message}`;
        Alert.alert("Fout bij registratie", errMsg);
        console.error("register failed", { status: resp.status, body: text, debugPayload });
        return;
      }

  const json = parsedRespJson ?? (await resp.json());
      let token: string | null = null;
      let userObj: any = null;

      if (json) {
        if (Array.isArray(json) && json.length > 0) userObj = json[0];
        else if (typeof json === "object") {
          userObj = json;
          if ((json as any).data && typeof (json as any).data === "object")
            userObj = (json as any).data;
          if ((json as any).user && typeof (json as any).user === "object")
            userObj = (json as any).user;
          if ((json as any).result && typeof (json as any).result === "object")
            userObj = (json as any).result;
        }
        const possibleTokenKeys = [
          "token",
          "accessToken",
          "access_token",
          "authToken",
          "jwt",
        ];
        for (const k of possibleTokenKeys)
          if ((json as any)[k]) {
            token = String((json as any)[k]);
            break;
          }
        if (!token && userObj && typeof userObj === "object")
          for (const k of possibleTokenKeys)
            if (userObj[k]) {
              token = String(userObj[k]);
              break;
            }
      }

      if (token) await SecureStore.setItemAsync("userToken", token);
      if (userObj && (userObj.id || userObj._id)) {
        await SecureStore.setItemAsync("user", JSON.stringify(userObj));
        await SecureStore.setItemAsync(
          "userId",
          String(userObj.id ?? userObj._id)
        );
      } else if (json && (json as any).id)
        await SecureStore.setItemAsync("userId", String((json as any).id));

      router.replace("/users/register-interests" as any);
    } catch (e) {
      console.error("register error", e);
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
            Eerst even over jou
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
            placeholder="YYYY-MM-DD"
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
  container: { padding: 30, paddingTop: 40, alignItems: "stretch" },
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
    borderRadius: 10,
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
  photoBtnText: { color: "#333", fontFamily: "Montserrat_600SemiBold" },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: "center",
    marginBottom: 12,
  },
});
