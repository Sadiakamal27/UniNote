import { supabase, UserRole, Profile, Post } from "./supabase";

/**
 * Check if the current user has a specific role
 */
export async function checkUserRole(requiredRole: UserRole): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", user.id)
      .single();

    if (!profile) return false;

    // Role hierarchy: universal_admin > group_admin > user
    const roleHierarchy: Record<UserRole, number> = {
      universal_admin: 3,
      group_admin: 2,
      user: 1,
    };

    return (
      roleHierarchy[profile.user_role as UserRole] >=
      roleHierarchy[requiredRole]
    );
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}

/**
 * Check if the current user is a universal admin
 */
export async function isUniversalAdmin(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_role")
      .eq("id", user.id)
      .single();

    return profile?.user_role === "universal_admin";
  } catch (error) {
    console.error("Error checking universal admin:", error);
    return false;
  }
}

/**
 * Check if the current user is an admin of a specific group
 */
export async function isGroupAdmin(groupId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Check if user is universal admin first
    const universalAdmin = await isUniversalAdmin();
    if (universalAdmin) return true;

    // Check if user is group admin
    const { data: membership } = await supabase
      .from("group_members")
      .select("is_admin")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    return membership?.is_admin === true;
  } catch (error) {
    console.error("Error checking group admin:", error);
    return false;
  }
}

/**
 * Check if the current user can approve a specific post
 */
export async function canApprovePost(post: Post): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    // Universal admins can approve all public posts
    if (post.post_type === "public") {
      return await isUniversalAdmin();
    }

    // For group posts, check if user is group admin
    if (post.post_type === "group" && post.group_id) {
      return await isGroupAdmin(post.group_id);
    }

    return false;
  } catch (error) {
    console.error("Error checking post approval permission:", error);
    return false;
  }
}

/**
 * Get the current user's profile
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return profile;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

/**
 * Check if user is a member of a specific group
 */
export async function isGroupMember(groupId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: membership } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    return !!membership;
  } catch (error) {
    return false;
  }
}
