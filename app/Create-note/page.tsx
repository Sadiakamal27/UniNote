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
import {
  Send,
  X,
  Plus,
  Loader2,
  Upload,
  File,
  Image,
  FileText,
} from "lucide-react";

interface Folder {
  id: string;
  name: string;
}

interface UploadedFile {
  file: File;
  url?: string;
  path?: string;
  uploading?: boolean;
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const fetchData = () => {
      if (user) {
        fetchFolders();
        fetchUserGroups();
      }
    };

    // If auth is already loaded, fetch immediately
    if (!authLoading && user) {
      fetchData();
    } else if (user) {
      // Set a timeout to fetch even if auth is taking too long (max 3 seconds)
      timeoutId = setTimeout(() => {
        fetchData();
      }, 3000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

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

  // File validation
  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "text/plain", // .txt
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    const validExtensions = [
      ".pdf",
      ".docx",
      ".doc",
      ".txt",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
    ];

    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    return (
      validTypes.includes(file.type) || validExtensions.includes(fileExtension)
    );
  };

  // Handle file selection
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!user) {
      toast.error("You must be logged in to upload files");
      return;
    }

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!isValidFileType(file)) {
        toast.error(
          `${file.name} is not a supported file type. Please upload PDF, DOCX, TXT, or image files.`
        );
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum file size is 10MB.`);
        continue;
      }

      newFiles.push({ file, uploading: false });
    }

    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // Upload file to Supabase Storage
  const uploadFileToStorage = async (
    uploadedFile: UploadedFile
  ): Promise<{
    url: string;
    name: string;
    type: string;
    size: number;
  } | null> => {
    if (!user) return null;

    try {
      const fileExt = uploadedFile.file.name.split(".").pop();
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${user.id}/${timestamp}-${randomStr}.${fileExt}`;
      const filePath = `post-attachments/${fileName}`;

      console.log(
        "Uploading file:",
        uploadedFile.file.name,
        "to path:",
        filePath
      );

      // Check if bucket exists (this will fail if bucket doesn't exist)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, uploadedFile.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);

        // Provide more helpful error messages
        if (
          uploadError.message?.includes("Bucket not found") ||
          uploadError.message?.includes("does not exist")
        ) {
          throw new Error(
            "Storage bucket 'attachments' not found. Please create it in Supabase Storage settings."
          );
        } else if (
          uploadError.message?.includes("new row violates row-level security")
        ) {
          throw new Error(
            "Permission denied. Please check storage bucket policies."
          );
        } else {
          throw new Error(uploadError.message || "Failed to upload file");
        }
      }

      if (!uploadData) {
        throw new Error("Upload returned no data");
      }

      console.log("File uploaded successfully:", uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Failed to get public URL for uploaded file");
      }

      const publicUrl = urlData.publicUrl;
      console.log("Public URL:", publicUrl);

      return {
        url: publicUrl,
        name: uploadedFile.file.name,
        type: uploadedFile.file.type || `application/${fileExt}`,
        size: uploadedFile.file.size,
      };
    } catch (error: any) {
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  // Remove file from list
  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Get file icon
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return <Image className="h-4 w-4" />;
    }
    if (ext === "pdf") {
      return <File className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
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
      // Upload files first
      const attachmentData: Array<{
        url: string;
        name: string;
        type: string;
        size: number;
      }> = [];

      if (uploadedFiles.length > 0) {
        toast.info(`Uploading ${uploadedFiles.length} file(s)...`);

        // Update files with uploading state
        setUploadedFiles((prev) =>
          prev.map((f) => ({ ...f, uploading: true }))
        );

        // Upload all files
        const uploadPromises = uploadedFiles.map(async (uploadedFile) => {
          try {
            const fileData = await uploadFileToStorage(uploadedFile);
            if (fileData) {
              console.log("File uploaded successfully:", fileData);
              return fileData;
            }
            return null;
          } catch (error: any) {
            console.error("Error uploading file:", error);
            const errorMessage = error?.message || "Unknown error";
            toast.error(
              `Failed to upload ${uploadedFile.file.name}: ${errorMessage}`
            );
            return null;
          }
        });

        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(
          (result): result is NonNullable<typeof result> => result !== null
        );

        attachmentData.push(...successfulUploads);

        console.log("All files uploaded. Total:", attachmentData.length);
        console.log("Attachment data:", attachmentData);

        if (successfulUploads.length < uploadedFiles.length) {
          toast.warning(
            `Only ${successfulUploads.length} of ${uploadedFiles.length} file(s) uploaded successfully.`
          );
        }
      }

      // Create post with attachments
      const postData = {
        title: title.trim(),
        content: content.trim(),
        author_id: user.id,
        post_type: postType,
        approval_status: "pending", // All posts require approval
        folder_id: folderId || null,
        group_id: postType === "group" ? groupId : null,
        tags: tags.length > 0 ? tags : null,
        attachments: attachmentData.length > 0 ? attachmentData : null,
      };

      console.log("Creating post with data:", postData);

      const { data: insertedPost, error } = await supabase
        .from("posts")
        .insert(postData)
        .select()
        .single();

      if (error) {
        console.error("Error creating post:", error);
        throw error;
      }

      console.log("Post created successfully:", insertedPost);

      // Verify attachments were saved
      if (attachmentData.length > 0 && insertedPost) {
        console.log("Post attachments:", insertedPost.attachments);
        if (
          !insertedPost.attachments ||
          (Array.isArray(insertedPost.attachments) &&
            insertedPost.attachments.length === 0)
        ) {
          console.warn(
            "Warning: Attachments were uploaded but not saved to post"
          );
          toast.warning(
            "Note created but attachments may not have been saved. Please check."
          );
        } else {
          console.log(
            "Attachments verified in post:",
            insertedPost.attachments
          );
        }
      }

      const successMessage =
        attachmentData.length > 0
          ? `Note with ${attachmentData.length} attachment(s) submitted for approval!`
          : postType === "public"
          ? "Note submitted for admin approval!"
          : "Note submitted for group admin approval!";

      toast.success(successMessage);

      // Reset form
      setTitle("");
      setContent("");
      setTags([]);
      setFolderId("");
      setPostType("public");
      setUploadedFiles([]);

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

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Drag and drop files here, or click to select
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, TXT, or images (Max 10MB per file)
                    </p>
                  </div>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("file-upload")?.click()
                    }
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Files
                  </Button>
                </div>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium">Uploaded Files:</p>
                  <div className="space-y-2">
                    {uploadedFiles.map((uploadedFile, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getFileIcon(uploadedFile.file.name)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {uploadedFile.file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(uploadedFile.file.size)}
                            </p>
                          </div>
                          {uploadedFile.uploading && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(index)}
                          disabled={loading || uploadedFile.uploading}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
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
