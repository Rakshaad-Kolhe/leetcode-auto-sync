/**
 * LeetCode Auto Sync Design System Tokens
 * Theme: Native LeetCode Dark (Minimal, Premium, Dense, Developer-First)
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  const ThemeTokens = {
    colors: {
      bg: "#1A1A1A",
      panel: "#262626",
      card: "#2D2D2D",
      border: "rgba(255, 255, 255, 0.08)",
      primary: "#FFA116", // LeetCode Orange
      primaryHover: "#FFB84D",
      textPrimary: "#F5F5F5",
      textSecondary: "#A3A3A3",
      textMuted: "#737373",
      success: "#00C853",
      warning: "#FFB300",
      error: "#EF5350",
      hover: "rgba(255, 255, 255, 0.05)",
      active: "rgba(255, 161, 22, 0.12)"
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      sizes: {
        xl: "24px",
        lg: "20px",
        md: "16px",
        sm: "14px",
        xs: "12px",
        tiny: "11px"
      },
      weights: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      }
    },
    radii: {
      button: "10px",
      card: "14px",
      pill: "20px",
      sm: "6px"
    },
    motion: {
      fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
      normal: "180ms cubic-bezier(0.4, 0, 0.2, 1)"
    }
  };

  LeetCodeAutoSync.ThemeTokens = ThemeTokens;
})(typeof self !== "undefined" ? self : this);
