import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  return (
    <View style={styles.root}>
      {/* logo is rendered per-page via the LogoHeader component */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#FDA0E9",
          tabBarInactiveTintColor: "#8e8e93",
        }}
      >
        <Tabs.Screen
          name="settings/index"
          options={{
            title: "Settings",
            tabBarLabel: "Settings",
            tabBarIcon: ({ color }) => (
              <FontAwesome size={28} name="cog" color={color} />
            ),
          }}
        />

  {/* Admin tabs: Settings, Animals, Feed (Chat removed) */}

        <Tabs.Screen
          name="animals/index"
          options={{
            title: "Animals",
            tabBarLabel: "Animals",
            tabBarIcon: ({ color }) => (
              <FontAwesome size={28} name="paw" color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="feed/index"
          options={{
            title: "Feed",
            tabBarLabel: "Feed",
            tabBarIcon: ({ color }) => (
              <FontAwesome size={28} name="rss" color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFCF5",
  },

  logoWrap: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    margin: 30,
  },
  logo: {
    width: 40,
    height: 14,
    resizeMode: "contain",
  },
});
