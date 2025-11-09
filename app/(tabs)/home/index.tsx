import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LogoHeader from "../../../components/logo-header";
import SwipeDeck from "../../../components/ui/swipe-deck";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFCF5" }}>
      <LogoHeader />
      <View style={styles.container}>
        <SwipeDeck
          items={[
            {
              imageSource: require("../../../assets/images/maurice.png"),
              name: "Maurice",
              gender: "Kater",
              age: "7 maand",
              breed: "Scottish fold",
              description:
                "Hi, ik ben Maurice, andere noemen mij dikkie. Ik vind het leuk om op de raarste posities te zitten, met mij ben je nooit verveeld.",
              tags: [
                "✂️ Gecastreerd",
                "🏠 Binnenkat",
                "Speels",
                "toff met kinderen",
                "knuffelkont",
                "rare vogel",
              ],
            },
            {
              imageUri: "https://placeimg.com/600/400/animals",
              name: "Demo 2",
              gender: "Poes",
              age: "2 jaar",
              breed: "Mixed",
              description: "Demo card from placeimg animals",
              tags: ["Speels"],
            },
            {
              imageUri: "https://placeimg.com/600/400/nature",
              name: "Demo 3",
              gender: "Poes",
              age: "1 jaar",
              breed: "Nature",
              description: "Demo card 3",
              tags: ["Kalmerend"],
            },
          ]}
        />
      </View>
    </SafeAreaView>
  );
}

export const options = {
  title: "Home",
  tabBarLabel: "Home",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  msgCard: {
    width: "92%",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  msgSender: {
    fontWeight: "700",
    marginBottom: 4,
  },
  msgText: {
    fontSize: 15,
    marginBottom: 6,
  },
  msgMeta: {
    fontSize: 12,
    color: "#666",
  },
});
