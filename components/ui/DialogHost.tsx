import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { __setDialogHandler, type DialogRequest } from "@/lib/dialog";

// 앱당 하나만 마운트(루트 레이아웃). lib/dialog 의 showNotice/confirmDestructive 가
// 보낸 요청을 받아 ConfirmDialog 로 렌더한다.
export default function DialogHost() {
  const [req, setReq] = useState<DialogRequest | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    __setDialogHandler((r) => {
      setReq(r);
      setVisible(true);
    });
    return () => __setDialogHandler(null);
  }, []);

  // "확인"(notice) / "실행"(confirm) — 모달 닫고 해당 콜백 실행
  const handleConfirm = () => {
    setVisible(false);
    if (req?.kind === "notice") req.onOk?.();
    else if (req?.kind === "confirm") req.onConfirm();
  };

  // confirm 모드의 "취소" / 배경 탭 — 모달만 닫음
  const handleCancel = () => {
    setVisible(false);
  };

  const isConfirm = req?.kind === "confirm";

  return (
    <ConfirmDialog
      visible={visible}
      title={req?.title ?? ""}
      message={req?.message}
      confirmLabel={isConfirm ? req!.confirmLabel : "확인"}
      cancelLabel={isConfirm ? "취소" : undefined}
      destructive={isConfirm}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
