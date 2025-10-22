import { registerRootComponent } from "expo";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

//Change later to deferred load component
LoadSkiaWeb().then(async () => {
  const App = (await require("./App.tsx")).default;
  registerRootComponent(App);
});
