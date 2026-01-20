"use client";

import { useEffect } from "react";
import { useShadcnTheme } from "@/hooks/use-shadcn-theme";

export function ThemeInitializer() {
  const { isLoading } = useShadcnTheme();

  // This component just initializes the theme hook
  // The actual theme application happens in the hook
  return null;
}
