// Noted Content Script - Main injection point
// Phase 3: Text and drawing annotation functionality

console.log('Noted: Content script loaded on', window.location.href);

// State
let isInitialized = false;
let annotationManager = null;
let textModeController = null;
let drawModeController = null;

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
        handleTextMode();
        sendResponse({ success: true });
        break;

      case 'ACTIVATE_DRAW_MODE':
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
 * Handle text annotation mode activation
 */
function handleTextMode() {
  console.log('Noted: Text Mode Activated');

  if (textModeController) {
    textModeController.activate();
  } else {
    console.error('Noted: TextModeController not initialized');
  }
}

/**
 * Handle drawing annotation mode activation
 */
function handleDrawMode() {
  console.log('Noted: Draw Mode Activated');

  if (drawModeController) {
    drawModeController.activate();
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
 * Show temporary notification for mode activation (Phase 1 only)
 * Will be replaced with actual UI in later phases
 */
function showModeNotification(message, icon) {
  // Create notification element
  const notification = document.createElement('div');
  notification.textContent = `${icon} ${message}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    animation: fadeInOut 2s ease;
    pointer-events: none;
  `;

  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(-10px); }
      10% { opacity: 1; transform: translateY(0); }
      90% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-10px); }
    }
  `;
  document.head.appendChild(style);

  // Add to page
  document.body.appendChild(notification);

  // Remove after animation
  setTimeout(() => {
    notification.remove();
    style.remove();
  }, 2000);
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
