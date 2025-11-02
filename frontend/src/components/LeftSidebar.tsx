// frontend/src/components/LeftSidebar.tsx
import { Home, Search, Bell, Mail, User, Edit } from "lucide-react";

export default function LeftSidebar() {
  const menuItems = [
    { icon: Home, label: "ホーム", active: true },
    { icon: Search, label: "探す", active: false },
    { icon: Bell, label: "通知", active: false },
    { icon: Mail, label: "メッセージ", active: false },
    { icon: User, label: "プロフィール", active: false },
  ];

  return (
    <aside className="sidebar sidebar-left">
      {/* ロゴ */}
      <div className="logo-container">
        <div className="logo-circle">
          <span>✨</span>
        </div>
      </div>

      {/* ナビゲーションメニュー */}
      <nav className="nav-menu">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`nav-item ${item.active ? "active" : ""}`}
          >
            <item.icon size={26} />
            <span className="text-xl">{item.label}</span>
          </button>
        ))}

        {/* 投稿ボタン */}
        <button className="post-button">
          <Edit size={20} />
          <span>投稿する</span>
        </button>
      </nav>

      {/* ユーザープロフィール（フッター） */}
      <div className="user-profile">
        <div className="flex items-center gap-3">
          <div className="user-avatar">
            U
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">あなた</div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>@user</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
