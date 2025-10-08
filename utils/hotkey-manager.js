// Hotkey Manager - Handles keyboard shortcuts for annotation modes
// Listens for Ctrl+Shift+T (text mode) and Ctrl+Shift+D (draw mode)

class HotkeyManager {
  constructor() {
    this.bindings = new Map();
    this.isEnabled = true;
    this.loadSettings();
    this.attachListeners();
  }

  /**
   * Load hotkey settings from storage
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      const settings = result.settings || {};

      // Set default bindings or load from settings
      this.bindings.set('textMode', settings.hotkeys?.textMode || 'Ctrl+Shift+T');
      this.bindings.set('drawMode', settings.hotkeys?.drawMode || 'Ctrl+Shift+D');

      console.log('Noted: Hotkeys loaded:', {
        textMode: this.bindings.get('textMode'),
        drawMode: this.bindings.get('drawMode')
      });
    } catch (error) {
      console.error('Noted: Error loading hotkey settings:', error);
      // Use defaults if error
      this.bindings.set('textMode', 'Ctrl+Shift+T');
      this.bindings.set('drawMode', 'Ctrl+Shift+D');
    }
  }

  /**
   * Attach keyboard event listeners
   */
  attachListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.settings) {
        this.loadSettings();
      }
    });
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyDown(e) {
    if (!this.isEnabled) return;

    // Don't trigger if user is typing in input field
    const target = e.target;
    if (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable) {
      return;
    }

    // IMPORTANT: Only handle Ctrl (not Cmd/Meta) to avoid conflicts
    // Only preventDefault if we're actually handling this key combo
    const keyCombo = this.getKeyCombo(e);

    if (keyCombo === this.bindings.get('textMode')) {
      e.preventDefault();
      e.stopPropagation();
      this.triggerTextMode();
    } else if (keyCombo === this.bindings.get('drawMode')) {
      e.preventDefault();
      e.stopPropagation();
      this.triggerDrawMode();
    }
    // For any other key combo, do nothing (let browser handle it)
  }

  /**
   * Convert keyboard event to key combination string
   * @param {KeyboardEvent} e - Keyboard event
   * @returns {string} Key combination (e.g., "Ctrl+Shift+T")
   */
  getKeyCombo(e) {
    const parts = [];

    // ONLY check ctrlKey (not metaKey/Cmd) to avoid Mac conflicts
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    // Get the actual key (not modifier keys)
    const key = e.key.toUpperCase();
    if (key !== 'CONTROL' &&
        key !== 'SHIFT' &&
        key !== 'ALT' &&
        key !== 'META' &&
        key !== 'OS' &&
        key !== 'F12') {  // Don't include F12 or other function keys
      parts.push(key);
    }

    return parts.join('+');
  }

  /**
   * Trigger text annotation mode
   */
  triggerTextMode() {
    console.log('Noted: Text Mode Activated (Ctrl+Shift+T)');

    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'ACTIVATE_TEXT_MODE'
    }).catch(error => {
      console.error('Noted: Error sending text mode message:', error);
    });
  }

  /**
   * Trigger drawing annotation mode
   */
  triggerDrawMode() {
    console.log('Noted: Draw Mode Activated (Ctrl+Shift+D)');

    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'ACTIVATE_DRAW_MODE'
    }).catch(error => {
      console.error('Noted: Error sending draw mode message:', error);
    });
  }

  /**
   * Enable hotkey detection
   */
  enable() {
    this.isEnabled = true;
    console.log('Noted: Hotkeys enabled');
  }

  /**
   * Disable hotkey detection (useful when annotation is active)
   */
  disable() {
    this.isEnabled = false;
    console.log('Noted: Hotkeys disabled');
  }

  /**
   * Update hotkey binding
   * @param {string} mode - 'textMode' or 'drawMode'
   * @param {string} keyCombo - New key combination
   */
  async updateBinding(mode, keyCombo) {
    this.bindings.set(mode, keyCombo);

    // Save to storage
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};

    if (!settings.hotkeys) {
      settings.hotkeys = {};
    }

    settings.hotkeys[mode] = keyCombo;
    await chrome.storage.local.set({ settings });

    console.log(`Noted: Hotkey updated - ${mode}: ${keyCombo}`);
  }
}

// Initialize hotkey manager when content script loads
console.log('Noted: Initializing HotkeyManager');
const hotkeyManager = new HotkeyManager();
