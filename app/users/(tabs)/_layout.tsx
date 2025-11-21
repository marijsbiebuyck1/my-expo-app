import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const windowWidth = Dimensions.get("window").width;
  // subtract pill horizontal padding (12*2) and some gutter; divide by 4 tabs
  const tabWidth = Math.max(64, Math.floor((windowWidth - 48) / 4));
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
          // We'll render labels manually inside tabBarIcon to ensure they're visible
          tabBarShowLabel: false,
          tabBarItemStyle: { paddingTop: 6 },
        }}
      >
        <Tabs.Screen
          name="settings/index"
          options={{
            title: "Profile",
            tabBarLabel: "Profile",
            tabBarIcon: ({ color }) => (
              <View style={{ alignItems: "center", width: tabWidth }}>
                <FontAwesome size={24} name="cog" color={color} />
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color,
                    textAlign: "center",
                  }}
                >
                  {"Profile"}
                </Text>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="chat/index"
          options={{
            title: "Chat",
            tabBarLabel: "Chat",
            tabBarIcon: ({ color }) => (
              <View style={{ alignItems: "center", width: tabWidth }}>
                <FontAwesome size={24} name="comments" color={color} />
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color,
                    textAlign: "center",
                  }}
                >
                  {"Chat"}
                </Text>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="home/index"
          options={{
            title: "Home",
            tabBarLabel: "Home",
            tabBarIcon: ({ color }) => (
              <View style={{ alignItems: "center", width: tabWidth }}>
                <FontAwesome size={24} name="heart" color={color} />
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color,
                    textAlign: "center",
                  }}
                >
                  {"Home"}
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
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                    color,
                    textAlign: "center",
                  }}
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
    // keep explicit left/right via dynamic style, but add marginHorizontal
    // and alignSelf to ensure the pill doesn't touch the screen edge.
    marginHorizontal: 12,
    alignSelf: "center",
    // increase height slightly so labels have room beneath the icons
    height: 72,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    // distribute tabs evenly so each tab gets similar width
    justifyContent: "space-evenly",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 40,
  },
});
