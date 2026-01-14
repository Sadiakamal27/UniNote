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

  // Fetch posts
  const fetchPosts = async () => {
    try {
      console.log("Fetching posts...");
      setLoading(true);

      const { data, error } = await supabase
        .from("posts")
        .select(`*, author:profiles!posts_author_id_fkey(*)`)
        .eq("post_type", "public")
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

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
          } catch {
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
      console.log("Fetch posts completed.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      // Call async function inside effect
      fetchPosts();
    }
    // No return needed here because there's no cleanup
  }, [authLoading, user?.id]);

  // Real-time subscriptions
  useEffect(() => {
    if (authLoading) return;

    const channel = supabase
      .channel("feed_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        (payload) => {
          const newPost = payload.new as Partial<Post> | null;
          const oldPost = payload.old as Partial<Post> | null;

          setPosts((currentPosts) => {
            if (payload.eventType === "INSERT" && newPost) {
              return [newPost as Post, ...currentPosts];
            }
            if (payload.eventType === "UPDATE" && newPost) {
              return currentPosts.map((p) =>
                p.id === newPost.id ? { ...p, ...newPost } : p
              );
            }
            if (payload.eventType === "DELETE" && oldPost) {
              return currentPosts.filter((p) => p.id !== oldPost.id);
            }
            return currentPosts;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes" },
        (payload) => {
          const newLike = payload.new as {
            post_id?: string;
            user_id?: string;
          } | null;
          const oldLike = payload.old as {
            post_id?: string;
            user_id?: string;
          } | null;

          setPosts((currentPosts) =>
            currentPosts.map((post) => {
              if (post.id !== newLike?.post_id && post.id !== oldLike?.post_id)
                return post;

              const increment = payload.eventType === "INSERT" ? 1 : -1;
              const userLiked =
                payload.eventType === "INSERT"
                  ? newLike?.user_id === user?.id
                  : oldLike?.user_id === user?.id
                  ? false
                  : post.user_has_liked;

              return {
                ...post,
                like_count: Math.max(0, (post.like_count || 0) + increment),
                user_has_liked: userLiked,
              };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments" },
        (payload) => {
          const newComment = payload.new as { post_id?: string } | null;
          const oldComment = payload.old as { post_id?: string } | null;

          setPosts((currentPosts) =>
            currentPosts.map((post) => {
              if (
                post.id !== newComment?.post_id &&
                post.id !== oldComment?.post_id
              )
                return post;

              const increment = payload.eventType === "INSERT" ? 1 : -1;
              return {
                ...post,
                comment_count: Math.max(
                  0,
                  (post.comment_count || 0) + increment
                ),
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, user?.id]);

  // Handle like/unlike
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feed</h1>
        <p className="text-muted-foreground">
          Discover notes from the community
        </p>
      </div>

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

      <PostModal
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => !open && setSelectedPost(null)}
        onPostDeleted={() => {
          setSelectedPost(null);
          fetchPosts(); // Refresh the feed
        }}
      />
    </div>
  );
}
