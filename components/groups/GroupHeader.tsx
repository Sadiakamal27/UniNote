"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface GroupHeaderProps {
  onCreateClick: () => void;
}
export const revalidate = 60;

export function GroupHeader({ onCreateClick }: GroupHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Study Groups</h1>
        <p className="text-muted-foreground mt-1">
          Join a group to share private notes with classmates.
        </p>
      </div>
      <Button onClick={onCreateClick} className="gap-2">
        <Plus className="h-4 w-4" />
        New Group
      </Button>
    </div>
  );
}
