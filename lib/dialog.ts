// 인앱 다이얼로그 imperative API.
// 시스템 Alert.alert(네이티브)/window.alert(웹) 대신, 앱 디자인에 맞는 커스텀 모달
// (components/ui/ConfirmDialog)을 전역 <DialogHost/> 가 띄운다.
// 호출부는 이 모듈의 showNotice/confirmDestructive 만 부르면 되고, 실제 렌더는 host 담당.

export type DialogRequest =
  | { kind: "notice"; title: string; message?: string; onOk?: () => void }
  | {
      kind: "confirm";
      title: string;
      message: string;
      confirmLabel: string;
      onConfirm: () => void;
    };

// <DialogHost/> 가 마운트되며 자신을 등록한다. (앱당 하나)
let handler: ((req: DialogRequest) => void) | null = null;

export function __setDialogHandler(h: ((req: DialogRequest) => void) | null) {
  handler = h;
}

// 단순 알림(버튼 1개). onOk 는 사용자가 "확인"을 누른 뒤 실행된다(화면 이동 등).
export function showNotice(title: string, message?: string, onOk?: () => void) {
  if (handler) {
    handler({ kind: "notice", title, message, onOk });
  } else {
    // host 가 아직 없으면(이론상 없음) 최소한 후속 흐름은 끊기지 않게 한다.
    onOk?.();
  }
}

// 취소/실행 2지선다. 사용자가 실행을 택했을 때만 onConfirm 호출.
export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
) {
  handler?.({ kind: "confirm", title, message, confirmLabel, onConfirm });
}
