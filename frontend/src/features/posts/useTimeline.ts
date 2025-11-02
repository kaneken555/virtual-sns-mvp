import { useEffect, useState, useCallback } from "react";
import { fetchPosts } from "../../api/posts";
import type { Post } from "../../types";

export function useTimeline(pollMs = 3000) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchPosts();
      setPosts(data);
      setErr(null);
    } catch (e: any) {
      setErr(e.message || "failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  return { posts, loading, error, reload: load, setPosts };
}
