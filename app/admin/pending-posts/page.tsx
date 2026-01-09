"use client";

import { useEffect, useState } from "react";
import { supabase, Post } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/auth-context";
import { PendingPostCard } from "@/components/admin/PendingPostCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function PendingPostsPage() {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPendingPosts = async () => {
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
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching pending posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // If auth is already loaded, fetch immediately
    if (!authLoading) {
      fetchPendingPosts();
    } else {
      // Set a timeout to fetch even if auth is taking too long (max 3 seconds)
      timeoutId = setTimeout(() => {
        fetchPendingPosts();
      }, 3000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const displayLoading = loading || authLoading;

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute requiredRole="universal_admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Posts</h1>
          <p className="text-muted-foreground">
            Review and approve public posts
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Posts List */}
        {displayLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? "No posts match your search" : "No pending posts"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredPosts.map((post) => (
              <PendingPostCard
                key={post.id}
                post={post}
                onUpdate={fetchPendingPosts}
              />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
