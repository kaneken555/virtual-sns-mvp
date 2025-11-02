// frontend/src/utils/formatDate.ts
import { formatDistanceToNow, format, isToday, isYesterday, isThisYear } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * X風の相対時間表示
 * - 1分未満: "たった今"
 * - 1時間未満: "3分"
 * - 24時間未満: "3時間"
 * - 昨日: "昨日"
 * - 今年: "3月15日"
 * - 去年以前: "2024年3月15日"
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // 1分未満
  if (diffInSeconds < 60) {
    return "たった今";
  }

  // 1時間未満
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分`;
  }

  // 24時間未満
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}時間`;
  }

  // 昨日
  if (isYesterday(date)) {
    return "昨日";
  }

  // 今年
  if (isThisYear(date)) {
    return format(date, "M月d日", { locale: ja });
  }

  // 去年以前
  return format(date, "yyyy年M月d日", { locale: ja });
}

/**
 * フル日時表示用（ホバー時のツールチップなどに使用）
 */
export function formatFullDateTime(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "yyyy年M月d日 HH:mm", { locale: ja });
}
