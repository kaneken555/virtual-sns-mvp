import { useState } from "react";
import { createPost } from "../../api/posts";

export function useCreatePost() {
  const [busy, setBusy] = useState(false);
  const [error, setErr] = useState<string | null>(null);

  const submit = async (text: string) => {
    setBusy(true);
    setErr(null);
    try {
      await createPost(text);
    } catch (e: any) {
      setErr(e.message || "failed");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  return { submit, busy, error };
}
