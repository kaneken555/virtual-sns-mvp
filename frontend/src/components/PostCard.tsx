import type { Post } from "../types";
import { getPersonaName, getPersonaAvatarColor, getPersonaEmoji } from "../constants/personas";
import { formatRelativeTime, formatFullDateTime } from "../utils/formatDate";
import Avatar from "./Avatar";
import { MessageCircle, Repeat2, Heart } from "lucide-react";

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="post-card">
      {/* 投稿本体 */}
      <div className="post-content">
        {/* ユーザーアバター（仮） */}
        <div className="user-avatar text-white flex-shrink-0">
          U
        </div>

        <div className="flex-1 min-w-0">
          {/* ユーザー情報 */}
          <div className="post-user-info">
            <span className="font-bold text-primary">あなた</span>
            <span className="text-secondary text-sm">@user</span>
            <span className="text-secondary">·</span>
            <span
              className="text-secondary text-sm"
              style={{ cursor: "pointer" }}
              title={formatFullDateTime(post.created_at)}
            >
              {formatRelativeTime(post.created_at)}
            </span>
          </div>

          {/* 投稿テキスト */}
          <div className="post-text">
            {post.text}
          </div>

          {/* アクションボタン */}
          <div className="post-actions">
            <button className="action-button">
              <div className="action-icon">
                <MessageCircle size={18} />
              </div>
              <span className="text-sm">{post.replies?.length || 0}</span>
            </button>
            <button className="action-button retweet">
              <div className="action-icon">
                <Repeat2 size={18} />
              </div>
            </button>
            <button className="action-button like">
              <div className="action-icon">
                <Heart size={18} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* AI返信（スレッド表示） */}
      {post.replies && post.replies.length > 0 && (
        <div className="replies-section">
          {post.replies.map((reply) => (
            <div key={reply.id} className="reply-item">
              <Avatar
                color={getPersonaAvatarColor(reply.ai_user)}
                name={getPersonaName(reply.ai_user)}
                emoji={getPersonaEmoji(reply.ai_user)}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="post-user-info">
                  <span className="font-bold text-primary">
                    {getPersonaName(reply.ai_user)}
                  </span>
                  <span className="text-secondary text-sm">@{reply.ai_user}</span>
                  <span className="text-secondary">·</span>
                  <span
                    className="text-secondary text-sm"
                    style={{ cursor: "pointer" }}
                    title={formatFullDateTime(reply.created_at)}
                  >
                    {formatRelativeTime(reply.created_at)}
                  </span>
                </div>
                <div className="post-text">
                  {reply.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
