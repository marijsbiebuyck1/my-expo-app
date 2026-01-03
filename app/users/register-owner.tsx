import * as FileSystem from 'expo-file-system';
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

// Hide the default header/title bar rendered by the Stack for this route
export const options = {
  headerShown: false,
};

export default function RegisterOwnerScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [region, setRegion] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const emailRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const birthdateRef = useRef<TextInput | null>(null);
  const regionRef = useRef<TextInput | null>(null);

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

      // handle both new and old result shapes
      // newer expo returns { canceled: false, assets: [{ uri }] } (US spelling)
      const wasCancelled =
        (result as any).cancelled ?? (result as any).canceled ?? false;
      if (!wasCancelled) {
        // @ts-ignore
        const uri =
          (result.assets && result.assets[0] && result.assets[0].uri) ||
          (result as any).uri;
        if (uri) {
          try {
            const manipulated = await ImageManipulator.manipulateAsync(
              uri,
              [{ resize: { width: 600 } }],
              { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: false }
            );
            if (manipulated && manipulated.uri) setPhotoUri(manipulated.uri);
            else setPhotoUri(uri);
          } catch (err) {
            console.warn("image manipulation failed, using original uri", err);
            setPhotoUri(uri);
          }
        }
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
    // simple YYYY-MM-DD format check to avoid backend validation errors
    const dateMatch = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateMatch.test(birthdate.trim()))
      return "Gebruik het formaat DD-MM-YYYY voor je geboortedatum.";
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
      // NOTE: the backend returned a validation error for the `role` enum.
      // Temporarily omit `role` so the server can pick its default value (or return a clearer error).

  // If user picked a photo, send multipart/form-data so backend can handle file upload.
  let resp;
  let parsedRespJson: any = null;
      // build a debug payload object for logging when something fails
      const payload = { name, email, password, birthdate, region };
      const debugPayload: any = { ...payload };
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

  // Ensure uploadable URI: copy Android content:// URIs to cache and add file:// on iOS when needed
  let uploadUri = photoUri as string;
  try {
    if (Platform.OS === 'android' && uploadUri.startsWith('content://')) {
      const fs: any = FileSystem;
      const b64 = await fs.readAsStringAsync(uploadUri, { encoding: 'base64' }).catch(() => null as string | null);
      if (b64) {
        const dest = (fs.cacheDirectory || fs.documentDirectory || '') + fileName;
        await fs.writeAsStringAsync(dest, b64, { encoding: 'base64' });
        uploadUri = dest;
      }
    }
  } catch (e) {
    console.warn('Could not copy content URI to cache, using original uri', e);
  }

  
  if (Platform.OS === 'ios' && !uploadUri.startsWith('file://')) uploadUri = 'file://' + uploadUri;

  // @ts-ignore - React Native FormData file object
  // append multiple common keys to maximize backend compatibility
  const fileField = { uri: uploadUri, name: fileName, type: mimeType } as any;
  form.append("photo", fileField);
  form.append("image", fileField);
  form.append("avatar", fileField);

        debugPayload.photo = fileName;
        console.debug("Register payload (multipart)", debugPayload);

        // Try multipart create first. Some servers / wrappers can interfere
        // with FormData; use a direct fetch() without forcing Content-Type so
        // the client can set the multipart boundary correctly. If that fails
        // fall back to the api helper which will attempt its own handling.
        try {
          const API_BASE = "https://my-express-app-ne4l.onrender.com";
          const token = await SecureStore.getItemAsync("userToken");
          const headers: Record<string, string> = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          const direct = await fetch(API_BASE + "/users", {
            method: "POST",
            // do NOT set Content-Type here; fetch will add the boundary
            body: form as any,
            headers,
          });
          resp = direct;
        } catch (fetchErr) {
          console.warn("Direct multipart create failed, falling back to api.post", fetchErr);
          resp = await api.post("/users", form as any);
        }
        if (!resp.ok) {
          const text = await resp.text();
          let message = text || "Server error";
          try {
            const parsed = JSON.parse(text);
            message = parsed.message || JSON.stringify(parsed);
          } catch {}
          console.error("register failed (multipart)", {
            status: resp.status,
            body: text,
            payload: debugPayload,
          });

          // fallback: if server reports missing required fields, try JSON create
          // without the photo and then PATCH the photo afterwards.
          if (message && /missing required fields/i.test(message)) {
            console.debug("Multipart create failed, falling back to JSON create");
            const resp2 = await api.post("/users", payload);
            if (!resp2.ok) {
              const t2 = await resp2.text();
              const errMsg = `Fallback JSON create failed: HTTP ${resp2.status}: ${t2}`;
              Alert.alert("Fout bij registratie", errMsg);
              // Stop the flow gracefully instead of throwing so the app
              // doesn't surface an uncaught exception to the user.
              return;
            }
            const json2 = await resp2.json();
            // save parsed JSON so we can reuse it later without re-reading the Response
            parsedRespJson = json2;
            // extract id from response
            const created = (Array.isArray(json2) && json2[0]) || (json2.data || json2.user || json2);
            const createdId = created?.id ?? created?._id ?? (json2 as any).id ?? null;
            if (createdId && photoUri) {
              try {
                const photoForm = new FormData();
                const fileField2 = { uri: uploadUri, name: fileName, type: mimeType } as any;
                photoForm.append("photo", fileField2);
                photoForm.append("image", fileField2);
                photoForm.append("avatar", fileField2);
                // Try direct fetch to common upload endpoints without forcing Content-Type
                const API_BASE = "https://my-express-app-ne4l.onrender.com";
                let uploaded = false;
                try {
                  const uploadUrl = `${API_BASE}/users/${createdId}/photo`;
                  // include token if we have one (might not be present yet)
                  const token = await SecureStore.getItemAsync("userToken");
                  const headers: Record<string, string> = {};
                  if (token) headers.Authorization = `Bearer ${token}`;
                  const r = await fetch(uploadUrl, { method: "POST", body: photoForm as any, headers });
                  if (r.ok) uploaded = true;
                  else {
                    const t = await r.text().catch(() => "");
                    console.warn("direct upload failed", r.status, t);
                  }
                } catch (err) {
                  console.warn("direct upload exception", err);
                }

                if (!uploaded) {
                  // try API helper PATCH then POST as fallbacks
                  try {
                    let up = await api.patch(`/users/${createdId}`, photoForm as any);
                    if (!up.ok) {
                      up = await api.post(`/users/${createdId}/photo`, photoForm as any);
                    }
                    if (!up.ok) {
                      const upText = await up.text().catch(() => "");
                      console.warn("Photo upload after create failed", up.status, upText);
                    }
                  } catch (uploadErr) {
                    console.warn("Photo upload after create error", uploadErr);
                  }
                }
              } catch (uploadErr) {
                console.warn("Photo upload after create error", uploadErr);
              }
            }

            // replace resp with resp2 so normal flow continues
            resp = resp2;
            } else {
            // not a missing-fields error -> surface original message
            const errMsg = `HTTP ${resp.status}: ${message}`;
            Alert.alert("Fout bij registratie", errMsg);
            // Stop the flow gracefully instead of throwing so the app
            // doesn't surface an uncaught exception to the user.
            return;
          }
        }
      } else {
        debugPayload.payload = payload;
        console.debug("Register payload (no role)", payload);

        resp = await api.post("/users", payload);
      }

      if (!resp.ok) {
        const text = await resp.text();
        let message = text || "Server error";
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || JSON.stringify(parsed);
        } catch {
          // not JSON, keep raw text
        }
        // Log status + raw text to help debugging server-side validation failures
        console.error("register failed", {
          status: resp.status,
          body: text,
          payload: debugPayload,
        });
  // include HTTP status in the thrown error so the alert shows more context
  const errMsg = `HTTP ${resp.status}: ${message}`;
  // surface server message in an Alert as well for faster debugging
  Alert.alert("Fout bij registratie", errMsg);
  // Stop the flow gracefully instead of throwing so the app doesn't
  // surface an uncaught exception to the user. The outer catch will
  // already log the error and show a generic alert if needed.
  return;
      }

  const json = parsedRespJson ?? (await resp.json());

      // Normalize possible response shapes and extract token + user object.
      // Backend may return: { token: '...' , user: {...} } OR { id: '...' } OR [{...}]
      let token: string | null = null;
      let userObj: any = null;

      if (json) {
        // if server returned an array, take first element
        if (Array.isArray(json) && json.length > 0) {
          userObj = json[0];
        } else if (typeof json === "object") {
          // common nested shapes
          userObj = json;
          if ((json as any).data && typeof (json as any).data === "object")
            userObj = (json as any).data;
          if ((json as any).user && typeof (json as any).user === "object")
            userObj = (json as any).user;
          if ((json as any).result && typeof (json as any).result === "object")
            userObj = (json as any).result;
        }

        // token keys to check (do NOT include 'id')
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
        // check nested token locations
        if (!token && userObj && typeof userObj === "object") {
          for (const k of possibleTokenKeys) {
            if (userObj[k]) {
              token = String(userObj[k]);
              break;
            }
          }
        }
      }

      // Persist token if found
      if (token) {
        await SecureStore.setItemAsync("userToken", token);
      }

      // Persist user object if present
      if (userObj && (userObj.id || userObj._id)) {
        await SecureStore.setItemAsync("user", JSON.stringify(userObj));
        await SecureStore.setItemAsync(
          "userId",
          String(userObj.id ?? userObj._id)
        );
      } else if (json && (json as any).id) {
        // fallback: server returned top-level id only
        await SecureStore.setItemAsync("userId", String((json as any).id));
      } else {
        console.warn("No auth token or id found in register response", json);
      }

  // success - continue onboarding to interests selection
  // replace so user cannot go back to registration
  // router types are generated; assert `any` to avoid a compile error if route type isn't present yet
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

    // New flow: validate and save the current form locally, then navigate to interests
    async function continueToInterests() {
      const err = validate();
      if (err) {
        Alert.alert("Ongeldige invoer", err);
        return;
      }

      try {
        const pending = { name, email, password, birthdate, region, photoUri };
        await SecureStore.setItemAsync("pendingRegistration", JSON.stringify(pending));
  // navigate to the interests step of onboarding
  router.push("/users/register-interests" as any);
      } catch (e) {
        console.error("Could not save pending registration", e);
        Alert.alert("Fout", "Kon niet doorgaan. Probeer opnieuw.");
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
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
            autoComplete="name"
            autoCapitalize="words"
            autoCorrect={false}
          />

          <Text style={styles.label}>Wat is je e-mailadres?</Text>
          <TextInput
            style={styles.input}
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
            style={styles.input}
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
            style={styles.input}
            value={birthdate}
            onChangeText={setBirthdate}
            placeholder="DD-MM-YYYY"
            ref={birthdateRef}
            returnKeyType="next"
            onSubmitEditing={() => regionRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>Regio</Text>
          <TextInput
            style={styles.input}
            value={region}
            onChangeText={setRegion}
            placeholder="Bijv. Antwerpen"
            ref={regionRef}
            returnKeyType="done"
            onSubmitEditing={() => onContinue()}
            blurOnSubmit={true}
          />

          <View style={{ height: 20 }} />

          <TouchableOpacity
            style={styles.cta}
            onPress={continueToInterests}
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
