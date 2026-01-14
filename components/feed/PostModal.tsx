"use client";

import { Post, Profile, Comment } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  MessageCircle,
  Calendar,
  Send,
  File,
  Image,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export const revalidate = 60;

interface PostModalProps {
  post: (Post & { author?: Profile }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostModal({ post, open, onOpenChange }: PostModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<(Comment & { author?: Profile })[]>(
    []
  );
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(post?.user_has_liked || false);
  const [likeCount, setLikeCount] = useState(post?.like_count || 0);

  useEffect(() => {
    if (post && open) {
      // Initialize with post data if available
      setLikeCount(post.like_count || 0);
      setIsLiked(post.user_has_liked || false);
      fetchComments();
      fetchLikeStatus();

      // Set up real-time subscription for this specific post
      const channel = supabase
        .channel(`post_details_${post.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "post_likes",
            filter: `post_id=eq.${post.id}`,
          },
          () => {
            fetchLikeStatus();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comments",
            filter: `post_id=eq.${post.id}`,
          },
          () => {
            fetchComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [post, open]);

  const fetchComments = async () => {
    if (!post) return;

    try {
      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          *,
          author:profiles!comments_author_id_fkey(*)
        `
        )
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const fetchLikeStatus = async () => {
    if (!post || !user) return;

    try {
      // Check if user has liked
      const { data: likeData } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .single();

      setIsLiked(!!likeData);

      // Get total like count
      const { count } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);

      setLikeCount(count || 0);
    } catch (error) {
      console.error("Error fetching like status:", error);
    }
  };

  const handleLike = async () => {
    if (!post || !user) return;

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);

        setIsLiked(false);
        setLikeCount(likeCount - 1);
      } else {
        // Like
        await supabase
          .from("post_likes")
          .insert({ post_id: post.id, user_id: user.id });

        setIsLiked(true);
        setLikeCount(likeCount + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Failed to update like");
    }
  };

  const handleAddComment = async () => {
    if (!post || !user || !newComment.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: post.id,
        author_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      await fetchComments();
      toast.success("Comment added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.author?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(post.author?.full_name || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">
                {post.author?.full_name || post.author?.email}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>
          <DialogTitle className="text-2xl">{post.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Post Content */}
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Attachments */}
          {post.attachments && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Attachments</h4>
              <div className="space-y-2">
                {Array.isArray(post.attachments) ? (
                  post.attachments.map((attachment: any, index: number) => {
                    const url =
                      typeof attachment === "string"
                        ? attachment
                        : attachment.url;
                    const name =
                      typeof attachment === "string"
                        ? `Attachment ${index + 1}`
                        : attachment.name || `Attachment ${index + 1}`;
                    const type =
                      typeof attachment === "string"
                        ? "unknown"
                        : attachment.type || "unknown";

                    const isImage =
                      type.startsWith("image/") ||
                      ["jpg", "jpeg", "png", "gif", "webp"].some((ext) =>
                        name.toLowerCase().endsWith(`.${ext}`)
                      );
                    const isPdf =
                      type === "application/pdf" ||
                      name.toLowerCase().endsWith(".pdf");

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isImage ? (
                            <Image className="h-5 w-5 text-blue-500 shrink-0" />
                          ) : isPdf ? (
                            <File className="h-5 w-5 text-red-500 shrink-0" />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-500 shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {name}
                          </span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(url, "_blank")}
                            className="h-8"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="h-8"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No attachments available
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Like and Comment Counts */}
          <div className="flex items-center gap-4 py-2">
            <Button
              variant={isLiked ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={handleLike}
              disabled={!user}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              <span>
                {likeCount} {likeCount === 1 ? "Like" : "Likes"}
              </span>
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>
                {comments.length}{" "}
                {comments.length === 1 ? "Comment" : "Comments"}
              </span>
            </div>
          </div>

          <Separator />

          {/* Comments Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Comments</h3>

            {/* Add Comment */}
            {user && (
              <div className="flex gap-3">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  disabled={loading}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={comment.author?.avatar_url || undefined}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(comment.author?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">
                          {comment.author?.full_name || comment.author?.email}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
