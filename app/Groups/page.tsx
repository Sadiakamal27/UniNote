"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Group } from "@/lib/supabase";
import { GroupService } from "@/lib/groups";
import { GroupCard } from "@/components/groups/GroupCard";
import { GroupHeader } from "@/components/groups/GroupHeader";
import { CreateGroupDialog } from "@/components/groups/CreateGroupDialog";
import { Input } from "@/components/ui/input";
import { Search, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<
    Record<string, "member" | "pending" | "none">
  >({});
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allGroups, userMemberships] = await Promise.all([
        GroupService.fetchGroups(),
        user?.id
          ? GroupService.fetchUserMemberships(user.id)
          : Promise.resolve({}),
      ]);

      setGroups(allGroups);
      setMemberships(userMemberships);
    } catch (error) {
      console.error("Error loading groups data:", error);
      // Only show toast if it's a real error, not a component unmounting
      if (error instanceof Error && error.message !== "Component unmounted") {
        toast.error("Failed to load groups");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    // If auth is already loaded, fetch immediately
    if (!authLoading) {
      loadData();
    } else {
      // Set a timeout to fetch even if auth is taking too long (max 3 seconds)
      timeoutId = setTimeout(() => {
        if (isMounted) {
          loadData();
        }
      }, 3000);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const handleJoinRequest = async (groupId: string) => {
    if (!user) {
      toast.error("You must be logged in to join a group");
      return;
    }

    try {
      await GroupService.joinGroup(groupId, user.id);
      toast.success("Join request sent!");
      // Optimistic update - in a real app, we'd wait for approval
      setMemberships((prev) => ({ ...prev, [groupId]: "pending" }));
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("Failed to join group");
    }
  };

  const handleCreateGroup = async (name: string, description: string, memberEmails?: string[]) => {
    if (!user) return;
    try {
      const group = await GroupService.createGroup(name, description, user.id);
      
      // Add members if provided
      if (memberEmails && memberEmails.length > 0) {
        const result = await GroupService.addMembersToGroup(group.id, memberEmails);
        
        if (result.added.length > 0) {
          toast.success(`${result.added.length} member(s) added to the group`);
        }
        if (result.notFound.length > 0) {
          toast.warning(`${result.notFound.length} email(s) not found: ${result.notFound.join(", ")}`);
        }
        if (result.alreadyMembers.length > 0) {
          toast.info(`${result.alreadyMembers.length} user(s) are already members`);
        }
      }
      
      toast.success("Group created successfully!");
      loadData();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
      throw error; // Re-throw for the dialog to handle
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayLoading = authLoading || loading;

  return (
    <div className="space-y-8">
      <GroupHeader onCreateClick={() => setCreateDialogOpen(true)} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          className="pl-10 max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {displayLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">
            Loading study groups...
          </p>
        </div>
      ) : filteredGroups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              membershipStatus={memberships[group.id] || "none"}
              onJoinRequest={handleJoinRequest}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/30">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No groups found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "No groups match your search."
              : "There are no study groups available yet."}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="outline"
              className="mt-6"
            >
              Create the first group
            </Button>
          )}
        </div>
      )}

      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreateGroup}
      />
    </div>
  );
}
