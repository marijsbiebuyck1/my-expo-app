import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { Dimensions, StyleSheet, Text, View } from "react-native";

export default function TabLayout() {
  const windowWidth = Dimensions.get("window").width;
  const tabCount = 4; // settings, swipe, chat, feed
  const tabWidth = Math.max(64, Math.floor((windowWidth - 48) / tabCount));
  const tabBarStyleDynamic = [
    styles.floatingTabBar,
    {
      left: 20,
      right: 20,
      bottom: 18,
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
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: tabWidth,
                }}
              >
                <View
                  style={[styles.tabIconWrap, focused && styles.tabIconActive]}
                >
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
                    {"Settings"}
                  </Text>
                </View>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="home/index"
          options={{
            title: "Swipe",
            tabBarLabel: "Swipe",
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: tabWidth,
                }}
              >
                <View
                  style={[styles.tabIconWrap, focused && styles.tabIconActive]}
                >
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
                    {"Swipe"}
                  </Text>
                </View>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="chat/index"
          options={{
            title: "Chat",
            tabBarLabel: "Chat",
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: tabWidth,
                }}
              >
                <View
                  style={[styles.tabIconWrap, focused && styles.tabIconActive]}
                >
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
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="feed/index"
          options={{
            title: "Feed",
            tabBarLabel: "Feed",
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: tabWidth,
                }}
              >
                <View
                  style={[styles.tabIconWrap, focused && styles.tabIconActive]}
                >
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
    marginHorizontal: 8,
    alignSelf: "center",
    height: 72,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
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
  tabIconWrap: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  tabIconActive: {
    backgroundColor: "#f2f2f2",
    // make the active wrapper taller without moving the whole element
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: 60,
    borderRadius: 16,
  },
});
