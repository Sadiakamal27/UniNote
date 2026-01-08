"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, X, Plus, Loader2 } from "lucide-react";

interface Folder {
  id: string;
  name: string;
}

export default function CreateNotePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGroupId = searchParams.get("group");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"public" | "group">(
    initialGroupId ? "group" : "public"
  );
  const [folderId, setFolderId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>(initialGroupId || "");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [userGroups, setUserGroups] = useState<{ id: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchFolders();
      fetchUserGroups();
    }
  }, [user, authLoading]);

  const fetchUserGroups = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name)")
        .eq("user_id", user.id);

      if (error) throw error;
      const formattedGroups =
        data
          ?.map((m) => {
            const g = m.groups as any;
            return Array.isArray(g) ? g[0] : g;
          })
          .filter(Boolean) || [];
      setUserGroups(formattedGroups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
    }
  };

  const fetchFolders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("folders")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to create a note");
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("posts").insert({
        title: title.trim(),
        content: content.trim(),
        author_id: user.id,
        post_type: postType,
        approval_status: postType === "public" ? "pending" : "approved", // Group posts are auto-approved for now or handle later
        folder_id: folderId || null,
        group_id: postType === "group" ? groupId : null,
        tags: tags.length > 0 ? tags : null,
      });

      if (error) throw error;

      toast.success(
        postType === "public"
          ? "Note submitted for admin approval!"
          : "Note submitted for group admin approval!"
      );

      // Reset form
      setTitle("");
      setContent("");
      setTags([]);
      setFolderId("");
      setPostType("public");

      // Redirect to profile
      router.push("/Profile");
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Note</h1>
        <p className="text-muted-foreground">
          Share your knowledge with the community
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Note Details</CardTitle>
            <CardDescription>
              {postType === "public"
                ? "Your note will be reviewed by an admin before being published"
                : "Your note will be reviewed by the group admin"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                className="text-lg"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder="Write your note content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                disabled={loading}
                rows={12}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {content.length} characters
              </p>
            </div>

            {/* Post Type */}
            <div className="space-y-2">
              <Label htmlFor="postType">Post Type</Label>
              <Select
                value={postType}
                onValueChange={(value: "public" | "group") =>
                  setPostType(value)
                }
                disabled={loading}
              >
                <SelectTrigger id="postType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Public (visible to everyone)
                  </SelectItem>
                  <SelectItem value="group">
                    Group (visible to group members)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group Selection */}
            {postType === "group" && (
              <div className="space-y-2">
                <Label htmlFor="group">
                  Select Group <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={groupId}
                  onValueChange={setGroupId}
                  disabled={loading}
                >
                  <SelectTrigger id="group">
                    <SelectValue placeholder="Select a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {userGroups.length === 0 && (
                  <p className="text-xs text-destructive">
                    You are not a member of any groups. Join a group first.
                  </p>
                )}
              </div>
            )}

            {/* Folder */}
            <div className="space-y-2">
              <Label htmlFor="folder">Folder (Optional)</Label>
              <Select
                value={folderId || "none"}
                onValueChange={(value) =>
                  setFolderId(value === "none" ? "" : value)
                }
                disabled={loading}
              >
                <SelectTrigger id="folder">
                  <SelectValue placeholder="Select a folder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {folders.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Create folders in your profile to organize notes
                </p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={loading || !tagInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !title.trim() || !content.trim()}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Approval
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/Profile")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>

            {/* Info Message */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>Note:</strong> Your note will be pending until approved
                by{" "}
                {postType === "public"
                  ? "a universal admin"
                  : "the group admin"}
                . You can view and edit pending notes in your profile.
              </p>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
