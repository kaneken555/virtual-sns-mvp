import { useState } from "react";
import { useCreatePost } from "../features/posts/useCreatePost";

type Props = { onPosted?: () => void };

export default function PostComposer({ onPosted }: Props) {
  const [text, setText] = useState("");
  const { submit, busy, error } = useCreatePost();

  const onSend = async () => {
    const t = text.trim();
    if (!t) return;
    await submit(t);
    setText("");
    onPosted?.();
  };

  return (
    <div className="border rounded p-3 mb-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="いまどうしてる？"
        className="w-full border rounded p-2"
        rows={3}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={onSend}
          disabled={busy}
          className="px-3 py-1 bg-black text-white rounded"
        >
          投稿
        </button>
        {busy && <span>送信中…</span>}
        {error && <span className="text-red-600">{error}</span>}
      </div>
    </div>
  );
}
