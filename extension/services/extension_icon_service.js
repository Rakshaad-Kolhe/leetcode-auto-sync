/**
 * ExtensionIconService
 * Dynamically updates Chrome Extension Action Icon and Badge
 * to showcase an orange flame icon with the streak count inside a dark bottom-right badge
 * with bright cyan text matching LeetCode's toolbar design.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class ExtensionIconService {
    /**
     * Updates action badge text and dynamic canvas flame icon for the extension.
     * @param {number} streakCount 
     * @param {boolean} isDailyCompleted - True if today's daily problem/challenge is solved, False otherwise
     */
    static updateStreakIcon(streakCount, isDailyCompleted = false) {
      const count = typeof streakCount === "number" && streakCount >= 0 ? streakCount : 0;
      const countStr = String(count);
      const isSolvedToday = Boolean(isDailyCompleted);

      // Yellow (#FFC700) when unsolved today; Green (#00E5A3) when solved today
      const textColor = isSolvedToday ? "#00E5A3" : "#FFC700";

      if (typeof chrome === "undefined" || !chrome.action) return;

      // 1. Set Extension Badge Text & Colors (Dark badge background, dynamic text color)
      try {
        if (chrome.action.setBadgeText) {
          chrome.action.setBadgeText({ text: countStr });
        }
        if (chrome.action.setBadgeBackgroundColor) {
          chrome.action.setBadgeBackgroundColor({ color: "#121212" });
        }
        if (chrome.action.setBadgeTextColor) {
          chrome.action.setBadgeTextColor({ color: textColor });
        }
      } catch (err) {
        // Silently handle badge set errors in non-browser context
      }

      // 2. Render Canvas Icon (Orange Flame + Dark Badge with Dynamic Color Streak Text)
      try {
        if (typeof OffscreenCanvas !== "undefined" && chrome.action.setIcon) {
          const sizes = [16, 32, 48];
          const imageDataMap = {};

          sizes.forEach((size) => {
            const canvas = new OffscreenCanvas(size, size);
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.clearRect(0, 0, size, size);

            const scale = size / 32;

            // Draw Orange Flame
            const grad = ctx.createLinearGradient(0, size * 0.8, size * 0.8, 0);
            grad.addColorStop(0, "#ff3b00");
            grad.addColorStop(0.6, "#ff6a00");
            grad.addColorStop(1, "#ff9500");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(9 * scale, 25 * scale);
            ctx.bezierCurveTo(4 * scale, 20 * scale, 4 * scale, 13 * scale, 9 * scale, 9 * scale);
            ctx.bezierCurveTo(7 * scale, 12 * scale, 8 * scale, 15 * scale, 11 * scale, 16 * scale);
            ctx.bezierCurveTo(10 * scale, 11 * scale, 12 * scale, 5 * scale, 18 * scale, 2 * scale);
            ctx.bezierCurveTo(17 * scale, 7 * scale, 20 * scale, 8 * scale, 23 * scale, 10 * scale);
            ctx.bezierCurveTo(21 * scale, 10 * scale, 19 * scale, 10 * scale, 18 * scale, 11 * scale);
            ctx.bezierCurveTo(22 * scale, 13 * scale, 23 * scale, 16 * scale, 21 * scale, 19 * scale);
            ctx.bezierCurveTo(19 * scale, 24 * scale, 14 * scale, 26 * scale, 9 * scale, 25 * scale);
            ctx.closePath();
            ctx.fill();

            // Inner flame highlight core
            ctx.fillStyle = "#ffe600";
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(12 * scale, 20 * scale, 3.5 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Bottom-Right Dark Badge Overlay
            const boxW = Math.round(18 * scale);
            const boxH = Math.round(15 * scale);
            const boxX = size - boxW;
            const boxY = size - boxH;
            const radius = Math.round(4 * scale);

            ctx.fillStyle = "#121212";
            if (typeof ctx.roundRect === "function") {
              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxW, boxH, radius);
              ctx.fill();
            } else {
              ctx.fillRect(boxX, boxY, boxW, boxH);
            }

            // Streak number in Yellow (unsolved today) or Green (solved today)
            const fontSize = Math.max(9, Math.round(size * 0.38));
            ctx.fillStyle = textColor;
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(countStr, boxX + boxW / 2, boxY + boxH / 2 + 1);

            imageDataMap[size] = ctx.getImageData(0, 0, size, size);
          });

          chrome.action.setIcon({ imageData: imageDataMap }, () => {
            if (chrome.runtime.lastError) {
              // Ignore icon set errors if context invalid
            }
          });
        }
      } catch (err) {
        // Silently handle icon drawing errors
      }
    }
  }

  LeetCodeAutoSync.ExtensionIconService = ExtensionIconService;

})(typeof self !== "undefined" ? self : this);
