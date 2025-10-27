import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#FDA0E9",
          tabBarInactiveTintColor: "#8e8e93",
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIconStyle: styles.tabIcon,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="home/index"
          options={{
            title: "Home",
            tabBarLabel: "Home",
            tabBarIcon: ({ color }) => (
              <FontAwesome size={28} name="heart" color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="chat/index"
          options={{
            title: "Chat",
            tabBarLabel: "Chat",
            tabBarIcon: ({ color }) => (
              <FontAwesome size={28} name="comments" color={color} />
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
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFCF5",
  },
  tabBar: {
    backgroundColor: "#fff",
    height: 64,
    paddingBottom: 15,
    borderTopColor: "#eee",
    borderTopWidth: 1,
    borderRadius: 80,
  },
  tabLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  tabIcon: {
    marginTop: 6,
  },
});
