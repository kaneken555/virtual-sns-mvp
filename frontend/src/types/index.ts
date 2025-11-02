// frontend/src/types/index.ts

export interface Reply {
  id: number;
  post_id: number;
  text: string;
  ai_user: string;
  created_at: string;
}

export interface Post {
  id: number;
  text: string;
  created_at: string;
  replies: Reply[];
}
