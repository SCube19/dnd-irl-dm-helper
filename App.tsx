import { createStaticNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MapScreen from "./src/views/MapScreen";
import HomeScreen from "./src/views/HomeScreen";
import TestScreen from "./src/views/TestScreen";
import ImageLibraryScreen from "./src/views/ImageLibraryScreen";

const rootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        title: "Home",
        headerShown: true,
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
