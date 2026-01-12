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
  onCreate: (name: string, description: string, memberEmails?: string[]) => Promise<void>;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (email && !memberEmails.includes(email)) {
      // Basic email validation
      if (email.includes("@") && email.includes(".")) {
        setMemberEmails([...memberEmails, email]);
        setEmailInput("");
      } else {
        toast.error("Please enter a valid email address");
      }
    }
  };

  const handleRemoveEmail = (email: string) => {
    setMemberEmails(memberEmails.filter((e) => e !== email));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onCreate(name.trim(), description.trim(), memberEmails);
      setName("");
      setDescription("");
      setMemberEmails([]);
      setEmailInput("");
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
            <Label htmlFor="members">Add Members by Email (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="members"
                type="email"
                placeholder="Enter email address..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddEmail();
                  }
                }}
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddEmail}
                disabled={loading || !emailInput.trim()}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            {memberEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {memberEmails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
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
              Members will be automatically added and approved when the group is created
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
