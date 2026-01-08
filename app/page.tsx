"use client";

import { useEffect, useState } from "react";
import { supabase, Post } from "@/lib/supabase";
import { PostCard } from "@/components/feed/PostCard";
import { PostModal } from "@/components/feed/PostModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles!posts_author_id_fkey(*)
        `
        )
        .eq("post_type", "public")
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch like and comment counts for each post
      const postsWithStats = await Promise.all(
        (data || []).map(async (post) => {
          try {
            const [
              { count: likeCount },
              { count: commentCount },
              userLikeResult,
            ] = await Promise.all([
              supabase
                .from("post_likes")
                .select("*", { count: "exact", head: true })
                .eq("post_id", post.id),
              supabase
                .from("comments")
                .select("*", { count: "exact", head: true })
                .eq("post_id", post.id),
              user
                ? supabase
                    .from("post_likes")
                    .select("id")
                    .eq("post_id", post.id)
                    .eq("user_id", user.id)
                    .maybeSingle()
                : Promise.resolve({ data: null }),
            ]);

            return {
              ...post,
              like_count: likeCount || 0,
              comment_count: commentCount || 0,
              user_has_liked: !!userLikeResult?.data,
            };
          } catch (err) {
            console.error(`Error fetching stats for post ${post.id}:`, err);
            return {
              ...post,
              like_count: 0,
              comment_count: 0,
              user_has_liked: false,
            };
          }
        })
      );

      setPosts(postsWithStats);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchPosts();
    }
  }, [user, authLoading]);

  const handleLike = async (postId: string) => {
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    try {
      if (post.user_has_liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
      }

      // Refresh posts to update counts
      await fetchPosts();
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const displayLoading = loading || authLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
        <p className="text-muted-foreground">
          Discover notes from the community
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Posts Grid */}
      {displayLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No notes match your search"
              : "No notes yet. Be the first to share!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onViewPost={setSelectedPost}
              onLike={handleLike}
            />
          ))}
        </div>
      )}

      {/* Post Modal */}
      <PostModal
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
      />
    </div>
  );
}
