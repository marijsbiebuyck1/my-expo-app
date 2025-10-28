import { ThemedText } from '@/components/themed-text';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();

  const [devAutoLogin, setDevAutoLogin] = useState(false);

  useEffect(() => {
    if (__DEV__) {
      (async () => {
        try {
          const val = await SecureStore.getItemAsync('DEV_AUTO_LOGIN');
          setDevAutoLogin(val === 'true');
        } catch (e) {
          console.warn('Failed to read DEV_AUTO_LOGIN', e);
        }
      })();
    }
  }, []);

  async function toggleDevAutoLogin() {
    const next = !devAutoLogin;
    setDevAutoLogin(next);
    try {
      if (next) {
        await SecureStore.setItemAsync('DEV_AUTO_LOGIN', 'true');
      } else {
        await SecureStore.deleteItemAsync('DEV_AUTO_LOGIN');
      }
    } catch (e) {
      console.warn('Failed to write DEV_AUTO_LOGIN', e);
    }
  }

  function goToInterests() {
    // push so dev can inspect register-interest screen without changing history too much
    router.push('/register-interests');
  }

  function goToHome() {
    router.push('/home');
  }

  // Load local Montserrat Alternates font that you've copied into assets/fonts.
  // Example filename: assets/fonts/MontserratAlternates-SemiBold.ttf
  const [fontsLoaded] = useFonts({
    'MontserratAlternates-SemiBold': require('../assets/fonts/MontserratAlternates-SemiBold.ttf'),
  });

  function goAsOwner() {
    // replace login with the tabs so user can't go back with back button
    router.replace('/register-owner');
  }

  function goAsShelter() {
    router.replace('/home');
  }

  return (
      // Put the background color on the SafeAreaView so it fills full screen
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FBF4E2' }}>
        <View style={styles.container}>
          {/* Brand group: logo + tagline */}
          <View style={styles.brand}>
            <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.alternateTag, fontsLoaded ? { fontFamily: 'MontserratAlternates-SemiBold' } : {}]}>
              Swipe. Match. Adopt. Forever.
            </Text>
          </View>

          {/* Action group: subtitle + buttons */}
          <View style={styles.actions}>
            <ThemedText style={styles.subtitle}>Kies hoe je wilt registreren:</ThemedText>

            <TouchableOpacity style={[styles.button, styles.owner]} onPress={goAsOwner}>
              <Text style={[styles.buttonText, styles.buttonTextOwner]}>Registreer als baasje</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.shelter]} onPress={goAsShelter}>
              <Text style={[styles.buttonText, styles.buttonTextShelter]}>Registreer als asiel</Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && (
            <View style={{ width: '100%', alignItems: 'center', marginTop: 8 }}>
              <TouchableOpacity onPress={toggleDevAutoLogin} style={{ padding: 8 }}>
                <Text style={{ color: '#666' }}>Dev auto-login: {devAutoLogin ? 'ON' : 'OFF'} (tik om te wisselen)</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <TouchableOpacity onPress={goToInterests} style={{ padding: 8, marginRight: 12 }}>
                  <Text style={{ color: '#666' }}>Open interests</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goToHome} style={{ padding: 8 }}>
                  <Text style={{ color: '#666' }}>Open home</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  brand: {
    alignItems: 'center',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
 
  subtitle: {
    fontFamily: 'Montserrat_400Regular',
    color: '#FDA0E9',
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 16,
  },

  alternateTag: {
    color: '#FF8E28',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 4,
  },

  button: { 
    width: '100%',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 12,
  },
  owner: {

    backgroundColor: '#FDA0E9',
  },
  shelter: {
    borderColor: '#FDA0E9',
    borderWidth: 2,
  },
  buttonText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#fff',
    fontSize: 16,
  },
  buttonTextOwner: {
    color: '#fff',
  },
  buttonTextShelter: {
    color: '#FDA0E9',
  },
});
