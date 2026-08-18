/**
 * SettingsComponent
 * Minimalist developer preferences list with inputs, toggles, and cache reset controls.
 */

(function (global) {
  "use strict";

  const LeetCodeAutoSync = global.LeetCodeAutoSync || (global.LeetCodeAutoSync = {});

  class SettingsComponent {
    static render(viewModel = {}, container = null) {
      if (!container) return;

      const { DiagnosticsService } = LeetCodeAutoSync;

      container.innerHTML = `
        <div class="settings-card">
          <div class="settings-header">
            <span class="card-title">Extension Preferences</span>
            <span class="card-tag">Config</span>
          </div>

          <div class="settings-list">
            <div class="setting-row">
              <div class="setting-text">
                <span class="setting-name">Automatic Solution Sync</span>
                <span class="setting-desc">Push accepted solutions immediately upon submission</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" checked id="setting-toggle-autosync">
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <span class="setting-name">Backend API Server Endpoint</span>
                <span class="setting-desc">Local FastAPI worker endpoint URL</span>
              </div>
              <input type="text" class="setting-input" value="http://127.0.0.1:8000" id="setting-backend-url-input">
            </div>

            <div class="setting-row">
              <div class="setting-text">
                <span class="setting-name">Theme Appearance</span>
                <span class="setting-desc">Match LeetCode Dark visual identity</span>
              </div>
              <select class="setting-select" id="setting-theme-select">
                <option value="leetcode-dark" selected>Native LeetCode Dark</option>
                <option value="system">System Default</option>
              </select>
            </div>

            <div class="setting-row no-border">
              <button id="clear-cache-btn" class="btn btn-danger-outline" style="font-size: 11px;">Clear Local Data Store Cache</button>
            </div>
          </div>
        </div>
      `;

      // Hydrate saved backend URL
      const urlInput = container.querySelector("#setting-backend-url-input");
      if (urlInput && typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ backendUrl: "http://127.0.0.1:8000" }, (items) => {
          if (items && items.backendUrl && urlInput) {
            urlInput.value = items.backendUrl;
          }
        });

        urlInput.addEventListener("change", () => {
          const newUrl = urlInput.value.trim();
          if (newUrl) {
            chrome.storage.local.set({ backendUrl: newUrl });
          }
        });
      }

      // Handle Clear Cache
      const clearBtn = container.querySelector("#clear-cache-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", async () => {
          clearBtn.textContent = "Clearing...";
          clearBtn.disabled = true;
          if (DiagnosticsService && typeof DiagnosticsService.clearCache === "function") {
            await DiagnosticsService.clearCache();
          }
          clearBtn.textContent = "✓ Cache Cleared";
          setTimeout(() => {
            clearBtn.textContent = "Clear Local Data Store Cache";
            clearBtn.disabled = false;
          }, 2000);
        });
      }
    }
  }

  LeetCodeAutoSync.SettingsComponent = SettingsComponent;
})(typeof self !== "undefined" ? self : this);
