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
  sm: "avatar avatar-sm",
  md: "avatar avatar-md",
  lg: "avatar avatar-lg",
};

/**
 * 色付き円形アバターコンポーネント
 * ペルソナの絵文字を表示
 */
export default function Avatar({ color, name, emoji, size = "md" }: AvatarProps) {
  return (
    <div
      className={sizeClasses[size]}
      style={{ backgroundColor: color }}
      title={name}
    >
      <span style={{ lineHeight: "1" }}>{emoji}</span>
    </div>
  );
}
