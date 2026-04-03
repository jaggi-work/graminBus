import * as React from 'react';
import { useEffect } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { enableFreeze } from 'react-native-screens';

// ✅ Enable Freeze for performance
enableFreeze(true);

import { openDB } from "./src/db/localDB.js";
import { initStaticDataSync } from "./src/db/syncBootstrap.js";

// Import screens
import Root from './src/screens/Root.js';
import GetBuses from './src/screens/GetBuses.js';
import BusMap from './src/screens/BusMap.js';
import DriverHome from './src/screens/DriverHome.js';
import DriverLogin from './src/screens/DriverLogin.js';
import BusList from './src/screens/BusList.js';
import BusDetailsScreen from './src/screens/BusDetailsScreen.js';
import OtpScreen from './src/screens/OtpScreen.js';

const Stack = createNativeStackNavigator();

// ✅ Native-optimized options
const defaultScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  // Note: freezeOnBlur is handled by enableFreeze(true) globally
};

export default function App() {

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await openDB();
        await initStaticDataSync();   // await so first-install blocking sync finishes before UI reads
        console.log("🚀 App bootstrap completed");
      } catch (e) {
        console.error("Bootstrap error:", e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={defaultScreenOptions}
          initialRouteName="Root"
        >
          <Stack.Screen name="Root" component={Root} />
          <Stack.Screen name="GetBuses" component={GetBuses} />
          <Stack.Screen name="BusMap" component={BusMap} />
          <Stack.Screen name="DriverLogin" component={DriverLogin} />
          <Stack.Screen name="DriverHome" component={DriverHome} />
          <Stack.Screen name="BusList" component={BusList} />
          <Stack.Screen
            name="BusDetailsScreen"
            component={BusDetailsScreen}
            options={{ animation: 'slide_from_right' }} 
          />
          <Stack.Screen name="OtpScreen" component={OtpScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}