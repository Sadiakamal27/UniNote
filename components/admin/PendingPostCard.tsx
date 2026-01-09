"use client";

import { useState } from "react";
import { Post } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Calendar, User, File, Image, FileText, Download, ExternalLink, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PendingPostCardProps {
  post: Post;
  onUpdate: () => void;
}

export function PendingPostCard({ post, onUpdate }: PendingPostCardProps) {
  const [loading, setLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("posts")
        .update({
          approval_status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post approved successfully");
      onUpdate();
    } catch (error) {
      console.error("Error approving post:", error);
      toast.error("Failed to approve post");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("posts")
        .update({
          approval_status: "rejected",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Post rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      onUpdate();
    } catch (error) {
      console.error("Error rejecting post:", error);
      toast.error("Failed to reject post");
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

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={post.author?.avatar_url || undefined} />
                <AvatarFallback>
                  {getInitials(post.author?.full_name || null)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{post.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <User className="h-3 w-3" />
                  <span>{post.author?.full_name || post.author?.email}</span>
                  <span>•</span>
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
            >
              Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-3">{post.content}</p>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {post.attachments && Array.isArray(post.attachments) && post.attachments.length > 0 && (
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>{post.attachments.length} attachment{post.attachments.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreviewDialog(true)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRejectDialog(true)}
            disabled={loading}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </CardFooter>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{post.title}</DialogTitle>
            <DialogDescription>
              Posted by {post.author?.full_name || post.author?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>
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
            <div className="space-y-2 mt-4">
              <h4 className="font-semibold text-sm">Attachments</h4>
              <div className="space-y-2">
                {Array.isArray(post.attachments) ? (
                  post.attachments.map((attachment: any, index: number) => {
                    const url = typeof attachment === 'string' ? attachment : attachment.url;
                    const name = typeof attachment === 'string' 
                      ? `Attachment ${index + 1}` 
                      : attachment.name || `Attachment ${index + 1}`;
                    const type = typeof attachment === 'string' 
                      ? 'unknown' 
                      : attachment.type || 'unknown';
                    
                    const isImage = type.startsWith('image/') || 
                      ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
                        name.toLowerCase().endsWith(`.${ext}`)
                      );
                    const isPdf = type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
                    
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
                          <span className="text-sm font-medium truncate">{name}</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                            className="h-8"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
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
                  <p className="text-sm text-muted-foreground">No attachments available</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Post</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this post. This will be
              visible to the author.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !rejectionReason.trim()}
            >
              Reject Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
