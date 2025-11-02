// frontend/src/constants/personas.ts

export interface PersonaInfo {
  id: string;
  name: string;
  description?: string;
  color: string;
  bgColor: string;
  avatarColor: string; // アバター用のHEXカラー
  emoji: string; // アバター用の絵文字
}

export const PERSONAS: Record<string, PersonaInfo> = {
  listener_bot: {
    id: "listener_bot",
    name: "やさしい聞き役",
    description: "共感して寄り添うボット",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    avatarColor: "#1D9BF0", // X風ブルー
    emoji: "👂", // 聞き役なので耳
  },
  humorist_bot: {
    id: "humorist_bot",
    name: "軽口ユーモア",
    description: "ユーモアで和ませるボット",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    avatarColor: "#F91880", // X風ピンク
    emoji: "😄", // ユーモアなので笑顔
  },
  coach_bot: {
    id: "coach_bot",
    name: "やさしいコーチ",
    description: "優しく背中を押してくれるボット",
    color: "text-green-700",
    bgColor: "bg-green-50",
    avatarColor: "#00BA7C", // X風グリーン
    emoji: "💪", // コーチなので筋肉
  },
};

export function getPersonaName(personaId: string): string {
  return PERSONAS[personaId]?.name || personaId;
}

export function getPersonaColor(personaId: string): string {
  return PERSONAS[personaId]?.color || "text-gray-700";
}

export function getPersonaBgColor(personaId: string): string {
  return PERSONAS[personaId]?.bgColor || "bg-gray-50";
}

export function getPersonaAvatarColor(personaId: string): string {
  return PERSONAS[personaId]?.avatarColor || "#71767B";
}

export function getPersonaEmoji(personaId: string): string {
  return PERSONAS[personaId]?.emoji || "🤖";
}
