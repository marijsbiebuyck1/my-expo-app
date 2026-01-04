import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { api } from "../_lib/api";

export default function LoginEmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email || !password) {
      Alert.alert("Vul e-mail en wachtwoord in");
      return;
    }
    setLoading(true);
    try {
      console.debug("login attempt ->", { email });

      // Try multiple payload shapes to be compatible with different backends.
      // 1) JSON { email, password }
      // 2) JSON { username: email, password }
      // 3) form-urlencoded 'email=...&password=...'
      let res: Response | null = null;
      let lastErrMsg = "";

      try {
        res = await api.post("/users/login", { email, password });
        if (!res.ok) {
          const text = await res.text();
          lastErrMsg = text || `HTTP ${res.status}`;
          console.warn("login attempt 1 failed", { status: res.status, body: text });
          res = null;
        }
      } catch (err) {
        console.warn("login attempt 1 exception", err);
        res = null;
      }

      if (!res) {
        try {
          res = await api.post("/users/login", { username: email, password });
          if (!res.ok) {
            const text = await res.text();
            lastErrMsg = text || `HTTP ${res.status}`;
            console.warn("login attempt 2 failed", { status: res.status, body: text });
            res = null;
          }
        } catch (err) {
          console.warn("login attempt 2 exception", err);
          res = null;
        }
      }

      if (!res) {
        try {
          // fallback to form-urlencoded
          const url = "https://my-express-app-ne4l.onrender.com/users/login";
          const body = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          });
          if (r.ok) res = r;
          else {
            const text = await r.text();
            lastErrMsg = text || `HTTP ${r.status}`;
            console.warn("login attempt 3 failed", { status: r.status, body: text });
          }
        } catch (err) {
          console.warn("login attempt 3 exception", err);
        }
      }

      if (!res) {
        const msg = lastErrMsg || "Login failed";
        Alert.alert("Login mislukt", String(msg));
        throw new Error(msg);
      }

      const json = await res.json();
      // Expecting { token, user }
      const token = (json as any).token;
      const user = (json as any).user || (json as any).data || json;
      if (token) await SecureStore.setItemAsync("userToken", String(token));
      if (user) {
        await SecureStore.setItemAsync("user", JSON.stringify(user));
        const id = (user.id ?? user._id ?? "") as string;
        if (id) await SecureStore.setItemAsync("userId", String(id));
      }

      // navigate to users home
      router.replace("/users/home" as any);
    } catch (err) {
      console.warn("Login failed", err);
      Alert.alert("Login mislukt", (err && (err as any).message) || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
        </View>

  <ThemedText style={styles.title} type="title">Inloggen</ThemedText>
  <Image source={require("../../assets/images/teckel.png")} style={styles.teckel} resizeMode="contain" />

  <View style={styles.centerGroup}>
          <Text style={styles.label}>E-mailadres</Text>
          <TextInput
            placeholder="naam@voorbeeld.com"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, styles.inputGap]}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Wachtwoord</Text>
          <TextInput
            placeholder ="Wachtwoord"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />

          {/* button moved to bottom bar */}
        </View>
      </View>

      {/* bottom fixed CTA */}
      <View style={styles.bottomBar} pointerEvents={loading ? 'none' : 'auto'}>
        <View style={styles.bottomBarInner}>
          <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Inloggen</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.iconRowTop}>
        <TouchableOpacity
          style={[styles.roundButton, styles.homeButton]}
          onPress={() => router.replace("/users/home" as any)}
        >
          <Ionicons name="person" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity
          style={[styles.roundButton, styles.animalsButton]}
          onPress={() => router.replace("/admin/animals" as any)}
        >
          <Ionicons name="paw" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBF4E2" },
  container: { flex: 1, padding: 20, paddingTop: 40, alignItems: "stretch", justifyContent: "flex-start" },
  centerGroup: {
    alignItems: "center",
    width: "100%",
    flex: 0.6,
    justifyContent: "center",
    marginTop: 6,
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
  title: {
    fontFamily: "MontserratAlternates-SemiBold",
    fontSize: 28,
    textAlign: "center",
  },
  inputGap: {
    marginBottom: 24,
  },
  input: { width: "100%", backgroundColor: "#fff", padding: 12, borderRadius: 8, marginTop: 12, borderColor: "#ccc", borderWidth: 1, fontFamily: "Montserrat_400Regular" },
  button: { width: "100%", padding: 14, borderRadius: 50, alignItems: "center", marginTop: 16, backgroundColor: "#037D4E" },
  buttonText: { color: "#fff", fontWeight: "700", fontFamily: "Montserrat_600SemiBold" },
  label: {
    fontFamily: "Montserrat_700Bold",
    fontSize: 16,
    marginBottom: 6,
    color: "#333",
    alignSelf: "flex-start",
    textAlign: "left",
  },
  brand: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 8,
  },
  teckel: {
    width: 200,
    height: 180,
    alignSelf: "center",
    marginBottom: 4,
  },
  iconRowTop: {
    position: "absolute",
    top: 60,
    right: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  iconRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 20,
    marginBottom: 8,
  },
  roundButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  homeButton: {
    backgroundColor: "#037D4E",
  },
  animalsButton: {
    backgroundColor: "#AEBA40",
  },
});
