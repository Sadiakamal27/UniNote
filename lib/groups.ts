import { supabase, Group, GroupMember, Post } from "./supabase";

export const GroupService = {
  /**
   * Fetch all available groups
   */
  async fetchGroups() {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  },

  /**
   * Fetch a user's group memberships
   */
  async fetchUserMemberships(userId: string) {
    // Try to fetch with status first
    const { data, error } = await supabase
      .from("group_members")
      .select("group_id, status, is_admin")
      .eq("user_id", userId);

    if (error) {
      console.error(
        "Error fetching memberships with status, retrying without status:",
        error
      );
      // Fallback: try without status if it doesn't exist yet
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("group_members")
        .select("group_id, is_admin")
        .eq("user_id", userId);

      if (fallbackError) throw fallbackError;

      const membershipMap: Record<string, "member" | "pending" | "none"> = {};
      fallbackData?.forEach((m) => {
        membershipMap[m.group_id] = "member"; // Default to member if status is missing
      });
      return membershipMap;
    }

    const membershipMap: Record<string, "member" | "pending" | "none"> = {};
    data?.forEach((m) => {
      membershipMap[m.group_id] =
        m.status === "approved" ? "member" : "pending";
    });

    return membershipMap;
  },

  /**
   * Create a new group and add the creator as an admin
   */
  async createGroup(
    name: string,
    description: string | null,
    creatorId: string
  ) {
    // 1. Create group
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name,
        description,
        created_by: creatorId,
        member_count: 1,
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // 2. Add creator as admin member
    const { error: memberError } = await supabase.from("group_members").insert({
      group_id: group.id,
      user_id: creatorId,
      is_admin: true,
      status: "approved",
    });

    if (memberError) throw memberError;

    return group;
  },

  /**
   * Request to join a group
   */
  async joinGroup(groupId: string, userId: string) {
    // Try with status first
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
      is_admin: false,
      status: "pending",
    });

    if (error) {
      console.error(
        "Error joining with status, retrying without status:",
        error
      );
      // Fallback: try without status if it doesn't exist yet
      const { error: fallbackError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: userId,
          is_admin: false,
        });

      if (fallbackError) throw fallbackError;
    }
  },

  /**
   * Get full details for a group, including membership status and notes (if allowed)
   */
  async getGroupDetails(groupId: string, userId: string | undefined) {
    // 1. Fetch group basic info
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (groupError) throw groupError;

    let isMember = false;
    let isAdmin = false;
    let membershipStatus: "member" | "pending" | "none" = "none";
    let posts: Post[] = [];

    // 2. Check membership if user is logged in
    if (userId) {
      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle();

      if (memberError) throw memberError;

      // Handle case where status might be missing from response (old schema)
      const status =
        (memberData as any)?.status || (memberData ? "approved" : "none");

      isMember = status === "approved";
      membershipStatus = memberData
        ? status === "approved"
          ? "member"
          : "pending"
        : "none";
      isAdmin = memberData?.is_admin || false;

      // 3. If approved member, fetch posts
      if (isMember) {
        // Try fetching with explicit author relation, fallback to simple fetch
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select(
            `
            *,
            author:profiles(*)
          `
          )
          .eq("group_id", groupId)
          .order("created_at", { ascending: false });

        if (postsError) {
          console.error(
            "Error fetching posts with author relation, retrying simple fetch:",
            postsError
          );
          const { data: simplePosts, error: simpleError } = await supabase
            .from("posts")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: false });

          if (simpleError) throw simpleError;
          posts = simplePosts || [];
        } else {
          posts = postsData || [];
        }
      }
    }

    return { group, isMember, isAdmin, membershipStatus, posts };
  },

  /**
   * Fetch users waiting for approval for a specific group
   */
  async fetchPendingMembers(groupId: string) {
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select(
          `
          *,
          user:profiles(*)
        `
        )
        .eq("group_id", groupId)
        .eq("status", "pending");

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Error fetching pending members:", err);
      return [];
    }
  },

  /**
   * Update the status of a group membership (Approve/Reject)
   */
  async updateMembershipStatus(
    membershipId: string,
    status: "approved" | "rejected"
  ) {
    if (status === "rejected") {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("id", membershipId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("group_members")
        .update({ status: "approved" })
        .eq("id", membershipId);
      if (error) throw error;

      // We should also increment member_count in the groups table
      // But for now we'll just focus on the membership record
      // Ideally this would be a Supabase function (RPC) or trigger.
    }
  },
};
