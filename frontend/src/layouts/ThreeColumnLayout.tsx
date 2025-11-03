// frontend/src/layouts/ThreeColumnLayout.tsx
import React from "react";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
}

export default function ThreeColumnLayout({ children }: ThreeColumnLayoutProps) {
  return (
    <div className="three-column-layout">
      {/* 左サイドバー */}
      <LeftSidebar />

      {/* メインコンテンツ */}
      <main>
        {children}
      </main>

      {/* 右サイドバー */}
      <RightSidebar />
    </div>
  );
}
