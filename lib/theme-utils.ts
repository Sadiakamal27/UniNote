export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  radius: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

export interface Theme {
  light: ThemeColors;
  dark: ThemeColors;
}

const THEME_STORAGE_KEY = "shadcn-theme";

export async function loadTheme(themeName: string): Promise<Theme | null> {
  try {
    const theme = await import(`@/themes/${themeName}.json`);
    return theme.default || theme;
  } catch (error) {
    console.error(`Failed to load theme ${themeName}:`, error);
    return null;
  }
}

const THEME_STYLE_ID = "shadcn-theme-styles";

function formatSidebarBg(value: string): string {
  return value.includes("oklch") ? value : `hsl(${value})`;
}

function generateThemeCSS(theme: Theme): string {
  const lightColors = theme.light;
  const darkColors = theme.dark;

  return `
    :root {
      --background: ${lightColors.background};
      --foreground: ${lightColors.foreground};
      --card: ${lightColors.card};
      --card-foreground: ${lightColors.cardForeground};
      --popover: ${lightColors.popover};
      --popover-foreground: ${lightColors.popoverForeground};
      --primary: ${lightColors.primary};
      --primary-foreground: ${lightColors.primaryForeground};
      --secondary: ${lightColors.secondary};
      --secondary-foreground: ${lightColors.secondaryForeground};
      --muted: ${lightColors.muted};
      --muted-foreground: ${lightColors.mutedForeground};
      --accent: ${lightColors.accent};
      --accent-foreground: ${lightColors.accentForeground};
      --destructive: ${lightColors.destructive};
      --destructive-foreground: ${lightColors.destructiveForeground};
      --border: ${lightColors.border};
      --input: ${lightColors.input};
      --ring: ${lightColors.ring};
      --chart-1: ${lightColors.chart1};
      --chart-2: ${lightColors.chart2};
      --chart-3: ${lightColors.chart3};
      --chart-4: ${lightColors.chart4};
      --chart-5: ${lightColors.chart5};
      --radius: ${lightColors.radius};
      --sidebar-background: ${formatSidebarBg(lightColors.sidebarBackground)};
      --sidebar-foreground: ${lightColors.sidebarForeground};
      --sidebar-primary: ${lightColors.sidebarPrimary};
      --sidebar-primary-foreground: ${lightColors.sidebarPrimaryForeground};
      --sidebar-accent: ${lightColors.sidebarAccent};
      --sidebar-accent-foreground: ${lightColors.sidebarAccentForeground};
      --sidebar-border: ${lightColors.sidebarBorder};
      --sidebar-ring: ${lightColors.sidebarRing};
    }
    .dark {
      --background: ${darkColors.background};
      --foreground: ${darkColors.foreground};
      --card: ${darkColors.card};
      --card-foreground: ${darkColors.cardForeground};
      --popover: ${darkColors.popover};
      --popover-foreground: ${darkColors.popoverForeground};
      --primary: ${darkColors.primary};
      --primary-foreground: ${darkColors.primaryForeground};
      --secondary: ${darkColors.secondary};
      --secondary-foreground: ${darkColors.secondaryForeground};
      --muted: ${darkColors.muted};
      --muted-foreground: ${darkColors.mutedForeground};
      --accent: ${darkColors.accent};
      --accent-foreground: ${darkColors.accentForeground};
      --destructive: ${darkColors.destructive};
      --destructive-foreground: ${darkColors.destructiveForeground};
      --border: ${darkColors.border};
      --input: ${darkColors.input};
      --ring: ${darkColors.ring};
      --chart-1: ${darkColors.chart1};
      --chart-2: ${darkColors.chart2};
      --chart-3: ${darkColors.chart3};
      --chart-4: ${darkColors.chart4};
      --chart-5: ${darkColors.chart5};
      --radius: ${darkColors.radius};
      --sidebar-background: ${formatSidebarBg(darkColors.sidebarBackground)};
      --sidebar-foreground: ${darkColors.sidebarForeground};
      --sidebar-primary: ${darkColors.sidebarPrimary};
      --sidebar-primary-foreground: ${darkColors.sidebarPrimaryForeground};
      --sidebar-accent: ${darkColors.sidebarAccent};
      --sidebar-accent-foreground: ${darkColors.sidebarAccentForeground};
      --sidebar-border: ${darkColors.sidebarBorder};
      --sidebar-ring: ${darkColors.sidebarRing};
    }
  `;
}

export function applyTheme(theme: Theme, mode: "light" | "dark" = "light") {
  if (typeof document === "undefined") return;

  // Remove existing theme style tag if it exists
  const existingStyle = document.getElementById(THEME_STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style tag with theme CSS
  const style = document.createElement("style");
  style.id = THEME_STYLE_ID;
  style.textContent = generateThemeCSS(theme);
  document.head.appendChild(style);
}

export function getStoredTheme(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(THEME_STORAGE_KEY);
}

export function storeTheme(themeName: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, themeName);
}

export function getAvailableThemes(): string[] {
  // List of available themes - add more as you add theme files
  return ["bubblegum", "default"];
}
