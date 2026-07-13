// Metro configuration for the Karia Expo app.
// Watches the shared package (outside the app root) so changes hot-reload,
// while resolving dependencies from the app's own node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "../..");
const sharedRoot = path.resolve(repoRoot, "packages/shared");

const config = getDefaultConfig(projectRoot);

// Let Metro see files in the shared package.
config.watchFolders = [sharedRoot];

// Resolve modules from the app first, then the repo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(repoRoot, "node_modules"),
];

module.exports = config;
