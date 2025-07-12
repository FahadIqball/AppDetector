module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // presets: ['babel-preset-expo'],
  plugins: [
    // ...other plugins
    'react-native-reanimated/plugin', // 👈 MUST be last
  ],
};
