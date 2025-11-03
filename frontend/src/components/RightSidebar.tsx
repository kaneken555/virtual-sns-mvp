// frontend/src/components/RightSidebar.tsx
import { TrendingUp } from "lucide-react";

export default function RightSidebar() {
  const trends = [
    { tag: "#人工知能", count: "12.5K" },
    { tag: "#プログラミング", count: "8.2K" },
    { tag: "#SNS", count: "6.1K" },
  ];

  const recommendedUsers = [
    { name: "AIボット1", handle: "ai_bot_1", emoji: "🤖" },
    { name: "AIボット2", handle: "ai_bot_2", emoji: "🎯" },
    { name: "AIボット3", handle: "ai_bot_3", emoji: "🌟" },
  ];

  return (
    <aside className="sidebar sidebar-right">
      {/* 検索ボックス */}
      <div className="search-box">
        <div className="search-input-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)">
            <path d="M10.25 3.75a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm-8.5 6.5a8.5 8.5 0 1 1 15.176 5.262l4.781 4.781-1.414 1.414-4.781-4.781A8.5 8.5 0 0 1 1.75 10.25z"/>
          </svg>
          <input
            type="text"
            placeholder="検索"
            className="search-input"
          />
        </div>
      </div>

      {/* トレンドセクション */}
      <div className="section-card">
        <h2 className="section-title">
          <TrendingUp size={20} />
          いまどうしてる？
        </h2>
        <div className="section-items">
          {trends.map((trend, index) => (
            <div key={index} className="trend-item">
              <div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>トレンド</div>
                <div className="font-bold">{trend.tag}</div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{trend.count}件のポスト</div>
              </div>
            </div>
          ))}
        </div>
        <button className="show-more-btn">
          さらに表示
        </button>
      </div>

      {/* おすすめユーザー */}
      <div className="section-card">
        <h2 className="section-title">
          おすすめユーザー
        </h2>
        <div className="section-items">
          {recommendedUsers.map((user, index) => (
            <div key={index} className="user-recommendation">
              <div className="flex items-center gap-3">
                <div className="user-avatar text-xl">
                  {user.emoji}
                </div>
                <div>
                  <div className="font-bold text-sm">{user.name}</div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>@{user.handle}</div>
                </div>
              </div>
              <button className="follow-button">
                フォロー
              </button>
            </div>
          ))}
        </div>
        <button className="show-more-btn">
          さらに表示
        </button>
      </div>

      {/* フッター */}
      <div className="footer-links">
        <a href="#">利用規約</a>
        <span>·</span>
        <a href="#">プライバシーポリシー</a>
        <span>·</span>
        <a href="#">ヘルプ</a>
        <div className="copyright">© 2025 Virtual SNS</div>
      </div>
    </aside>
  );
}
