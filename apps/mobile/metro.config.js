// Permite importar a lógica compartilhada de packages/shared (monorepo).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [path.join(monorepoRoot, 'packages')];
config.resolver.nodeModulesPaths = [path.join(projectRoot, 'node_modules')];
config.resolver.extraNodeModules = { '@bfr/shared': path.join(monorepoRoot, 'packages/shared/src') };

module.exports = config;
