import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MapScreen from "./src/views/MapScreen";
import HomeScreen from "./src/views/HomeScreen";

const rootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: MapScreen,
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
  return <Navigation />;
}
