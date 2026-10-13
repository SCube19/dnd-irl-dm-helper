const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm");

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  fs: path.resolve(__dirname, "src/empty.js"),
  path: path.resolve(__dirname, "src/empty.js"),
};

module.exports = withNativeWind(config, { input: "./src/styles/global.css" });
