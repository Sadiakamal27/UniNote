import { createClient } from "@supabase/supabase-js";

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Database types
export type UserRole = "user" | "group_admin" | "universal_admin";
export type PostType = "public" | "group";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  user_role: UserRole;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  status: "pending" | "approved";
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  post_type: PostType;
  approval_status: ApprovalStatus;
  group_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  folder_id: string | null;
  tags: string[] | null;
  attachments: any | null;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: Profile;
  group?: Group;
  // Extra fields for UI
  like_count?: number;
  comment_count?: number;
  user_has_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}
