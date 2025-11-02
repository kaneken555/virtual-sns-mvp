import { useEffect } from "react";
import type { Post, Reply } from "../types";

type OnReply = (payload: { post_id: number; reply: Reply }) => void;

export function useSSE(onReply: OnReply) {
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const es = new EventSource(`${base}/stream`, { withCredentials: false });

    es.addEventListener("reply", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        onReply({ post_id: data.post_id, reply: data.reply });
      } catch (e) {
        console.warn("bad sse message", e);
      }
    });

    es.addEventListener("ping", () => {/* no-op */});
    es.onerror = () => { /* 接続切断時はブラウザが自動再接続 */ };

    return () => es.close();
  }, [onReply]);
}
