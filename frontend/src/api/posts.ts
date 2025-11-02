import { apiGet, apiPost } from "./client";
import type { Post } from "../types";

export const fetchPosts = () => apiGet<Post[]>("/posts");
export const createPost = (text: string) => apiPost<Post>("/posts", { text });
