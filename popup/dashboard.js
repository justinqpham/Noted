// Noted Dashboard - Popup Logic
// Phase 1: Basic initialization and tab switching
// Full functionality will be implemented in Phase 5

console.log('Noted: Dashboard initialized');

// State
let currentTab = 'current-page';
let currentURL = '';

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Noted: Dashboard DOM loaded');

  // Get current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentURL = tab?.url || '';
    console.log('Noted: Current URL:', currentURL);
  } catch (error) {
    console.error('Noted: Error getting current tab:', error);
  }

  // Initialize tab switching
  initializeTabSwitching();

  // Initialize action buttons
  initializeActionButtons();

  // Initialize settings
  initializeSettings();

  // Load storage usage
  loadStorageUsage();
});

/**
 * Initialize tab switching functionality
 */
function initializeTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');

      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');

      currentTab = tabName;
      console.log('Noted: Switched to tab:', tabName);
    });
  });
}

/**
 * Initialize header action buttons
 */
function initializeActionButtons() {
  // Text mode button
  const textModeBtn = document.getElementById('text-mode-btn');
  textModeBtn.addEventListener('click', async () => {
    console.log('Noted: Text mode button clicked');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_TEXT_MODE' });
      window.close(); // Close popup after activation
    } catch (error) {
      console.error('Noted: Error activating text mode:', error);
    }
  });

  // Draw mode button
  const drawModeBtn = document.getElementById('draw-mode-btn');
  drawModeBtn.addEventListener('click', async () => {
    console.log('Noted: Draw mode button clicked');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE_DRAW_MODE' });
      window.close(); // Close popup after activation
    } catch (error) {
      console.error('Noted: Error activating draw mode:', error);
    }
  });

  // New collection button
  const newCollectionBtn = document.getElementById('new-collection-btn');
  newCollectionBtn.addEventListener('click', () => {
    console.log('Noted: New collection button clicked (Phase 5)');
    // Phase 5: Show modal to create new collection
  });

  // Export button
  const exportBtn = document.getElementById('export-btn');
  exportBtn.addEventListener('click', async () => {
    console.log('Noted: Export button clicked');
    await exportAnnotations();
  });

  // Import button
  const importBtn = document.getElementById('import-btn');
  importBtn.addEventListener('click', () => {
    console.log('Noted: Import button clicked (Phase 6)');
    // Phase 6: Show file picker to import annotations
  });

  // Clear all button
  const clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    console.log('Noted: Clear all button found, attaching listener');
    clearAllBtn.addEventListener('click', async () => {
      console.log('Noted: Clear all button clicked');

      // Double-click to confirm (since confirm() doesn't work in popups)
      if (clearAllBtn.dataset.confirmPending === 'true') {
        // Second click - actually clear
        clearAllBtn.dataset.confirmPending = 'false';
        clearAllBtn.textContent = 'Clear All Annotations';
        clearAllBtn.style.background = '';
        await clearAllAnnotations();
      } else {
        // First click - ask for confirmation
        clearAllBtn.dataset.confirmPending = 'true';
        clearAllBtn.textContent = 'Click again to confirm';
        clearAllBtn.style.background = '#ff3b30';

        // Reset after 3 seconds
        setTimeout(() => {
          clearAllBtn.dataset.confirmPending = 'false';
          clearAllBtn.textContent = 'Clear All Annotations';
          clearAllBtn.style.background = '';
        }, 3000);
      }
    });
  } else {
    console.error('Noted: Clear all button not found');
  }
}

/**
 * Initialize settings functionality
 */
function initializeSettings() {
  // Load settings from storage
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};

    // Tab close behavior checkboxes
    const keepOnClose = document.getElementById('keep-on-close');
    const clearOnClose = document.getElementById('clear-on-close');

    if (settings.closeTabBehavior === 'keep') {
      keepOnClose.checked = true;
    } else if (settings.closeTabBehavior === 'clear') {
      clearOnClose.checked = true;
    }

    // Ensure only one checkbox is checked
    keepOnClose.addEventListener('change', () => {
      if (keepOnClose.checked) {
        clearOnClose.checked = false;
        updateSettings({ closeTabBehavior: 'keep' });
      } else {
        updateSettings({ closeTabBehavior: 'ask' });
      }
    });

    clearOnClose.addEventListener('change', () => {
      if (clearOnClose.checked) {
        keepOnClose.checked = false;
        updateSettings({ closeTabBehavior: 'clear' });
      } else {
        updateSettings({ closeTabBehavior: 'ask' });
      }
    });

    // Hotkeys display (read-only in Phase 1)
    const textHotkey = document.getElementById('text-hotkey');
    const drawHotkey = document.getElementById('draw-hotkey');

    textHotkey.value = settings.hotkeys?.textMode || 'Ctrl+Shift+T';
    drawHotkey.value = settings.hotkeys?.drawMode || 'Ctrl+Shift+D';
  });
}

/**
 * Update settings in storage
 * @param {Object} updates - Settings updates
 */
async function updateSettings(updates) {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};

    const updatedSettings = { ...settings, ...updates };
    await chrome.storage.local.set({ settings: updatedSettings });

    console.log('Noted: Settings updated:', updatedSettings);
  } catch (error) {
    console.error('Noted: Error updating settings:', error);
  }
}

/**
 * Load and display storage usage
 */
async function loadStorageUsage() {
  try {
    const bytes = await new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, resolve);
    });

    const mb = (bytes / 1024 / 1024).toFixed(2);
    const maxMB = 10;
    const percentage = Math.min((mb / maxMB) * 100, 100);

    // Update storage bar
    const storageBarFill = document.getElementById('storage-bar-fill');
    const storageText = document.getElementById('storage-text');

    storageBarFill.style.width = `${percentage}%`;
    storageText.textContent = `Using ${mb} MB of ${maxMB} MB`;

    console.log('Noted: Storage usage:', mb, 'MB');
  } catch (error) {
    console.error('Noted: Error loading storage usage:', error);
  }
}

/**
 * Export annotations as JSON
 */
async function exportAnnotations() {
  try {
    const result = await chrome.storage.local.get(['annotations', 'collections', 'settings']);

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      annotations: result.annotations || {},
      collections: result.collections || {},
      settings: result.settings || {}
    };

    // Create blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `noted-annotations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Noted: Annotations exported');
  } catch (error) {
    console.error('Noted: Error exporting annotations:', error);
    alert('Error exporting annotations. Please try again.');
  }
}

/**
 * Clear all annotations
 */
async function clearAllAnnotations() {
  try {
    console.log('Noted: Clearing all annotations...');
    await chrome.storage.local.set({
      annotations: {},
      collections: {},
      annotationIndex: {}
    });

    console.log('Noted: All annotations cleared from storage');
    alert('All annotations have been cleared.');

    // Reload storage usage
    loadStorageUsage();
  } catch (error) {
    console.error('Noted: Error clearing annotations:', error);
    alert('Error clearing annotations. Please try again.');
  }
}
