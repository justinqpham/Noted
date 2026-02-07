// Noted Content Script - Main injection point
// Phase 3: Text and drawing annotation functionality

console.log('Noted: Content script loaded on', window.location.href);

// Detect PDF pages — Chrome's PDF viewer is a sandboxed plugin with no real DOM
const isPDFPage = document.contentType === 'application/pdf' || window.location.pathname.endsWith('.pdf');

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
  if (isPDFPage) {
    console.log('Noted: PDF page detected, annotations not supported');
    return;
  }

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

      case 'SCROLL_TO_ANNOTATION':
        scrollToAnnotation(message.annotationId);
        sendResponse({ success: true });
        break;

      // Phase 6: Export (SVG or PNG)
      case 'EXPORT_SVG':
        handleExportAnnotations('svg');
        sendResponse({ success: true });
        break;

      case 'EXPORT_ANNOTATIONS':
        handleExportAnnotations(message.format || 'svg');
        sendResponse({ success: true });
        break;

      // Phase 7: Share link generation
      case 'GENERATE_SHARE_LINK':
        handleGenerateShareLink(sendResponse);
        return true; // async response

      default:
        console.warn('Noted: Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true; // Keep message channel open for async response
  });

  isInitialized = true;
  console.log('Noted: Content script initialized successfully');

  // Phase 7: Check for share link after initialization
  checkForShareLink();
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
 * Scroll to and highlight a specific annotation
 * @param {string} annotationId - The annotation ID to scroll to
 */
function scrollToAnnotation(annotationId) {
  const el = document.querySelector(`[data-annotation-id="${annotationId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Flash highlight
    el.style.transition = 'box-shadow 0.3s';
    el.style.boxShadow = '0 0 20px 5px rgba(0, 122, 255, 0.5)';
    setTimeout(() => {
      el.style.boxShadow = '';
    }, 2000);
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

/**
 * Show a temporary notice that PDF annotation is not supported
 */
function showPDFUnsupportedNotice() {
  if (document.getElementById('noted-pdf-notice')) return;
  const notice = document.createElement('div');
  notice.id = 'noted-pdf-notice';
  notice.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
    'background:#1a1a2e;color:#fff;padding:12px 24px;border-radius:10px;font:14px/1.4 -apple-system,sans-serif;' +
    'box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:opacity 0.3s;';
  notice.textContent = 'Noted does not support PDF pages yet';
  document.body.appendChild(notice);
  setTimeout(() => {
    notice.style.opacity = '0';
    setTimeout(() => notice.remove(), 300);
  }, 3000);
}

// On PDF pages, listen for messages and show unsupported notice
if (isPDFPage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (['ACTIVATE_TEXT_MODE', 'TOGGLE_TEXT_MODE', 'ACTIVATE_DRAW_MODE', 'TOGGLE_DRAW_MODE',
         'EXPORT_SVG', 'EXPORT_ANNOTATIONS', 'GENERATE_SHARE_LINK'].includes(message.type)) {
      showPDFUnsupportedNotice();
      sendResponse({ success: false, error: 'PDF not supported' });
    }
    return true;
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

// ========================================================
// Phase 6: Export Handler (SVG / PNG)
// ========================================================

/**
 * Handle export request from popup.
 * @param {'svg'|'png'} format
 */
async function handleExportAnnotations(format) {
  if (!annotationManager) return;

  const annotations = annotationManager.getAnnotationsForCurrentPage();
  if (annotations.length === 0) {
    console.log('Noted: No annotations to export');
    return;
  }

  try {
    let blob, ext;

    if (format === 'png') {
      blob = await exportEngine.exportToPNG(annotations);
      ext = 'png';
    } else {
      blob = await exportEngine.exportToSVG(annotations, { format: 'blob' });
      ext = 'svg';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noted-${window.location.hostname}-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log(`Noted: ${ext.toUpperCase()} exported successfully`);
  } catch (error) {
    console.error('Noted: Export failed:', error);
  }
}

// ========================================================
// Phase 7: Share Link Generation & Receiver
// ========================================================

/**
 * Generate a share link for current page annotations
 */
async function handleGenerateShareLink(sendResponse) {
  if (!annotationManager) {
    sendResponse({ shareUrl: null });
    return;
  }

  const annotations = annotationManager.getAnnotationsForCurrentPage();
  if (annotations.length === 0) {
    sendResponse({ shareUrl: null });
    return;
  }

  try {
    const shareId = crypto.randomUUID().slice(0, 12);

    // Strip thumbnails to reduce storage size
    const lightAnnotations = annotations.map(a => {
      const copy = JSON.parse(JSON.stringify(a));
      if (copy.anchor) delete copy.anchor.thumbnail;
      return copy;
    });

    const shareData = {
      url: window.location.href,
      annotations: lightAnnotations,
      created: Date.now(),
      expires: Date.now() + (90 * 24 * 60 * 60 * 1000) // 90 days
    };

    await chrome.storage.local.set({
      [`noted-share-${shareId}`]: shareData
    });

    const baseUrl = window.location.href.split('#')[0];
    const shareUrl = `${baseUrl}#noted-share:${shareId}`;

    console.log('Noted: Share link generated:', shareUrl);
    sendResponse({ shareUrl });
  } catch (error) {
    console.error('Noted: Share link generation failed:', error);
    sendResponse({ shareUrl: null });
  }
}

/**
 * Check for share link on page load
 */
function checkForShareLink() {
  const hash = window.location.hash;
  if (!hash.startsWith('#noted-share:')) return;

  const shareId = hash.slice('#noted-share:'.length);
  if (!shareId) return;

  console.log('Noted: Detected share link, loading shared annotations');
  loadSharedAnnotations(shareId);
}

async function loadSharedAnnotations(shareId) {
  try {
    const key = `noted-share-${shareId}`;
    const result = await chrome.storage.local.get([key]);
    const shareData = result[key];

    if (!shareData) {
      console.log('Noted: Share data not found');
      return;
    }

    if (shareData.expires && Date.now() > shareData.expires) {
      console.log('Noted: Share link expired');
      await chrome.storage.local.remove([key]);
      return;
    }

    showSharedBanner(shareData);

    if (annotationManager) {
      shareData.annotations.forEach(annotation => {
        annotationManager.renderAnnotation(annotation);
      });
    }
  } catch (error) {
    console.error('Noted: Failed to load shared annotations:', error);
  }
}

function showSharedBanner(shareData) {
  const banner = document.createElement('div');
  banner.className = 'noted-shared-banner';

  const label = document.createElement('span');
  label.className = 'noted-shared-label';
  label.textContent = 'Viewing shared annotations';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'noted-shared-action-btn';
  saveBtn.textContent = 'Save to My Annotations';
  saveBtn.addEventListener('click', async () => {
    if (!annotationManager) return;
    for (const annotation of shareData.annotations) {
      annotation.id = crypto.randomUUID();
      await annotationManager.saveAnnotation(annotation);
    }
    annotationManager.loadAnnotations();
    banner.remove();
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'noted-shared-dismiss-btn';
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.addEventListener('click', () => banner.remove());

  banner.appendChild(label);
  banner.appendChild(saveBtn);
  banner.appendChild(dismissBtn);
  document.body.insertBefore(banner, document.body.firstChild);
}

// Export for testing
if (typeof window !== 'undefined') {
  window.notedContentScript = {
    handleTextMode,
    handleDrawMode,
    isInitialized: () => isInitialized
  };
}
