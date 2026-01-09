"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { GroupService } from "@/lib/groups";
import { Group, Post } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Users,
  Loader2,
  Lock,
  Plus,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { PostCard } from "@/components/feed/PostCard";
import { MemberManagement } from "@/components/groups/MemberManagement";
import { PendingPostCard } from "@/components/admin/PendingPostCard";
import { toast } from "sonner";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<
    "member" | "pending" | "none"
  >("none");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      const { group, isMember, isAdmin, membershipStatus, posts } =
        await GroupService.getGroupDetails(groupId, user?.id);

      setGroup(group);
      setIsMember(isMember);
      setIsAdmin(isAdmin);
      setMembershipStatus(membershipStatus);
      // Posts are already filtered in getGroupDetails - approved for members, all for admins
      setPosts(posts);

      // Fetch pending posts if admin
      if (isAdmin) {
        const pending = await GroupService.fetchPendingGroupPosts(groupId);
        setPendingPosts(pending);
      } else {
        setPendingPosts([]);
      }
    } catch (error) {
      console.error("Error fetching group details:", error);
      toast.error("Failed to load group details");
    } finally {
      setLoading(false);
    }
  }, [groupId, user?.id]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchData = () => {
      if (isMounted) {
        fetchDetails();
      }
    };

    // If auth is already loaded, fetch immediately
    if (!authLoading) {
      fetchData();
    } else {
      // Set a timeout to fetch even if auth is taking too long (max 3 seconds)
      timeoutId = setTimeout(() => {
        fetchData();
      }, 3000);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, groupId]);

  const handleJoinRequest = async () => {
    if (!user) {
      toast.error("You must be logged in to join a group");
      return;
    }

    try {
      await GroupService.joinGroup(groupId, user.id);
      toast.success("Join request sent!");
      setMembershipStatus("pending");
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("Failed to join group");
    }
  };

  const displayLoading = loading || authLoading;

  if (displayLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Loading group content...
        </p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Group not found</h2>
        <Button onClick={() => router.push("/Groups")}>Back to Groups</Button>
      </div>
    );
  }

  // Universal admins can access even if not a member, so only show pending screen for regular users
  if (membershipStatus === "pending" && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
        <div className="h-20 w-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
          <Clock className="h-10 w-10 text-yellow-600" />
        </div>
        <h2 className="text-3xl font-bold text-yellow-600">Request Pending</h2>
        <p className="text-muted-foreground text-lg">
          Your request to join <strong>{group.name}</strong> has been sent. An
          admin will need to approve your request before you can access group
          notes.
        </p>
        <Button onClick={() => router.push("/Groups")} variant="outline">
          Back to Groups
        </Button>
      </div>
    );
  }

  // Universal admins can access all groups, so check if user is not a member AND not an admin
  if (isMember === false && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <Lock className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-3xl font-bold">Private Group</h2>
        <p className="text-muted-foreground text-lg">
          This group is private. You must be a member to view its content and
          notes.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => router.push("/Groups")} variant="outline">
            Back to Groups
          </Button>
          <Button onClick={handleJoinRequest}>Request to Join</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/Groups")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Users className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight truncate">
            {group.name}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            {group.member_count} members • Group Notes
          </p>
        </div>
        <Link href={`/Create-note?group=${groupId}`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Group Note
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="notes" className="w-full">
        <TabsList className={isAdmin ? "mb-4" : "hidden"}>
          <TabsTrigger value="notes" className="gap-2">
            <Users className="h-4 w-4" />
            Group Notes
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending Notes
                {pendingPosts.length > 0 && (
                  <span className="ml-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pendingPosts.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="admin" className="gap-2 text-primary">
                <ShieldCheck className="h-4 w-4" />
                Manage Group
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="notes">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content: Posts */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-bold">Recent Notes</h2>
              {posts.length > 0 ? (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} onViewPost={() => {}} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/30">
                  <p className="text-muted-foreground">
                    No notes have been shared in this group yet.
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar: Group Info */}
            <div className="space-y-6">
              <div className="bg-muted/50 rounded-xl p-6 border shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  About Group
                </h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {group.description ||
                    "No description provided for this group."}
                </p>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Privacy</span>
                    <span className="font-medium">Private</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">{group.member_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="pending">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Pending Notes</h2>
                  <p className="text-muted-foreground">
                    Review and approve notes submitted to this group
                  </p>
                </div>
                {pendingPosts.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {pendingPosts.map((post) => (
                      <PendingPostCard
                        key={post.id}
                        post={post}
                        onUpdate={fetchDetails}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/30">
                    <p className="text-muted-foreground">
                      No pending notes to review
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="admin">
              <div className="max-w-4xl">
                <MemberManagement groupId={groupId} />
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
