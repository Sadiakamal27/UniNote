"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase, Post } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserNoteCard } from "@/components/profile/UserNoteCard";
import { FolderTree } from "@/components/profile/FolderTree";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { FileText, FolderOpen, Heart, Edit, Plus } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { profile, user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalNotes: 0,
    approvedNotes: 0,
    pendingNotes: 0,
    totalLikes: 0,
  });
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const initData = async () => {
      if (user) {
        setLoading(true);
        await Promise.all([fetchUserPosts(), fetchStats()]);
        setLoading(false);
      } else {
        setLoading(false); // Resolve guest loading state
      }
    };

    // If auth is already loaded, fetch immediately
    if (!authLoading) {
      initData();
    } else {
      // Set a timeout to fetch even if auth is taking too long (max 3 seconds)
      timeoutId = setTimeout(() => {
        initData();
      }, 3000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const fetchUserPosts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching user posts:", error);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // First fetch posts to get IDs for likes calculation
      const { data: userPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", user.id);

      const postIds = userPosts?.map((p) => p.id) || [];

      const [
        { count: totalNotes },
        { count: approvedNotes },
        { count: pendingNotes },
        { count: totalLikes },
      ] = await Promise.all([
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("author_id", user.id),
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("author_id", user.id)
          .eq("approval_status", "approved"),
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("author_id", user.id)
          .eq("approval_status", "pending"),
        postIds.length > 0
          ? supabase
              .from("post_likes")
              .select("*", { count: "exact", head: true })
              .in("post_id", postIds)
          : Promise.resolve({ count: 0 }),
      ]);

      setStats({
        totalNotes: totalNotes || 0,
        approvedNotes: approvedNotes || 0,
        pendingNotes: pendingNotes || 0,
        totalLikes: totalLikes || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const filterPostsByStatus = (status: string) => {
    if (status === "all") return posts;
    return posts.filter((post) => post.approval_status === status);
  };

  const filterPostsByFolder = (folderId: string | null) => {
    if (!folderId) return posts;
    return posts.filter((post) => post.folder_id === folderId);
  };

  const displayLoading = loading || authLoading;

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                  {getInitials(
                    profile?.full_name || null,
                    profile?.email || null
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">
                  {profile?.full_name || "User"}
                </CardTitle>
                <CardDescription>{profile?.email}</CardDescription>
                {profile?.bio && (
                  <p className="text-sm mt-2 max-w-md">{profile.bio}</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditProfileOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalNotes}</p>
              <p className="text-xs text-muted-foreground">Total Notes</p>
            </div>
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <FileText className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">
                {stats.approvedNotes}
              </p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
              <FileText className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pendingNotes}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-4 bg-red-500/10 rounded-lg">
              <Heart className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-600">
                {stats.totalLikes}
              </p>
              <p className="text-xs text-muted-foreground">Likes Received</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Notes</h2>
        <Link href="/Create-note">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Note
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folder Tree Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Folders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FolderTree
                selectedFolder={selectedFolder}
                onSelectFolder={setSelectedFolder}
              />
            </CardContent>
          </Card>
        </div>

        {/* Notes Grid */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {displayLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : filterPostsByFolder(selectedFolder).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No notes yet. Create your first note!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filterPostsByFolder(selectedFolder).map((post) => (
                    <UserNoteCard
                      key={post.id}
                      post={post}
                      onUpdate={fetchUserPosts}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {filterPostsByStatus("approved").map((post) => (
                  <UserNoteCard
                    key={post.id}
                    post={post}
                    onUpdate={fetchUserPosts}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {filterPostsByStatus("pending").map((post) => (
                  <UserNoteCard
                    key={post.id}
                    post={post}
                    onUpdate={fetchUserPosts}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {filterPostsByStatus("rejected").map((post) => (
                  <UserNoteCard
                    key={post.id}
                    post={post}
                    onUpdate={fetchUserPosts}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        onUpdate={() => {
          // Refresh profile data
          window.location.reload();
        }}
      />
    </div>
  );
}
