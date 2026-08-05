const { AndroidConfig } = require("expo/config-plugins");

// 라이브러리 매니페스트가 자동 병합하지만 몽글이 실제로 쓰지 않는 권한을 뺀다.
// versionCode 9 AAB 를 뜯어 확인한 목록 기준 (실제 <uses-permission> 선언이었음).
//
// 안 빼면 스토어 권한 목록에 마이크·카메라·"다른 앱 위에 표시" 가 노출되고,
// 데이터 안전 폼의 "오디오/사진 미수집" 답변과 겉보기 불일치로 읽힌다.
//
// 남겨두는 것(뺐다가 깨지는 것들):
//   READ_EXTERNAL_STORAGE  — Android 12 이하에서 프로필 사진 선택에 필요
//   RECEIVE_BOOT_COMPLETED — 재부팅 후 로컬 알림 재등록
//   WAKE_LOCK / VIBRATE / POST_NOTIFICATIONS — 로컬 알림
//   ACCESS_COARSE_LOCATION — 날씨·일출 연출
const BLOCKED = [
  // expo-location 이 강제 병합. 날씨는 기상청 5km 격자라 대략 위치면 충분하고,
  // Play 의 "정확 위치 선언서" 요구도 피한다. 정확위치가 필요해지면 이 줄을 지운다.
  "android.permission.ACCESS_FINE_LOCATION",

  // expo-image-picker 라이브러리 매니페스트가 무조건 넣는다.
  // 몽글은 갤러리에서 고르기만 하고 촬영(launchCameraAsync)은 쓰지 않는다.
  "android.permission.CAMERA",

  // 녹음 기능 자체가 없다. AAR 의존성에서 딸려 들어왔다.
  "android.permission.RECORD_AUDIO",

  // react-native 의 debug 매니페스트(dev 메뉴 오버레이)에서 온 것인데
  // 릴리스 빌드까지 병합됐다. 프로덕션에서 쓰지 않는다.
  "android.permission.SYSTEM_ALERT_WINDOW",

  // expo-image-picker 가 넣지만 쓰지 않는다. 크롭 결과는 앱 전용 캐시에
  // 저장하므로 외부 저장소 쓰기가 필요 없고, API 29+ 에서는 무시된다.
  "android.permission.WRITE_EXTERNAL_STORAGE",
];

module.exports = function withTrimmedPermissions(config) {
  return AndroidConfig.Permissions.withBlockedPermissions(config, BLOCKED);
};
