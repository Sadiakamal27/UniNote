"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
export const revalidate = 60;

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (
    name: string,
    description: string,
    memberUsernames?: string[]
  ) => Promise<void>;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberUsernames, setMemberUsernames] = useState<string[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddUsername = () => {
    const username = usernameInput.trim().toLowerCase();
    if (username && !memberUsernames.includes(username)) {
      // Basic username validation
      if (
        /^[a-z0-9_]+$/.test(username) &&
        username.length >= 3 &&
        username.length <= 20
      ) {
        setMemberUsernames([...memberUsernames, username]);
        setUsernameInput("");
      } else {
        toast.error(
          "Please enter a valid username (3-20 characters, letters, numbers, underscores)"
        );
      }
    }
  };

  const handleRemoveUsername = (username: string) => {
    setMemberUsernames(memberUsernames.filter((u) => u !== username));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onCreate(name.trim(), description.trim(), memberUsernames);
      setName("");
      setDescription("");
      setMemberUsernames([]);
      setUsernameInput("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error in CreateGroupDialog:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Study Group</DialogTitle>
          <DialogDescription>
            Create a private space for collaboration with your classmates.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g. Physics Study Group"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="members">Add Members by Username (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="members"
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
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddUsername}
                disabled={loading || !usernameInput.trim()}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            {memberUsernames.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {memberUsernames.map((username) => (
                  <Badge key={username} variant="secondary" className="gap-1">
                    @{username}
                    <button
                      type="button"
                      onClick={() => handleRemoveUsername(username)}
                      className="ml-1 hover:text-destructive"
                      disabled={loading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Members will be automatically added and approved when the group is
              created
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Group"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
