import React, { useCallback, useEffect, useState } from "react";
import PostComposer from "../components/PostComposer";
import PostCard from "../components/PostCard";
import { useTimeline } from "../features/posts/useTimeline";
import { useSSE } from "../hooks/useSSE";
import type { Post, Reply } from "../types";
import { Sparkles } from "lucide-react";
import ThreeColumnLayout from "../layouts/ThreeColumnLayout";

export default function TimelinePage() {
  const { posts, loading, error, reload } = useTimeline(5000); // フォールバック用にポーリング残す

  const onReply = useCallback(({ post_id, reply }: { post_id: number; reply: Reply }) => {
    // 受信即時でローカルTLを更新（最小：直接書き換え）
    const el = document.getElementById("tl-cache");
    if (el) {
      const ev = new CustomEvent("tl-reply", { detail: { post_id, reply } });
      el.dispatchEvent(ev);
    }
    // 必要なら reload() を軽く叩く
  }, []);

  useSSE(onReply);

  return (
    <ThreeColumnLayout>
      <div className="timeline-container">
        <div id="tl-cache" style={{ display: "none" }} />

        {/* ヘッダー（固定） */}
        <header className="timeline-header">
          <h1 className="timeline-title">ホーム</h1>
          <button className="icon-button">
            <Sparkles size={20} />
          </button>
        </header>

        {/* 新規投稿エリア（30%） */}
        <div className="new-post-area">
          <PostComposer onPosted={reload} />
        </div>

        {/* 既存投稿エリア（70%） */}
        <div className="existing-posts-area">
          {/* ローディング */}
          {loading && (
            <div className="loading-message">
              読み込み中…
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* タイムライン */}
          {posts.map((p) => (
            <LivePost key={p.id} initial={p} />
          ))}

          {/* 空状態 */}
          {!loading && posts.length === 0 && (
            <div className="empty-state">
              <p className="empty-state-title">まだ投稿がありません</p>
              <p className="empty-state-subtitle">最初の投稿をしてみましょう！</p>
            </div>
          )}
        </div>
      </div>
    </ThreeColumnLayout>
  );
}

/** SSE到着を受けて自分のrepliesだけ差し込み表示する軽量コンポーネント */
function LivePost({ initial }: { initial: Post }) {
  const [post, setPost] = useState<Post>(initial);

  useEffect(() => {
    const el = document.getElementById("tl-cache");
    if (!el) return;
    const handler = (e: Event) => {
      const { post_id, reply } = (e as CustomEvent).detail as { post_id: number; reply: Reply };
      if (post_id === post.id) {
        setPost((old) => ({ ...old, replies: [...old.replies, reply] }));
      }
    };
    el.addEventListener("tl-reply", handler as EventListener);
    return () => el.removeEventListener("tl-reply", handler as EventListener);
  }, [post.id]);

  return <PostCard post={post} />;
}
