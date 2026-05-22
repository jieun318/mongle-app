import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const FORTUNE_NOTIF_ID = "fortune-daily-reminder";
const ANDROID_CHANNEL_ID = "fortune";

const DREAM_REMINDER_ID = "dream-daily-reminder";
const DREAM_ANDROID_CHANNEL_ID = "dream-reminder";

export const FORTUNE_NOTIF_ENABLED_KEY = "fortune.notify.enabled";
export const FORTUNE_NOTIF_TIME_KEY = "fortune.notify.time"; // "HH:MM"
export const DEFAULT_FORTUNE_NOTIF_TIME = "09:00";

export const DREAM_REMINDER_TIME_KEY = "dream.reminder.time"; // "HH:MM"
export const DEFAULT_DREAM_REMINDER_TIME = "08:00";

// 앱 시작 시 1회 호출 — foreground 에서도 알림이 보이도록
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "운세 알림",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function scheduleDailyFortune(
  hour: number,
  minute: number,
): Promise<boolean> {
  await ensureAndroidChannel();
  await cancelDailyFortune();

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: FORTUNE_NOTIF_ID,
      content: {
        title: "오늘의 운세가 기다리고 있어요 🔮",
        body: "구슬을 살며시 눌러 오늘의 메시지를 확인해보세요.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyFortune(): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier === FORTUNE_NOTIF_ID) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}

async function ensureDreamReminderChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(DREAM_ANDROID_CHANNEL_ID, {
      name: "꿈 기록 리마인드",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function scheduleDreamReminder(
  hour: number,
  minute: number,
): Promise<boolean> {
  await ensureDreamReminderChannel();
  await cancelDreamReminder();

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: DREAM_REMINDER_ID,
      content: {
        title: "어젯밤 어떤 꿈을 꾸셨나요? 🌙",
        body: "지금 적지 않으면 금방 잊어버려요. 오늘의 꿈을 기록해보세요.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDreamReminder(): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier === DREAM_REMINDER_ID) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {}
}

export function parseHHMM(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(":").map((s) => Number(s));
  return {
    hour: isNaN(h) ? 9 : h,
    minute: isNaN(m) ? 0 : m,
  };
}

export function formatHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatTimeKR(hour: number, minute: number): string {
  const period = hour < 12 ? "오전" : "오후";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${h12}:${String(minute).padStart(2, "0")}`;
}

export function timeStringToDate(hhmm: string): Date {
  const { hour, minute } = parseHHMM(hhmm);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}
