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

    // Calculate actual member count for each group
    const groupsWithCounts = await Promise.all(
      (data || []).map(async (group) => {
        const { count, error: countError } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id)
          .eq("status", "approved");

        if (countError) {
          console.error(
            `Error counting members for group ${group.id}:`,
            countError
          );
          return { ...group, member_count: group.member_count || 0 };
        }

        return { ...group, member_count: count || 0 };
      })
    );

    return groupsWithCounts;
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
        member_count: 1, // Will be updated after adding members
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // 2. Find the universal admin
    const { data: universalAdminProfile, error: adminError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_role", "universal_admin")
      .limit(1)
      .maybeSingle();

    if (adminError) {
      console.error("Error fetching universal admin:", adminError);
    }

    // 3. Prepare memberships to insert
    const memberships = [
      // Add creator as admin
      {
        group_id: group.id,
        user_id: creatorId,
        is_admin: true,
        status: "approved",
      },
    ];

    // Add universal admin as admin (if exists and is not the creator)
    if (universalAdminProfile && universalAdminProfile.id !== creatorId) {
      memberships.push({
        group_id: group.id,
        user_id: universalAdminProfile.id,
        is_admin: true,
        status: "approved",
      });
    }

    // 4. Insert all memberships
    const { error: memberError } = await supabase
      .from("group_members")
      .insert(memberships);

    if (memberError) throw memberError;

    // 5. Update the member count
    const { error: updateError } = await supabase
      .from("groups")
      .update({ member_count: memberships.length })
      .eq("id", group.id);

    if (updateError) {
      console.error("Error updating member count:", updateError);
    }

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

    // Calculate actual member count
    const { count: memberCount, error: countError } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("status", "approved");

    if (countError) {
      console.error(`Error counting members for group ${groupId}:`, countError);
    }

    const groupWithCount = {
      ...group,
      member_count: memberCount || 0,
    };

    let isMember = false;
    let isAdmin = false;
    let membershipStatus: "member" | "pending" | "none" = "none";
    let posts: Post[] = [];

    // 2. Check if user is universal admin first
    let isUniversalAdmin = false;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_role")
        .eq("id", userId)
        .single();

      isUniversalAdmin = profile?.user_role === "universal_admin";
    }

    // 3. Check membership if user is logged in
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

      isMember = status === "approved" || isUniversalAdmin; // Universal admins can access any group
      membershipStatus = memberData
        ? status === "approved"
          ? "member"
          : "pending"
        : isUniversalAdmin
        ? "member"
        : "none";
      isAdmin = memberData?.is_admin || false || isUniversalAdmin; // Universal admins are admins of all groups

      // 4. If approved member (or universal admin), fetch posts
      if (isMember) {
        // Try fetching with explicit author relation, fallback to simple fetch
        let queryBuilder = supabase
          .from("posts")
          .select(
            `
            *,
            author:profiles(*)
          `
          )
          .eq("group_id", groupId);

        // Only show approved posts to regular members, admins can see pending too
        // Always exclude rejected posts
        if (!isAdmin) {
          queryBuilder = queryBuilder.eq("approval_status", "approved");
        } else {
          queryBuilder = queryBuilder.in("approval_status", [
            "pending",
            "approved",
          ]);
        }

        const { data: postsData, error: postsError } = await queryBuilder.order(
          "created_at",
          { ascending: false }
        );

        if (postsError) {
          console.error(
            "Error fetching posts with author relation, retrying simple fetch:",
            postsError
          );
          let simpleQueryBuilder = supabase
            .from("posts")
            .select("*")
            .eq("group_id", groupId);

          // Always exclude rejected posts
          if (!isAdmin) {
            simpleQueryBuilder = simpleQueryBuilder.eq(
              "approval_status",
              "approved"
            );
          } else {
            simpleQueryBuilder = simpleQueryBuilder.in("approval_status", [
              "pending",
              "approved",
            ]);
          }

          const { data: simplePosts, error: simpleError } =
            await simpleQueryBuilder.order("created_at", { ascending: false });

          if (simpleError) throw simpleError;
          posts = simplePosts || [];

          // Posts already filtered in query
          posts = simplePosts || [];
        } else {
          // Posts already filtered in query (no rejected posts, and only approved for non-admins)
          posts = postsData || [];
        }

        // Fetch like and comment counts for each post
        posts = await Promise.all(
          posts.map(async (post) => {
            try {
              const [
                { count: likeCount },
                { count: commentCount },
                userLikeResult,
              ] = await Promise.all([
                supabase
                  .from("post_likes")
                  .select("*", { count: "exact", head: true })
                  .eq("post_id", post.id),
                supabase
                  .from("comments")
                  .select("*", { count: "exact", head: true })
                  .eq("post_id", post.id),
                userId
                  ? supabase
                      .from("post_likes")
                      .select("id")
                      .eq("post_id", post.id)
                      .eq("user_id", userId)
                      .maybeSingle()
                  : Promise.resolve({ data: null }),
              ]);

              return {
                ...post,
                like_count: likeCount || 0,
                comment_count: commentCount || 0,
                user_has_liked: !!userLikeResult?.data,
              };
            } catch (err) {
              console.error(`Error fetching stats for post ${post.id}:`, err);
              return {
                ...post,
                like_count: 0,
                comment_count: 0,
                user_has_liked: false,
              };
            }
          })
        );
      }
    }

    return {
      group: groupWithCount,
      isMember,
      isAdmin,
      membershipStatus,
      posts,
    };
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
    // Get the group_id first
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("id", membershipId)
      .single();

    if (membershipError) throw membershipError;

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
    }

    // Update member_count in groups table
    const { count: memberCount, error: countError } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", membership.group_id)
      .eq("status", "approved");

    if (!countError) {
      await supabase
        .from("groups")
        .update({ member_count: memberCount || 0 })
        .eq("id", membership.group_id);
    }
  },

  /**
   * Fetch pending posts for a specific group (for group admins and universal admins)
   */
  async fetchPendingGroupPosts(groupId: string) {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        author:profiles!posts_author_id_fkey(*)
      `
      )
      .eq("group_id", groupId)
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Add members to a group by username (for group admins)
   */
  async addMembersToGroup(
    groupId: string,
    usernames: string[]
  ): Promise<{
    added: string[];
    notFound: string[];
    alreadyMembers: string[];
  }> {
    const result = {
      added: [] as string[],
      notFound: [] as string[],
      alreadyMembers: [] as string[],
    };

    // Get user IDs for the usernames
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username")
      .in(
        "username",
        usernames.map((u) => u.toLowerCase())
      );

    if (profilesError) throw profilesError;

    const foundUsernames = new Set(profiles?.map((p) => p.username) || []);
    const userIds = profiles?.map((p) => p.id) || [];

    // Check which usernames were not found
    usernames.forEach((username) => {
      if (!foundUsernames.has(username.toLowerCase())) {
        result.notFound.push(username);
      }
    });

    // Check existing memberships
    if (userIds.length > 0) {
      const { data: existingMembers, error: membersError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId)
        .in("user_id", userIds);

      if (membersError) throw membersError;

      const existingUserIds = new Set(
        existingMembers?.map((m) => m.user_id) || []
      );

      // Filter out existing members and prepare new memberships
      const newUserIds = userIds.filter((id) => !existingUserIds.has(id));
      const existingUsernames =
        profiles
          ?.filter((p) => existingUserIds.has(p.id))
          .map((p) => p.username) || [];
      result.alreadyMembers.push(...existingUsernames);

      // Add new members
      if (newUserIds.length > 0) {
        const newMemberships = newUserIds.map((userId) => ({
          group_id: groupId,
          user_id: userId,
          is_admin: false,
          status: "approved", // Directly approve when added by admin
        }));

        const { error: insertError } = await supabase
          .from("group_members")
          .insert(newMemberships);

        if (insertError) throw insertError;

        const addedUsernames =
          profiles
            ?.filter((p) => newUserIds.includes(p.id))
            .map((p) => p.username) || [];
        result.added.push(...addedUsernames);

        // Update member_count in groups table
        if (newUserIds.length > 0) {
          const { count: currentCount } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", groupId)
            .eq("status", "approved");

          await supabase
            .from("groups")
            .update({ member_count: currentCount || 0 })
            .eq("id", groupId);
        }
      }
    }

    return result;
  },

  /**
   * Delete a group and all associated data
   */
  async deleteGroup(groupId: string) {
    // Note: Supabase should handle cascading deletes if configured properly
    // But we'll explicitly delete related data to be safe

    // 1. Delete all group members
    const { error: membersError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId);

    if (membersError) {
      console.error("Error deleting group members:", membersError);
      // Continue anyway to try to delete the group
    }

    // 2. Delete all posts in the group
    const { error: postsError } = await supabase
      .from("posts")
      .delete()
      .eq("group_id", groupId);

    if (postsError) {
      console.error("Error deleting group posts:", postsError);
      // Continue anyway to try to delete the group
    }

    // 3. Delete the group itself
    const { error: groupError } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId);

    if (groupError) throw groupError;
  },

  /**
   * Toggle admin status for a user in a specific group (Universal Admin only)
   */
  async toggleGroupAdmin(groupId: string, userId: string, makeAdmin: boolean) {
    const { error } = await supabase
      .from("group_members")
      .update({ is_admin: makeAdmin })
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) throw error;
  },

  /**
   * Remove a user from a group (Universal Admin only)
   */
  async removeUserFromGroup(groupId: string, userId: string) {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) throw error;

    // Update member count
    const { count: memberCount } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("status", "approved");

    await supabase
      .from("groups")
      .update({ member_count: memberCount || 0 })
      .eq("id", groupId);
  },
};
