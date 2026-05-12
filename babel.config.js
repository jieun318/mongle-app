module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-reanimated v4 / react-native-keyboard-controller 가 요구.
    // 반드시 plugins 배열의 마지막에 위치해야 함.
    plugins: ["react-native-worklets/plugin"],
  };
};
