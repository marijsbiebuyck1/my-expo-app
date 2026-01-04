import { ThemedText } from "@/components/themed-text";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();

  // dev auto-login UI removed

  // removed dev-only quick navigation helpers

  // Load local Montserrat Alternates font that you've copied into assets/fonts.
  // Example filename: assets/fonts/MontserratAlternates-SemiBold.ttf
  const [fontsLoaded] = useFonts({
    "MontserratAlternates-SemiBold": require("../assets/fonts/MontserratAlternates-SemiBold.ttf"),
  });

  function goAsOwner() {
    // replace login with the tabs so user can't go back with back button
    router.replace("/users/register-owner");
  }

  function goAsShelter() {
    // route to the admin-side register-owner (shelter) flow
    router.replace("/admin/register-owner");
  }

  function goToHomeDirect() {
    // quick access to home while working on onboarding
    // go to the user home (users' tabs)
    router.replace("/users/home");
  }

  return (
    // Put the background color on the SafeAreaView so it fills full screen
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FBF4E2" }}>
      <Image
        source={require("../assets/images/pootje.png")}
        style={styles.pootje}
        resizeMode="contain"
      />
      <View style={styles.container}>
        {/* Brand group: logo + tagline */}
        <View style={styles.brand}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.alternateTag,
              fontsLoaded
                ? { fontFamily: "MontserratAlternates-SemiBold" }
                : {},
            ]}
          >
            Swipe. Match. Adopt. Forever.
          </Text>
        </View>

        {/* Action group: subtitle + buttons */}
        <View style={styles.actions}>
          <ThemedText style={styles.subtitle}>
            Kies hoe je wilt registreren:
          </ThemedText>

          <TouchableOpacity
            style={[styles.button, styles.owner]}
            onPress={goAsOwner}
          >
            <Text style={[styles.buttonText, styles.buttonTextOwner]}>
              Registreer als baasje
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.shelter]}
            onPress={goAsShelter}
          >
            <Text style={[styles.buttonText, styles.buttonTextShelter]}>
              Registreer als asiel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skip} onPress={goToHomeDirect}>
            <Text style={styles.skipText}>Ga naar home user</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skip, { marginTop: 8 }]}
            onPress={() => {
              router.replace("/admin/animals");
            }}
          >
            <Text style={styles.skipText}>Ga naar Animals (asiel)</Text>
          </TouchableOpacity>

          {/* Quick access to existing-user login */}
          <TouchableOpacity
            style={[styles.skip, { marginTop: 12 }]}
            onPress={() => router.replace("/users/login-email" as any)}
          >
            <Text style={styles.skipText}>
              Inloggen als bestaande gebruiker
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dev buttons removed */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 100,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  brand: {
    alignItems: "center",
  },
  actions: {
    width: "100%",
    alignItems: "center",
  },

  subtitle: {
    fontFamily: "Montserrat_400Regular",
    color: "#037D4E",
    marginBottom: 24,
    textAlign: "center",
    fontSize: 16,
  },

  alternateTag: {
    color: "#FF8E28",
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.6,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 4,
  },

  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: "center",
    marginBottom: 12,
  },
  owner: {
    backgroundColor: "#037D4E",
  },
  shelter: {
    borderColor: "#037D4E",
    borderWidth: 2,
  },
  buttonText: {
    fontFamily: "Montserrat_600SemiBold",
    color: "#fff",
    fontSize: 16,
  },
  buttonTextOwner: {
    color: "#fff",
  },
  buttonTextShelter: {
    color: "#037D4E",
  },
  skip: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "transparent",
    marginTop: 6,
  },
  skipText: {
    fontFamily: "Montserrat_400Regular",
    color: "#3F3F3F",
    fontSize: 15,
  },
  pootje: {
    position: "absolute",
    left: 0,
    top: 150,
    width: 100,
    height: 100,
    zIndex: 10,
    opacity: 1,
  },
});
