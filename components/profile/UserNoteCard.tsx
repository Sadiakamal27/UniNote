"use client";

import { Post } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Trash2, Eye, Calendar, AlertCircle, Paperclip, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { PostModal } from "@/components/feed/PostModal";

interface UserNoteCardProps {
  post: Post;
  onUpdate: () => void;
}

export function UserNoteCard({ post, onUpdate }: UserNoteCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from("posts").delete().eq("id", post.id);

      if (error) throw error;

      toast.success("Note deleted");
      setDeleteDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete note");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setEditing(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({
          title: editTitle.trim(),
          content: editContent.trim(),
          approval_status: "pending", // Reset to pending after edit
          rejection_reason: null, // Clear rejection reason if any
        })
        .eq("id", post.id);

      if (error) throw error;

      toast.success("Note updated successfully. It will require re-approval.");
      setEditDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update note");
    } finally {
      setEditing(false);
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      pending: {
        label: "Pending",
        variant: "outline" as const,
        className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      },
      approved: {
        label: "Approved",
        variant: "outline" as const,
        className: "bg-green-500/10 text-green-600 border-green-500/20",
      },
      rejected: {
        label: "Rejected",
        variant: "outline" as const,
        className: "bg-red-500/10 text-red-600 border-red-500/20",
      },
    };

    const config = statusConfig[post.approval_status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
            {getStatusBadge()}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {post.content}
          </p>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
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
          {post.approval_status === "rejected" && post.rejection_reason && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-600">
                    Rejection Reason:
                  </p>
                  <p className="text-xs text-red-600/80 mt-1">
                    {post.rejection_reason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2 border-t pt-4">
          {post.approval_status === "pending" && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => {
                setEditTitle(post.title);
                setEditContent(post.content);
                setEditDialogOpen(true);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setViewModalOpen(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{post.title}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Modal */}
      <PostModal
        post={post}
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update your note. Changes will require re-approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={editing}
                placeholder="Enter note title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={editing}
                placeholder="Write your note content here..."
                rows={12}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={editing}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editing || !editTitle.trim() || !editContent.trim()}>
              {editing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Note"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
