// Noted Content Script - Main injection point
// Phase 3: Text and drawing annotation functionality

console.log('Noted: Content script loaded on', window.location.href);

// State
let isInitialized = false;
let annotationManager = null;
let textModeController = null;
let drawModeController = null;
let lastToggleTimestamp = 0;
const TOGGLE_DEBOUNCE_MS = 300;

/**
 * Initialize content script
 */
function initialize() {
  if (isInitialized) {
    console.log('Noted: Already initialized');
    return;
  }

  console.log('Noted: Initializing content script');

  // Initialize annotation manager
  annotationManager = new AnnotationManager();

  // Initialize text mode controller
  textModeController = new TextModeController(annotationManager);

  // Initialize draw mode controller
  drawModeController = new DrawModeController(annotationManager);
  annotationManager.drawMode = drawModeController;

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Noted: Message received in content script:', message.type);

    switch (message.type) {
      case 'ACTIVATE_TEXT_MODE':
      case 'TOGGLE_TEXT_MODE':
        handleTextMode();
        sendResponse({ success: true });
        break;

      case 'ACTIVATE_DRAW_MODE':
      case 'TOGGLE_DRAW_MODE':
        handleDrawMode();
        sendResponse({ success: true });
        break;

      case 'ANNOTATIONS_UPDATED':
        handleAnnotationsUpdated(message.annotations);
        sendResponse({ success: true });
        break;

      default:
        console.warn('Noted: Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true; // Keep message channel open for async response
  });

  isInitialized = true;
  console.log('Noted: Content script initialized successfully');
}

/**
 * Handle text annotation mode toggle (activate if off, deactivate if on).
 * Debounced to prevent double-firing from Chrome commands API + HotkeyManager.
 */
function handleTextMode() {
  const now = Date.now();
  if (now - lastToggleTimestamp < TOGGLE_DEBOUNCE_MS) return;
  lastToggleTimestamp = now;

  if (textModeController) {
    if (textModeController.isActive) {
      console.log('Noted: Text Mode Deactivated');
      textModeController.deactivate();
    } else {
      // Deactivate draw mode if active
      if (drawModeController && drawModeController.isActive) {
        drawModeController.deactivate();
      }
      console.log('Noted: Text Mode Activated');
      textModeController.activate();
    }
  } else {
    console.error('Noted: TextModeController not initialized');
  }
}

/**
 * Handle drawing annotation mode toggle (activate if off, deactivate if on).
 * Debounced to prevent double-firing from Chrome commands API + HotkeyManager.
 */
function handleDrawMode() {
  const now = Date.now();
  if (now - lastToggleTimestamp < TOGGLE_DEBOUNCE_MS) return;
  lastToggleTimestamp = now;

  if (drawModeController) {
    if (drawModeController.isActive) {
      console.log('Noted: Draw Mode Deactivated');
      drawModeController.deactivate();
    } else {
      // Deactivate text mode if active
      if (textModeController && textModeController.isActive) {
        textModeController.deactivate();
      }
      console.log('Noted: Draw Mode Activated');
      drawModeController.activate();
    }
  } else {
    console.error('Noted: DrawModeController not initialized');
  }
}

/**
 * Handle annotations update from other tabs
 * Phase 6: Will implement real-time sync
 */
function handleAnnotationsUpdated(annotations) {
  console.log('Noted: Annotations updated (Phase 6)', annotations);
  // Phase 6: Reload annotations from storage and re-render
  if (annotationManager) {
    annotationManager.loadAnnotations();
  }
}

/**
 * Verify extension is working
 */
function verifyExtension() {
  console.log('Noted: Extension verification:', {
    url: window.location.href,
    hotkeyManagerLoaded: typeof hotkeyManager !== 'undefined',
    chromeRuntimeAvailable: typeof chrome?.runtime !== 'undefined',
    documentReady: document.readyState
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
    verifyExtension();
  });
} else {
  initialize();
  verifyExtension();
}

// Export for testing
if (typeof window !== 'undefined') {
  window.notedContentScript = {
    handleTextMode,
    handleDrawMode,
    isInitialized: () => isInitialized
  };
}
