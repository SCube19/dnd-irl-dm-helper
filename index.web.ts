import { registerRootComponent } from "expo";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

LoadSkiaWeb({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/canvaskit-wasm@0.40.0/bin/full/${file}`,
}).then(async () => {
  const App = (await require("./App")).default;
  registerRootComponent(App);
});
