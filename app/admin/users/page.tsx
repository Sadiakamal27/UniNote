"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase, Profile } from "@/lib/supabase";
import { GroupService } from "@/lib/groups";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  Users,
  ShieldCheck,
  Mail,
  Settings,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";

interface UserWithGroups extends Profile {
  memberships?: {
    group_id: string;
    is_admin: boolean;
    groups: { id: string; name: string };
  }[];
}

export default function UsersPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithGroups[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithGroups | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Check if user is universal admin
    if (!authLoading && profile?.user_role !== "universal_admin") {
      router.push("/");
      return;
    }

    if (!authLoading && user) {
      fetchUsers();
    }
  }, [authLoading, user, profile, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const { data: allUsers, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (usersError) throw usersError;

      // For each user, fetch groups where they are admin
      const usersWithGroups = await Promise.all(
        (allUsers || []).map(async (user) => {
          const { data: memberships, error: memberError } = await supabase
            .from("group_members")
            .select(
              `
              group_id,
              is_admin,
              groups:groups(id, name)
            `
            )
            .eq("user_id", user.id)
            .eq("status", "approved");

          if (memberError) {
            console.error("Error fetching memberships for user:", memberError);
            return { ...user, memberships: [] };
          }

          return { ...user, memberships: memberships || [] };
        })
      );

      setUsers(usersWithGroups);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (groupId: string, makeAdmin: boolean) => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await GroupService.toggleGroupAdmin(groupId, selectedUser.id, makeAdmin);
      toast.success(
        makeAdmin
          ? "User promoted to group admin"
          : "User demoted from group admin"
      );
      await fetchUsers();
      setManageDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error toggling admin status:", error);
      toast.error("Failed to update admin status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFromGroup = async (groupId: string) => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      await GroupService.removeUserFromGroup(groupId, selectedUser.id);
      toast.success("User removed from group");
      await fetchUsers();
      setManageDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error removing user from group:", error);
      toast.error("Failed to remove user from group");
    } finally {
      setActionLoading(false);
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "universal_admin":
        return "bg-purple-500 hover:bg-purple-600";
      case "group_admin":
        return "bg-blue-500 hover:bg-blue-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || (loading && users.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Users Management</h1>
            <p className="text-muted-foreground">
              View all registered users and manage their roles
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Group Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                users.filter((u) => u.memberships?.some((m) => m.is_admin))
                  .length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Universal Admins
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.user_role === "universal_admin").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-lg">
                          {user.full_name || "No name"}
                        </p>
                        <Badge
                          className={getRoleBadgeColor(user.user_role)}
                          variant="default"
                        >
                          {user.user_role === "universal_admin"
                            ? "Universal Admin"
                            : user.user_role === "group_admin"
                            ? "Group Admin"
                            : "User"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                      {user.memberships && user.memberships.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Member of {user.memberships.length} group
                            {user.memberships.length !== 1 ? "s" : ""}:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {user.memberships.map((membership) => (
                              <Badge
                                key={membership.group_id}
                                variant={
                                  membership.is_admin ? "default" : "outline"
                                }
                                className={
                                  membership.is_admin
                                    ? "text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20"
                                    : "text-[10px]"
                                }
                              >
                                {membership.groups.name}
                                {membership.is_admin && " (Admin)"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {user.memberships && user.memberships.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setManageDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Manage Groups
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? "No users match your search" : "No users found"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Groups Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Group Memberships</DialogTitle>
            <DialogDescription>
              Manage admin status for{" "}
              {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedUser?.memberships &&
            selectedUser.memberships.length > 0 ? (
              selectedUser.memberships.map((membership) => (
                <div
                  key={membership.group_id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                >
                  <div>
                    <p className="font-semibold">{membership.groups.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {membership.is_admin ? "Group Admin" : "Member"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!membership.is_admin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggleAdmin(membership.group_id, true)
                        }
                        disabled={actionLoading}
                        className="gap-2"
                      >
                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                        Promote to Admin
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveFromGroup(membership.group_id)}
                      disabled={actionLoading}
                      className="gap-2"
                    >
                      <UserMinus className="h-4 w-4" />
                      Remove from Group
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                This user is not a member of any groups
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setManageDialogOpen(false);
                setSelectedUser(null);
              }}
              disabled={actionLoading}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
