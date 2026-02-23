const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package.json "exports" field resolution — required for
// @reduxjs/toolkit v2 and react-redux v9 which use modern ESM exports.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
