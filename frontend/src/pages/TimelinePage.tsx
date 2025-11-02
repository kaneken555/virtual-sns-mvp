import React, { useCallback, useEffect, useState } from "react";
import PostComposer from "../components/PostComposer";
import PostCard from "../components/PostCard";
import { useTimeline } from "../features/posts/useTimeline";
import { useSSE } from "../hooks/useSSE";
import type { Post, Reply } from "../types";

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
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Virtual SNS</h1>
      <div id="tl-cache" style={{ display: "none" }} />
      <PostComposer onPosted={reload} />

      {loading && <div>読み込み中…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {posts.map((p) => (
        <LivePost key={p.id} initial={p} />
      ))}

      {!loading && posts.length === 0 && <div>投稿がありません</div>}
    </div>
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
