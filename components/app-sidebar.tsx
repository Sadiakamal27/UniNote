"use client";

import * as React from "react";
import {
  Newspaper,
  Users,
  User,
  LogOut,
  Shield,
  PenSquare,
  Clock,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useUserRole } from "@/hooks/use-user-role";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { isUniversalAdmin } = useUserRole();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
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

  const getRoleBadge = () => {
    if (!profile) return null;

    const roleConfig: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "outline";
        className?: string;
      }
    > = {
      universal_admin: {
        label: "Admin",
        variant: "default",
        className: "",
      },
      group_admin: { label: "Group Admin", variant: "secondary" },
      user: { label: "User", variant: "outline" },
    };

    const config = roleConfig[profile.user_role];
    return (
      <Badge
        variant={config.variant}
        className={`text-xs ${config.className || ""}`}
      >
        {config.label}
      </Badge>
    );
  };

  const navMain = [
    {
      title: "Feed",
      url: "/",
      icon: Newspaper,
      show: true,
    },
    {
      title: "Create Note",
      url: "/Create-note",
      icon: PenSquare,
      show: !!user,
    },
    {
      title: "My Groups",
      url: "/Groups",
      icon: Users,
      show: !!user,
    },
    {
      title: "My Profile",
      url: "/Profile",
      icon: User,
      show: !!user,
    },
  ];

  const adminNav = [
    {
      title: "Admin Dashboard",
      url: "/admin/dashboard",
      icon: Shield,
      show: isUniversalAdmin(),
    },
    {
      title: "Pending Posts",
      url: "/admin/pending-posts",
      icon: Clock,
      show: isUniversalAdmin(),
    },
  ];

  // If not logged in, show login/signup options
  if (!user) {
    return (
      <Sidebar variant="sidebar" {...props}>
        <SidebarHeader className="h-16 border-b border-sidebar-border">
          <div className="flex items-center justify-between px-4 h-full">
            <Link href="/" className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                Uni<span className="text-primary">Note</span>
              </h1>
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="p-2 gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/"}
                className="h-10"
              >
                <Link href="/">
                  <Newspaper />
                  <span>Feed</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border space-y-2">
          <Link href="/login" className="w-full">
            <SidebarMenuButton className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90">
              <span>Sign In</span>
            </SidebarMenuButton>
          </Link>
          <Link href="/signup" className="w-full">
            <SidebarMenuButton
              className="w-full justify-center"
              variant="outline"
            >
              <span>Sign Up</span>
            </SidebarMenuButton>
          </Link>
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader className="h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 h-full">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              Uni<span className="text-primary">Note</span>
            </h1>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="p-2 gap-1">
          {navMain
            .filter((item) => item.show)
            .map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.url}
                  tooltip={item.title}
                  className="h-10"
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
        </SidebarMenu>

        {adminNav.some((item) => item.show) && (
          <>
            <SidebarSeparator className="my-2" />
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administration
              </p>
            </div>
            <SidebarMenu className="p-2 gap-1">
              {adminNav
                .filter((item) => item.show)
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      className="h-10"
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary font-semibold border border-primary/20">
              {getInitials(profile?.full_name || null, profile?.email || null)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1 leading-none flex-1 min-w-0">
            <span className="font-semibold text-sm truncate">
              {profile?.full_name || "User"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </span>
            </div>
            {getRoleBadge()}
          </div>
        </div>
        <SidebarMenuButton
          onClick={handleLogout}
          className="w-full justify-start bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log Out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
