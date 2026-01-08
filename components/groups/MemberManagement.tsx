"use client";

import { useEffect, useState, useCallback } from "react";
import { GroupService } from "@/lib/groups";
import { Profile } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Check, X, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

interface MemberManagementProps {
  groupId: string;
}

export function MemberManagement({ groupId }: MemberManagementProps) {
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-4">
        <UserPlus className="h-5 w-5 text-primary" />
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
                  <AvatarFallback className="bg-primary/10 text-primary">
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
                  onClick={() => handleStatusUpdate(membership.id, "rejected")}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleStatusUpdate(membership.id, "approved")}
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
  );
}
