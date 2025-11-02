// frontend/src/components/Avatar.tsx
import React from "react";

export type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  color: string;
  name: string;
  emoji: string;
  size?: AvatarSize;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8 text-base",
  md: "w-10 h-10 text-xl",
  lg: "w-12 h-12 text-2xl",
};

/**
 * 色付き円形アバターコンポーネント
 * ペルソナの絵文字を表示
 */
export default function Avatar({ color, name, emoji, size = "md" }: AvatarProps) {
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: color }}
      title={name}
    >
      <span className="leading-none">{emoji}</span>
    </div>
  );
}
