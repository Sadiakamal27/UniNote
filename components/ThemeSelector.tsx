"use client";

import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShadcnTheme } from "@/hooks/use-shadcn-theme";
import { getAvailableThemes } from "@/lib/theme-utils";

export function ThemeSelector() {
  const { themeName, setThemeName, isLoading } = useShadcnTheme();
  const availableThemes = getAvailableThemes();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isLoading}>
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableThemes.map((theme) => (
          <DropdownMenuItem
            key={theme}
            onClick={() => setThemeName(theme)}
            className={themeName === theme ? "bg-accent" : ""}
          >
            <span className="capitalize">{theme}</span>
            {themeName === theme && (
              <span className="ml-auto text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
