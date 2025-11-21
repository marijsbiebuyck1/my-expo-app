import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../../components/themed-text";
import { api } from "../lib/api";

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
      router.replace("/users/(tabs)/home" as any);
    } catch (err) {
      console.warn("Login failed", err);
      // err already shown above for non-OK responses, but ensure user sees something
      Alert.alert("Login mislukt", (err && (err as any).message) || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <ThemedText type="title">Inloggen</ThemedText>

        <TextInput
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Wachtwoord"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Inloggen</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBF4E2" },
  container: { flex: 1, padding: 20, alignItems: "center", justifyContent: "center" },
  input: { width: "100%", backgroundColor: "#fff", padding: 12, borderRadius: 8, marginTop: 12 },
  button: { width: "100%", padding: 14, borderRadius: 50, alignItems: "center", marginTop: 16, backgroundColor: "#FDA0E9" },
  buttonText: { color: "#fff", fontWeight: "700" },
});
