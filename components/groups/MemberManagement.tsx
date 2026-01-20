"use client";

import { useEffect, useState, useCallback } from "react";
import { GroupService } from "@/lib/groups";
import { Profile } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check, X, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

interface MemberManagementProps {
  groupId: string;
}

export function MemberManagement({ groupId }: MemberManagementProps) {
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernamesToAdd, setUsernamesToAdd] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      const data = await GroupService.fetchPendingMembers(groupId);
      setPendingMembers(data);
    } catch (error) {
      console.error("Error loading pending members:", error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleStatusUpdate = async (
    membershipId: string,
    status: "approved" | "rejected"
  ) => {
    try {
      await GroupService.updateMembershipStatus(membershipId, status);
      toast.success(
        status === "approved" ? "Member approved!" : "Request rejected"
      );
      loadPending();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleAddUsername = () => {
    const username = usernameInput.trim().toLowerCase();
    if (username && !usernamesToAdd.includes(username)) {
      // Basic username validation
      if (
        /^[a-z0-9_]+$/.test(username) &&
        username.length >= 3 &&
        username.length <= 20
      ) {
        setUsernamesToAdd([...usernamesToAdd, username]);
        setUsernameInput("");
      } else {
        toast.error(
          "Please enter a valid username (3-20 characters, letters, numbers, underscores)"
        );
      }
    }
  };

  const handleRemoveUsername = (username: string) => {
    setUsernamesToAdd(usernamesToAdd.filter((u) => u !== username));
  };

  const handleAddMembers = async () => {
    if (usernamesToAdd.length === 0) return;

    try {
      setAdding(true);
      const result = await GroupService.addMembersToGroup(
        groupId,
        usernamesToAdd
      );

      if (result.added.length > 0) {
        toast.success(`${result.added.length} member(s) added successfully`);
      }
      if (result.notFound.length > 0) {
        toast.warning(
          `${result.notFound.length} username(s) not found: ${result.notFound
            .map((u) => "@" + u)
            .join(", ")}`
        );
      }
      if (result.alreadyMembers.length > 0) {
        toast.info(
          `${result.alreadyMembers.length} user(s) are already members`
        );
      }

      setUsernamesToAdd([]);
      setUsernameInput("");
      loadPending();
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error("Failed to add members");
    } finally {
      setAdding(false);
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
    <div className="space-y-8">
      {/* Add Members Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-4">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">Add Members</h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="member-username">Add Members by Username</Label>
            <div className="flex gap-2">
              <Input
                id="member-username"
                type="text"
                placeholder="Enter username..."
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUsername();
                  }
                }}
                disabled={adding}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddUsername}
                disabled={adding || !usernameInput.trim()}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {usernamesToAdd.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {usernamesToAdd.map((username) => (
                  <Badge key={username} variant="secondary" className="gap-1">
                    @{username}
                    <button
                      type="button"
                      onClick={() => handleRemoveUsername(username)}
                      className="ml-1 hover:text-destructive"
                      disabled={adding}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Button
                onClick={handleAddMembers}
                disabled={adding}
                className="w-full"
              >
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding Members...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add {usernamesToAdd.length} Member
                    {usernamesToAdd.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Members will be automatically added and approved to the group
          </p>
        </div>
      </div>

      {/* Join Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">Join Requests</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pendingMembers.length > 0 ? (
          <div className="space-y-4">
            {pendingMembers.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={membership.user?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary border border-primary/20">
                      {getInitials(membership.user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {membership.user?.full_name || membership.user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Requested to join
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() =>
                      handleStatusUpdate(membership.id, "rejected")
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() =>
                      handleStatusUpdate(membership.id, "approved")
                    }
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">
              No pending join requests.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
