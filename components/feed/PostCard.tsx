"use client";

import { Post, Profile } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Eye, Calendar, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface PostCardProps {
  post: Post & {
    author?: Profile;
    like_count?: number;
    comment_count?: number;
    user_has_liked?: boolean;
  };
  onViewPost: (post: Post) => void;
  onLike?: (postId: string) => void;
}

export function PostCard({ post, onViewPost, onLike }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.user_has_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLike) {
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
      onLike(post.id);
    }
  };

  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onViewPost(post)}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(post.author?.full_name || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">
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
        </div>
        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
          {post.title}
        </h3>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground line-clamp-3">{post.content}</p>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {post.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{post.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
        {post.attachments && Array.isArray(post.attachments) && post.attachments.length > 0 && (
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            <span>{post.attachments.length} attachment{post.attachments.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${isLiked ? "text-red-500" : ""}`}
            onClick={handleLike}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            <span>{likeCount}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            <span>{post.comment_count || 0}</span>
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          <span>View</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
