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
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Users, FileText, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    pendingPosts: 0,
    approvedPosts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        // Fetch total users
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Fetch total posts
        const { count: postsCount } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true });

        // Fetch pending public posts
        const { count: pendingCount } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("post_type", "public")
          .eq("approval_status", "pending");

        // Fetch approved posts
        const { count: approvedCount } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("approval_status", "approved");

        setStats({
          totalUsers: usersCount || 0,
          totalPosts: postsCount || 0,
          pendingPosts: pendingCount || 0,
          approvedPosts: approvedCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    let timeoutId: NodeJS.Timeout;

    // If auth is already loaded, fetch immediately
    if (!authLoading) {
      fetchStats();
    } else {
      // Set a timeout to fetch even if auth is taking too long (max 3 seconds)
      timeoutId = setTimeout(() => {
        fetchStats();
      }, 3000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile?.id]);

  const displayLoading = loading || authLoading;

  return (
    <ProtectedRoute requiredRole="universal_admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || "Admin"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayLoading ? "..." : stats.totalUsers}
              </div>
              <p className="text-xs text-muted-foreground">
                Registered accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayLoading ? "..." : stats.totalPosts}
              </div>
              <p className="text-xs text-muted-foreground">
                All posts in system
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Posts
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {displayLoading ? "..." : stats.pendingPosts}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className="border-green-500/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Approved Posts
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {displayLoading ? "..." : stats.approvedPosts}
              </div>
              <p className="text-xs text-muted-foreground">Published posts</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your platform efficiently</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Link href="/admin/pending-posts">
              <Button className="w-full h-20 text-lg" variant="outline">
                <div className="flex flex-col items-center gap-2">
                  <Clock className="h-6 w-6" />
                  <span>Review Pending Posts</span>
                  {stats.pendingPosts > 0 && (
                    <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">
                      {stats.pendingPosts} pending
                    </span>
                  )}
                </div>
              </Button>
            </Link>
            <Button className="w-full h-20 text-lg" variant="outline" disabled>
              <div className="flex flex-col items-center gap-2">
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
