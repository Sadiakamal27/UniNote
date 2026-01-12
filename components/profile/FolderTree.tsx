"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Folder,
  Plus,
  ChevronRight,
  ChevronDown,
  FilePlus2,
} from "lucide-react";
import { toast } from "sonner";
import { AddNotesToFolderDialog } from "./AddNotesToFolderDialog";

interface FolderNode {
  id: string;
  name: string;
  parent_folder_id: string | null;
  children?: FolderNode[];
}

interface FolderTreeProps {
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onNotesUpdated?: () => void;
}

export function FolderTree({
  selectedFolder,
  onSelectFolder,
  onNotesUpdated,
}: FolderTreeProps) {
  const { user, loading: authLoading } = useAuth();
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addNotesDialogOpen, setAddNotesDialogOpen] = useState(false);
  const [selectedFolderForNotes, setSelectedFolderForNotes] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const fetchData = () => {
      if (user) {
        fetchFolders();
      }
    };

    // If auth is already loaded, fetch immediately
    if (!authLoading && user) {
      fetchData();
    } else if (user) {
      // Set a timeout to fetch even if auth is taking too long (max 3 seconds)
      timeoutId = setTimeout(() => {
        fetchData();
      }, 3000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const fetchFolders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;

      // Build tree structure
      const folderMap = new Map<string, FolderNode>();
      const rootFolders: FolderNode[] = [];

      data?.forEach((folder) => {
        folderMap.set(folder.id, { ...folder, children: [] });
      });

      data?.forEach((folder) => {
        const node = folderMap.get(folder.id)!;
        if (folder.parent_folder_id) {
          const parent = folderMap.get(folder.parent_folder_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(node);
          }
        } else {
          rootFolders.push(node);
        }
      });

      setFolders(rootFolders);
    } catch (error) {
      console.error("Error fetching folders:", error);
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("folders")
        .insert({
          name: newFolderName.trim(),
          user_id: user.id,
          parent_folder_id: parentFolderId,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Folder created!");

      const createdFolder = data;
      setNewFolderName("");
      setParentFolderId(null);
      setCreateDialogOpen(false);
      await fetchFolders();

      // Open the add notes dialog for the newly created folder
      if (createdFolder) {
        setSelectedFolderForNotes({
          id: createdFolder.id,
          name: createdFolder.name,
        });
        setAddNotesDialogOpen(true);
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted transition-colors group ${
            isSelected ? "bg-primary/10 text-primary" : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => onSelectFolder(folder.id)}
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="p-0.5 hover:bg-muted-foreground/20 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-5" />}
            <Folder className="h-4 w-4" />
            <span className="text-sm truncate flex-1">{folder.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFolderForNotes({ id: folder.id, name: folder.name });
              setAddNotesDialogOpen(true);
            }}
          >
            <FilePlus2 className="h-3 w-3" />
          </Button>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {folder.children!.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${
          selectedFolder === null ? "bg-primary/10 text-primary" : ""
        }`}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-4 w-4" />
        <span className="text-sm font-semibold">All Notes</span>
      </div>

      {folders.map((folder) => renderFolder(folder))}

      <Button
        variant="outline"
        size="sm"
        className="w-full mt-4"
        onClick={() => setCreateDialogOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        New Folder
      </Button>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a folder to organize your notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                placeholder="My Folder"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={loading || !newFolderName.trim()}
            >
              {loading ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Notes to Folder Dialog */}
      {user && selectedFolderForNotes && (
        <AddNotesToFolderDialog
          open={addNotesDialogOpen}
          onOpenChange={setAddNotesDialogOpen}
          folderId={selectedFolderForNotes.id}
          folderName={selectedFolderForNotes.name}
          userId={user.id}
          onNotesAdded={() => {
            if (onNotesUpdated) onNotesUpdated();
          }}
        />
      )}
    </div>
  );
}
