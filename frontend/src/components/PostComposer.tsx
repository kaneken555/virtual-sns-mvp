import { useState } from "react";
import { useCreatePost } from "../features/posts/useCreatePost";

type Props = { onPosted?: () => void };

const MAX_LENGTH = 280; // X風の文字数制限

export default function PostComposer({ onPosted }: Props) {
  const [text, setText] = useState("");
  const { submit, busy, error } = useCreatePost();

  const charCount = text.length;
  const isOverLimit = charCount > MAX_LENGTH;
  const remaining = MAX_LENGTH - charCount;

  const onSend = async () => {
    const t = text.trim();
    if (!t || isOverLimit) return;
    await submit(t);
    setText("");
    onPosted?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter で投稿
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="post-composer">
      <div className="composer-content">
        {/* ユーザーアバター */}
        <div className="user-avatar text-white flex-shrink-0">
          U
        </div>

        <div className="flex-1 min-w-0">
          {/* テキストエリア */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="いまどうしてる？"
            className="composer-textarea"
            rows={3}
            maxLength={MAX_LENGTH + 50} // 少し余裕を持たせて警告表示
          />

          {/* ボトムバー */}
          <div className="composer-bottom-bar">
            <div className="flex items-center gap-1">
              {/* アイコンボタン（見た目のみ） */}
              <button
                type="button"
                className="composer-icon-btn"
                disabled
                title="画像（未実装）"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM8 11.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5z"/>
                </svg>
              </button>
            </div>

            <div className="composer-actions">
              {/* 文字数カウンター */}
              {charCount > 0 && (
                <div className="char-counter">
                  {/* 円形プログレスバー */}
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      stroke={isOverLimit ? "#F4212E" : "var(--border-color)"}
                      strokeWidth="2"
                    />
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      stroke={isOverLimit ? "#F4212E" : "var(--accent-blue)"}
                      strokeWidth="2"
                      strokeDasharray={`${(charCount / MAX_LENGTH) * 50.265} 50.265`}
                      strokeLinecap="round"
                      transform="rotate(-90 10 10)"
                    />
                  </svg>
                  {remaining < 20 && (
                    <span className={`char-counter-text ${isOverLimit ? "over" : "normal"}`}>
                      {remaining}
                    </span>
                  )}
                </div>
              )}

              {/* 投稿ボタン */}
              <button
                onClick={onSend}
                disabled={busy || !text.trim() || isOverLimit}
                className="submit-button"
              >
                {busy ? "送信中..." : "投稿"}
              </button>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="composer-error">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
