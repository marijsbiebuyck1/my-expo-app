import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useMemo, useState } from "react";
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
import { SvgUri } from "react-native-svg";
import { ThemedText } from "../../components/themed-text";
import { clearLocalConversations } from "../../lib/localConversations";
import { ADMIN_BASE, api } from "../_lib/api";

type AccountType = "user" | "shelter";

type LoginEmailScreenProps = {
  initialAccountType?: AccountType;
  allowedAccountTypes?: AccountType[];
};
export default function LoginEmailScreen({
  initialAccountType = "user",
  allowedAccountTypes = ["user", "shelter"],
}: LoginEmailScreenProps = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedAllowedTypes =
    allowedAccountTypes && allowedAccountTypes.length > 0
      ? allowedAccountTypes
      : (["user", "shelter"] as AccountType[]);
  const initialType = normalizedAllowedTypes.includes(initialAccountType)
    ? initialAccountType
    : normalizedAllowedTypes[0] ?? "user";
  const [accountType, setAccountType] = useState<AccountType>(initialType);
  const showAccountToggle = normalizedAllowedTypes.length > 1;
  const accountCopy = accountType === "shelter" ? "asiel" : "baasje";
  const buttonLabel =
    accountType === "shelter" ? "Inloggen als asiel" : "Inloggen als baasje";
  const katSvgSource = useMemo(() => {
    try {
      const resolved = Image.resolveAssetSource(
        require("../../assets/images/kat-start.svg")
      );
      return resolved?.uri || null;
    } catch (error) {
      console.warn("Failed to resolve kat-start.svg", error);
      return null;
    }
  }, []);

  async function submit() {
    if (!email || !password) {
      Alert.alert("Vul e-mail en wachtwoord in");
      return;
    }

    const isShelterMode = accountType === "shelter";
    const loginPath = isShelterMode ? "/asielen/login" : "/users/login";
    const fallbackUrl = `${ADMIN_BASE}${loginPath}`;

    setLoading(true);
    try {
      console.debug("login attempt ->", { email, role: accountCopy });

      // Try multiple payload shapes to be compatible with different backends.
      // 1) JSON { email, password }
      // 2) JSON { username: email, password }
      // 3) form-urlencoded 'email=...&password=...'
      let res: Response | null = null;
      let lastErrMsg = "";

      const payloads = [
        { label: "json-primary", body: { email, password } },
        { label: "json-username", body: { username: email, password } },
      ];

      for (const attempt of payloads) {
        try {
          const r = await api.post(loginPath, attempt.body, isShelterMode);
          if (r.ok) {
            res = r;
            break;
          }
          const text = await r.text();
          lastErrMsg = text || `HTTP ${r.status}`;
          console.warn(`${attempt.label} login failed`, {
            mode: accountType,
            status: r.status,
            body: text,
          });
        } catch (err) {
          console.warn(`${attempt.label} login exception`, {
            mode: accountType,
            err,
          });
        }
      }

      if (!res) {
        try {
          const body = `email=${encodeURIComponent(
            email
          )}&password=${encodeURIComponent(password)}`;
          const r = await fetch(fallbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          });
          if (r.ok) res = r;
          else {
            const text = await r.text();
            lastErrMsg = text || `HTTP ${r.status}`;
            console.warn("form login failed", {
              mode: accountType,
              status: r.status,
              body: text,
            });
          }
        } catch (err) {
          console.warn("form login exception", { mode: accountType, err });
        }
      }

      if (!res) {
        const msg = lastErrMsg || "Login failed";
        Alert.alert("Login mislukt", String(msg));
        throw new Error(msg);
      }

      const json = await res.json();
      const token =
        (json as any).token ||
        (json as any).accessToken ||
        (json as any).authToken ||
        (isShelterMode ? (json as any).adminToken : null);
      const profile = isShelterMode
        ? (json as any).shelter ||
          (json as any).admin ||
          (json as any).user ||
          (json as any).data ||
          json
        : (json as any).user || (json as any).data || json;

      if (isShelterMode) {
        if (token) await SecureStore.setItemAsync("adminToken", String(token));
        if (profile) {
          await SecureStore.setItemAsync("admin", JSON.stringify(profile));
          const id =
            (profile as any).id ||
            (profile as any)._id ||
            (profile as any).shelterId ||
            (profile as any).adminId ||
            "";
          if (id) await SecureStore.setItemAsync("adminId", String(id));
        }
      } else {
        // Switching user accounts should never reuse cached chats from another user.
        clearLocalConversations();
        if (token) await SecureStore.setItemAsync("userToken", String(token));
        if (profile) {
          await SecureStore.setItemAsync("user", JSON.stringify(profile));
          const id = (profile as any).id ?? (profile as any)._id ?? "";
          if (id) await SecureStore.setItemAsync("userId", String(id));
        }
      }

      router.replace(
        isShelterMode
          ? ("/admin/(tabs)/animals" as const)
          : ("/users/home" as const)
      );
    } catch (err) {
      console.warn("Login failed", err);
      Alert.alert(
        "Login mislukt",
        (err && (err as any).message) || String(err)
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.brand}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <ThemedText style={styles.title} type="title">
              Inloggen
            </ThemedText>
            <Text style={styles.modeDescription}>
              {accountType === "shelter"
                ? "Log in om dieren te beheren als asiel of admin."
                : "Log in met je bestaande account om verder te swipen."}
            </Text>
            {accountType === "shelter" ? (
              katSvgSource ? (
                <SvgUri
                  uri={katSvgSource}
                  width={220}
                  height={180}
                  style={styles.hero}
                />
              ) : (
                <Image
                  source={require("../../assets/images/kat-start.png")}
                  style={styles.hero}
                  resizeMode="contain"
                />
              )
            ) : (
              <Image
                source={require("../../assets/images/teckel.png")}
                style={styles.hero}
                resizeMode="contain"
              />
            )}

            {showAccountToggle ? (
              <View style={styles.modeSwitcher}>
                {normalizedAllowedTypes.map((type) => {
                  const isActive = type === accountType;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.modeButton,
                        isActive && styles.modeButtonActive,
                      ]}
                      onPress={() => setAccountType(type)}
                      disabled={isActive}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text
                        style={[
                          styles.modeButtonText,
                          isActive && styles.modeButtonTextActive,
                        ]}
                      >
                        {type === "shelter" ? "Asiel" : "Baasje"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.modeHint}>
                {accountType === "shelter"
                  ? "Dit scherm is voor bestaande asielen of admins."
                  : "Dit scherm is voor bestaande baasjes."}
              </Text>
            )}

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
                placeholder="Wachtwoord"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
              />

              {/* button moved to bottom bar */}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* bottom fixed CTA */}
      <View style={styles.bottomBar} pointerEvents={loading ? "none" : "auto"}>
        <View style={styles.bottomBarInner}>
          <TouchableOpacity
            style={styles.button}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{buttonLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FBF4E2" },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
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
  modeDescription: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    textAlign: "center",
    color: "#4B4B4B",
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  modeSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 10,
    marginBottom: 4,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBE1D6",
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  modeButtonActive: {
    backgroundColor: "#037D4E",
    borderColor: "#037D4E",
  },
  modeButtonText: {
    fontFamily: "Montserrat_600SemiBold",
    color: "#037D4E",
    textAlign: "center",
    fontSize: 14,
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  modeHint: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
    color: "#5C5C5C",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  inputGap: {
    marginBottom: 24,
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderColor: "#ccc",
    borderWidth: 1,
    fontFamily: "Montserrat_400Regular",
  },
  button: {
    width: "100%",
    padding: 14,
    borderRadius: 50,
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "#037D4E",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontFamily: "Montserrat_600SemiBold",
  },
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
  hero: {
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
