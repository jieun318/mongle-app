const { AndroidConfig } = require("expo/config-plugins");

// 날씨(기상청 5km 격자)·해 위치는 대략 위치(COARSE)면 충분하다.
// expo-location 라이브러리 매니페스트가 ACCESS_FINE_LOCATION 을 강제로 병합하므로,
// 여기서 remove 처리해 정확위치 권한을 뺀다.
//  → Play 의 "정확 위치(FINE) 선언서" 요구를 피하고, 최소 권한 원칙에도 부합.
//  → 정확위치가 실제로 필요해지면 이 플러그인을 app.json plugins 에서 제거하면 된다.
module.exports = function withCoarseLocationOnly(config) {
  return AndroidConfig.Permissions.withBlockedPermissions(config, [
    "android.permission.ACCESS_FINE_LOCATION",
  ]);
};
