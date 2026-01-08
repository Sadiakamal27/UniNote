"use client";

import { Group } from "@/lib/supabase";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Users, ChevronRight, UserPlus, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface GroupCardProps {
  group: Group;
  membershipStatus?: "member" | "pending" | "none"; // Assuming we'll have a status eventually
  onJoinRequest?: (groupId: string) => void;
}

export function GroupCard({
  group,
  membershipStatus = "none",
  onJoinRequest,
}: GroupCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Users className="h-6 w-6" />
          </div>
          {membershipStatus === "none" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onJoinRequest?.(group.id)}
            >
              <UserPlus className="h-4 w-4" />
              Join
            </Button>
          )}
          {membershipStatus === "pending" && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              Pending
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold mb-1">{group.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
          {group.description || "No description provided."}
        </p>
      </CardContent>

      <CardFooter className="px-6 py-4 border-t flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {group.member_count} members
        </span>

        {membershipStatus === "member" ? (
          <Link
            href={`/Groups/${group.id}`}
            className="flex items-center gap-1 text-primary font-medium hover:underline"
          >
            View Group
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1 italic">
            Private Group
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
