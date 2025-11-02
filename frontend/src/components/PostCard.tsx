import type { Post } from "../types";

export default function PostCard({ post }: { post: Post }) {
  return (
    <div className="border rounded p-3 mb-3">
      <div className="text-sm text-gray-500">
        {new Date(post.created_at).toLocaleString()}
      </div>
      <div className="mt-1 whitespace-pre-wrap">{post.text}</div>

      {post.replies?.length > 0 && (
        <div className="mt-3 pl-3 border-l">
          {post.replies.map((r) => (
            <div key={r.id} className="mb-2">
              <div className="text-xs text-gray-500">
                {r.ai_user}・{new Date(r.created_at).toLocaleTimeString()}
              </div>
              <div>{r.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
