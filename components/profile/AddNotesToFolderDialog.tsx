"use client";

import { useEffect, useState } from "react";
import { supabase, Post } from "@/lib/supabase";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, FileText } from "lucide-react";
import { toast } from "sonner";

interface AddNotesToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  userId: string;
  onNotesAdded: () => void;
}

export function AddNotesToFolderDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  userId,
  onNotesAdded,
}: AddNotesToFolderDialogProps) {
  const [notes, setNotes] = useState<Post[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableNotes();
      setSelectedNotes(new Set());
      setSearchQuery("");
    }
  }, [open, folderId, userId]);

  const fetchAvailableNotes = async () => {
    setLoading(true);
    try {
      // Fetch notes that are NOT in this folder
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("author_id", userId)
        .or(`folder_id.is.null,folder_id.neq.${folderId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNote = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredNotes.map((n) => n.id)));
    }
  };

  const handleAddNotes = async () => {
    if (selectedNotes.size === 0) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("posts")
        .update({ folder_id: folderId })
        .in("id", Array.from(selectedNotes));

      if (error) throw error;

      toast.success(
        `${selectedNotes.size} note${
          selectedNotes.size !== 1 ? "s" : ""
        } added to ${folderName}`
      );
      onNotesAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding notes to folder:", error);
      toast.error("Failed to add notes to folder");
    } finally {
      setSaving(false);
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Add Notes to "{folderName}"</DialogTitle>
          <DialogDescription>
            Select notes to add to this folder
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 px-6 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Select All */}
          {filteredNotes.length > 0 && (
            <div className="flex items-center gap-2 px-2">
              <Checkbox
                id="select-all"
                checked={
                  selectedNotes.size === filteredNotes.length &&
                  filteredNotes.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Select all ({filteredNotes.length} notes)
              </label>
            </div>
          )}

          {/* Notes List */}
          <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 w-full">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredNotes.length > 0 ? (
                <div className="space-y-2 p-4">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleToggleNote(note.id)}
                    >
                      <Checkbox
                        checked={selectedNotes.has(note.id)}
                        onCheckedChange={() => handleToggleNote(note.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <h4 className="font-semibold text-sm truncate">
                            {note.title}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {note.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No notes match your search"
                      : "No notes available to add"}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected Count */}
          {selectedNotes.size > 0 && (
            <p className="text-sm text-primary font-medium">
              {selectedNotes.size} note{selectedNotes.size !== 1 ? "s" : ""}{" "}
              selected
            </p>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 border-t mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddNotes}
            disabled={saving || selectedNotes.size === 0}
            className="min-w-[100px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedNotes.size || ""} Note${
                selectedNotes.size !== 1 ? "s" : ""
              }`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
