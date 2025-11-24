import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { Dimensions, StyleSheet, Text, View } from "react-native";

export default function TabLayout() {
  const windowWidth = Dimensions.get("window").width;
  const tabCount = 3; // settings, animals, feed
  const tabWidth = Math.max(64, Math.floor((windowWidth - 48) / tabCount));
  const tabBarStyleDynamic = [
    styles.floatingTabBar,
    {
      left: 40,
      right: 40,
      bottom: 20,
    },
  ];

  return (
    <View style={styles.root}>
      {/* logo is rendered per-page via the LogoHeader component */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#AEBA40",
          tabBarInactiveTintColor: "#8e8e93",
          tabBarStyle: tabBarStyleDynamic,
          tabBarShowLabel: false,
          tabBarItemStyle: { paddingTop: 6 },
        }}
      >
        <Tabs.Screen
          name="settings/index"
          options={{
            title: "Settings",
            tabBarLabel: "Settings",
            tabBarIcon: ({ color }) => (
              <View style={{ alignItems: "center", width: tabWidth }}>
                <FontAwesome size={24} name="cog" color={color} />
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, marginTop: 4, color, textAlign: "center" }}
                >
                  {"Settings"}
                </Text>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="animals/index"
          options={{
            title: "Animals",
            tabBarLabel: "Animals",
            tabBarIcon: ({ color }) => (
              <View style={{ alignItems: "center", width: tabWidth }}>
                <FontAwesome size={24} name="paw" color={color} />
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, marginTop: 4, color, textAlign: "center" }}
                >
                  {"Animals"}
                </Text>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="feed/index"
          options={{
            title: "Feed",
            tabBarLabel: "Feed",
            tabBarIcon: ({ color }) => (
              <View style={{ alignItems: "center", width: tabWidth }}>
                <FontAwesome size={24} name="rss" color={color} />
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 11, marginTop: 4, color, textAlign: "center" }}
                >
                  {"Feed"}
                </Text>
              </View>
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
  floatingTabBar: {
    position: "absolute",
    marginHorizontal: 12,
    alignSelf: "center",
    height: 72,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 40,
  },
});
