// screens/Home.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
// import Icon from "react-native-vector-icons/MaterialIcons";
import { Home, Map } from "../components/AppIcons";

import HomeContent from "./HomeContent";
import RouteList from "./RouteList";

const Tab = createBottomTabNavigator();

export default function Root() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // tabBarHideOnKeyboard:'true',
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          height: 60,
          paddingBottom: 0,
          paddingTop: 6,
          borderTopWidth: 0,
        },
        safeAreaInsets: { bottom: 0 },
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Home") return <Home size={size} color={color} />;
          if (route.name === "BusInfo") return <Map size={size} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeContent} />
      <Tab.Screen name="BusInfo" component={RouteList} />
    </Tab.Navigator>
  );
}
