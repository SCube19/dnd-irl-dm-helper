import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import MapScreen from "./src/views/MapScreen";
import HomeScreen from "./src/views/HomeScreen";

const rootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        title: "Home",
        headerShown: false,
      },
    },
    Map: {
      screen: MapScreen,
      options: {
        title: "Map Screen",
      },
    },
  },
});

const Navigation = createStaticNavigation(rootStack);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Navigation />
    </GestureHandlerRootView>
  );
}
