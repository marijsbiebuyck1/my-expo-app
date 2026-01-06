import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import {
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

export const options = {
  headerShown: false,
};

export default function AdminRegisterOwnerScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!name.trim()) return "Vul de naam van het asiel in.";
    if (!address.trim()) return "Vul het adres in.";
    if (!phone.trim()) return "Vul een telefoonnummer in.";
    if (!email.trim() || !email.includes("@"))
      return "Vul een geldig e-mailadres in.";
    if (!password.trim()) return "Kies een wachtwoord.";
    if (password.trim().length < 6)
      return "Het wachtwoord moet minstens 6 tekens bevatten.";
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
      // backend expects `address` as an object matching AddressSchema
      const payload = {
        name,
        address: { street: address },
        phone,
        email,
        password,
      };
      const resp = await api.post("/asielen", payload, true);
      if (!resp.ok) {
        const text = await resp.text();
        let message = text || "Fout op de server";
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || JSON.stringify(parsed);
        } catch {}
        throw new Error(message);
      }

      // If backend returned an auth token or admin object, persist it so the
      // admin layout won't redirect to the login screen. Be defensive about
      // possible response shapes.
      try {
        const json = await resp.json();
        if (json && typeof json === "object") {
          const token =
            (json as any).token ||
            (json as any).accessToken ||
            (json as any).adminToken ||
            (json as any).authToken;
          // some backends return the created admin/shelter under `admin` or `user`;
          // otherwise json may itself be the created resource.
          const adminObj = (json as any).admin || (json as any).user || json;

          if (token) {
            await SecureStore.setItemAsync("adminToken", String(token));
          }

          // If backend didn't return an auth token but did return the created
          // admin object, write a temporary token so the admin layout won't
          // immediately redirect to the login screen. This is a UX fallback
          // — encourage replacing it with a real token once the backend
          // supports auto-login on registration.
          if (!token && adminObj && typeof adminObj === "object") {
            const fallbackToken = `registered-temp-${Date.now()}`;
            await SecureStore.setItemAsync("adminToken", fallbackToken);
          }

          if (adminObj && typeof adminObj === "object") {
            try {
              await SecureStore.setItemAsync("admin", JSON.stringify(adminObj));
            } catch {}
            const adminId = (adminObj as any).id ?? (adminObj as any)._id;
            if (adminId) {
              await SecureStore.setItemAsync("adminId", String(adminId));
            }
          }
        }
      } catch {
        // ignore JSON parse errors — it's non-fatal here
      }

      // proceed to the admin dashboard (animals tab)
      router.replace("/admin/(tabs)/animals" as any);
    } catch (e: any) {
      console.error("admin register error", e);
      Alert.alert(
        "Fout",
        e?.message || "Er is iets misgegaan bij het registreren."
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
            Asiel
          </ThemedText>

          <Text style={styles.label}>Wat is de naam van het asiel?</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={name}
            onChangeText={setName}
            placeholder="Naam asiel"
          />

          <Text style={styles.label}>Wat is het adres?</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={address}
            onChangeText={setAddress}
            placeholder="Straatnaam 123, Stad"
          />

          <Text style={styles.label}>Telefoonnummer</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={phone}
            onChangeText={setPhone}
            placeholder="0474123456"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>E-mailadres</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={email}
            onChangeText={setEmail}
            placeholder="naam@voorbeeld.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Wachtwoord</Text>
          <TextInput
            style={[styles.input, styles.inputWithBorder]}
            value={password}
            onChangeText={setPassword}
            placeholder="Minstens 6 tekens"
            secureTextEntry
            autoCapitalize="none"
          />

          <View style={{ height: 40 }} />

          <Image
            source={require("../../assets/images/skateboard.png")}
            style={styles.skateboardSmall}
            resizeMode="contain"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* bottom fixed CTA */}
      <View style={styles.bottomBar} pointerEvents={loading ? "none" : "auto"}>
        <View style={styles.bottomBarInner}>
          <TouchableOpacity
            style={styles.cta}
            onPress={onContinue}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.ctaText}>Bezig…</Text>
            ) : (
              <Text style={styles.ctaText}>Verder</Text>
            )}
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
    fontSize: 28,
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
  inputWithBorder: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cta: {
    backgroundColor: "#037D4E",
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: "center",
    width: "100%",
  },
  ctaText: {
    color: "#fff",
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
  },
  skateboardSmall: {
    width: 450,
    height: 200,
    alignSelf: "center",
    bottom: 70,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FBF4E2",
    borderTopWidth: 1,
    borderTopColor: "#F0E9DB",
    paddingVertical: 12,
    paddingBottom: 24,
  },
  bottomBarInner: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
});
