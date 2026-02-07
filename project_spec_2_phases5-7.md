# Noted - Phases 5-7 Specification

**Load this file when working on Phases 5, 6, or 7**

**Prerequisites:** Read `project_spec_1_foundation.md` first

---

## Phase 5: Robust Anchoring System

### Problem Statement

Current page-relative anchoring breaks when:
- Page content changes (dynamic sites, SPAs)
- DOM structure updates
- Window resizes
- User scrolls then refreshes

### Solution: Enhanced Anchoring with Confidence Scoring and Correction Calibration

Build on the **existing `AnchorEngine` class** in `content/anchor-engine.js` (already implements XPath, CSS selector, text content matching, page positioning, and fingerprinting). Add confidence scoring, richer text-context matching, correction calibration from user repositioning, screenshot thumbnails, and a warning system for page changes.

---

### Enhanced Anchor Data Model

Extend the existing anchor object with confidence scores and correction tracking:

```javascript
// Extended anchor data (stored per annotation)
{
  // Existing fields from current AnchorEngine.generateAnchor()
  strategy: 'hybrid',
  xpath: '/body/div[2]/article/button',
  cssSelector: 'article.product > button.cta',
  textContent: 'Buy Now',
  offsetX: 12,
  offsetY: 8,
  pageX: 500,
  pageY: 1500,
  elementPageX: 488,
  elementPageY: 1492,
  scrollX: 0,
  scrollY: 1200,
  viewportWidth: 1920,
  viewportHeight: 1080,

  // NEW: Confidence scores per strategy (0.0 - 1.0)
  confidence: {
    xpath: 0.70,
    cssSelector: 0.65,
    textContent: 0.85,
    position: 0.40
  },

  // NEW: Richer text context for matching (survives layout changes)
  textContext: {
    targetText: 'Buy Now',
    contextBefore: 'Only 3 left in stock',   // preceding text node
    contextAfter: 'Free shipping',            // following text node
    parentTag: 'BUTTON',
    parentClasses: ['cta-primary']
  },

  // NEW: Page fingerprint for change detection
  pageFingerprint: {
    domHash: 123456789,
    textHash: 987654321,
    timestamp: 1696704000000
  },

  // NEW: Correction calibration data
  learnedOffset: { x: 0, y: 0 },
  corrections: [],  // Array of { timestamp, delta: {x,y}, anchorUsed }

  // NEW: Thumbnail (base64 JPEG, ~5-15KB cropped)
  thumbnail: 'data:image/jpeg;base64,...'
}
```

---

### Anchor Resolution Algorithm

**Update:** `content/anchor-engine.js` (EXISTING file - add methods to existing class)

Add a new `resolveWithConfidence()` static method that tries strategies in confidence order:

```javascript
// Add to existing AnchorEngine class

/**
 * Resolve anchor using confidence-ranked strategies.
 * Tries each strategy in order of confidence score, applies learned offset.
 * @param {Object} anchor - Anchor data with confidence scores
 * @returns {Object} { element, x, y, strategy, confidence, success }
 */
static resolveWithConfidence(anchor) {
  if (!anchor || !anchor.confidence) {
    // Fall back to existing resolveAnchor() for old-format anchors
    return this.resolveAnchor(anchor);
  }

  // Build strategy list sorted by confidence (highest first)
  const strategies = [
    { type: 'xpath', confidence: anchor.confidence.xpath || 0 },
    { type: 'cssSelector', confidence: anchor.confidence.cssSelector || 0 },
    { type: 'textContent', confidence: anchor.confidence.textContent || 0 },
    { type: 'position', confidence: anchor.confidence.position || 0 }
  ].sort((a, b) => b.confidence - a.confidence);

  for (const strategy of strategies) {
    const result = this.tryStrategy(strategy.type, anchor);

    if (result) {
      // Apply learned offset correction
      if (anchor.learnedOffset) {
        result.x += anchor.learnedOffset.x || 0;
        result.y += anchor.learnedOffset.y || 0;
      }

      // Boost confidence for successful strategy
      anchor.confidence[strategy.type] = Math.min(
        (anchor.confidence[strategy.type] || 0) + 0.05,
        1.0
      );

      return {
        ...result,
        strategy: strategy.type,
        confidence: strategy.confidence,
        success: true
      };
    }
  }

  // All strategies failed - show warning, use stored page position
  return {
    element: null,
    x: anchor.pageX - (window.pageXOffset || 0),
    y: anchor.pageY - (window.pageYOffset || 0),
    strategy: 'fallback',
    confidence: 0.10,
    success: false,
    requiresUserReview: true
  };
}

/**
 * Try a single anchor strategy
 * @param {string} type - Strategy type
 * @param {Object} anchor - Full anchor data
 * @returns {Object|null} { element, x, y } or null
 */
static tryStrategy(type, anchor) {
  switch (type) {
    case 'xpath':
      return this.tryXPath(anchor);

    case 'cssSelector':
      return this.tryCSSSelector(anchor);

    case 'textContent':
      return this.tryTextContent(anchor);

    case 'position':
      return this.tryPosition(anchor);

    default:
      return null;
  }
}

// tryXPath, tryCSSSelector reuse existing resolveXPath/resolveCSSSelector
// with offset application from anchor.offsetX/offsetY

static tryXPath(anchor) {
  if (!anchor.xpath) return null;
  const element = this.resolveXPath(anchor.xpath);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { element, x: rect.left + anchor.offsetX, y: rect.top + anchor.offsetY };
}

static tryCSSSelector(anchor) {
  if (!anchor.cssSelector) return null;
  const element = this.resolveCSSSelector(anchor.cssSelector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { element, x: rect.left + anchor.offsetX, y: rect.top + anchor.offsetY };
}

/**
 * Enhanced text matching with surrounding context
 */
static tryTextContent(anchor) {
  const ctx = anchor.textContext;
  if (!ctx && !anchor.textContent) return null;

  const targetText = ctx ? ctx.targetText : anchor.textContent;

  // Use TreeWalker for efficient text node search
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim()) {
      textNodes.push(node);
    }
  }

  for (let i = 0; i < textNodes.length; i++) {
    const text = textNodes[i].textContent;
    if (!text.includes(targetText)) continue;

    // If we have context, verify surrounding text
    if (ctx && ctx.contextBefore) {
      const prevText = textNodes[i - 1]?.textContent || '';
      const nextText = textNodes[i + 1]?.textContent || '';

      if (!prevText.includes(ctx.contextBefore) ||
          !nextText.includes(ctx.contextAfter || '')) {
        continue;  // Context mismatch, try next occurrence
      }
    }

    const element = textNodes[i].parentElement;
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    return {
      element,
      x: rect.left + (anchor.offsetX || 0),
      y: rect.top + (anchor.offsetY || 0)
    };
  }

  return null;
}

static tryPosition(anchor) {
  if (anchor.pageX === undefined) return null;
  const currentScrollX = window.pageXOffset || 0;
  const currentScrollY = window.pageYOffset || 0;
  return {
    element: null,
    x: anchor.pageX - currentScrollX,
    y: anchor.pageY - currentScrollY
  };
}
```

---

### Correction Calibration (User Repositioning)

When a user drags an annotation to correct its position, record the correction and learn a consistent offset. This is **not** machine learning - it's statistical offset calibration that detects consistent drift patterns.

**Add to:** `content/anchor-engine.js`

```javascript
/**
 * Record a user correction when they reposition an annotation.
 * After 3+ corrections with consistent direction, applies a permanent offset.
 * @param {Object} annotation - The annotation being corrected
 * @param {Object} oldPosition - { x, y } before correction
 * @param {Object} newPosition - { x, y } after correction
 */
static recordCorrection(annotation, oldPosition, newPosition) {
  const anchor = annotation.anchor;
  if (!anchor) return;

  if (!anchor.corrections) anchor.corrections = [];

  anchor.corrections.push({
    timestamp: Date.now(),
    delta: {
      x: newPosition.x - oldPosition.x,
      y: newPosition.y - oldPosition.y
    }
  });

  // Keep only last 20 corrections per annotation
  if (anchor.corrections.length > 20) {
    anchor.corrections = anchor.corrections.slice(-20);
  }

  // After 3+ corrections, check for consistent pattern
  if (anchor.corrections.length >= 3) {
    this.calibrateOffset(anchor);
  }
}

/**
 * Analyze correction history and apply permanent offset if consistent.
 * Uses average delta with low standard deviation as the threshold.
 */
static calibrateOffset(anchor) {
  const deltas = anchor.corrections.map(c => c.delta);

  const avgX = deltas.reduce((sum, d) => sum + d.x, 0) / deltas.length;
  const avgY = deltas.reduce((sum, d) => sum + d.y, 0) / deltas.length;

  // Standard deviation
  const stdX = Math.sqrt(
    deltas.reduce((sum, d) => sum + Math.pow(d.x - avgX, 2), 0) / deltas.length
  );
  const stdY = Math.sqrt(
    deltas.reduce((sum, d) => sum + Math.pow(d.y - avgY, 2), 0) / deltas.length
  );

  // Only apply if corrections are consistent (low variance)
  if (stdX < 20 && stdY < 20) {
    anchor.learnedOffset = { x: Math.round(avgX), y: Math.round(avgY) };
    console.log('Noted: Calibrated anchor offset:', anchor.learnedOffset);
  }
}
```

---

### Screenshot Thumbnail Capture

Thumbnails require `chrome.tabs.captureVisibleTab()` which is **only available in the background service worker**, not content scripts. Use message passing.

**Update:** `background/service-worker.js` (add screenshot handler)

```javascript
// Add to message listener switch:
case 'CAPTURE_THUMBNAIL':
  handleCaptureThumbnail(message, sendResponse);
  return true;  // async response

async function handleCaptureThumbnail(message, sendResponse) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'jpeg',
      quality: 50  // Compress for storage
    });
    sendResponse({ success: true, dataUrl });
  } catch (error) {
    console.error('Noted: Thumbnail capture failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}
```

**Update:** `content/annotation-manager.js` (request thumbnail via messaging)

```javascript
async captureThumbnail(position) {
  try {
    // Request screenshot from background service worker
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_THUMBNAIL'
    });

    if (!response?.success || !response.dataUrl) return null;

    // Crop to 300x200 region around annotation
    const rect = {
      x: Math.max(0, position.x - (window.pageXOffset || 0) - 50),
      y: Math.max(0, position.y - (window.pageYOffset || 0) - 50),
      width: 300,
      height: 200
    };

    return await this.cropImage(response.dataUrl, rect);
  } catch (error) {
    console.error('Noted: Thumbnail capture failed:', error);
    return null;
  }
}

async cropImage(dataUrl, rect) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        rect.x, rect.y, rect.width, rect.height,
        0, 0, rect.width, rect.height
      );

      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
```

**Storage quota strategy:** Thumbnails are ~5-15KB each (cropped JPEG at 50% quality). To prevent exceeding Chrome's 10MB `storage.local` quota:
- Only capture thumbnails for element-anchored annotations (not page-positioned ones)
- Cap at 200 thumbnails total; evict oldest when exceeded
- Check `chrome.storage.local.getBytesInUse()` before saving; skip thumbnail if > 8MB used

---

### Warning System for Page Changes

When anchor resolution falls back to position-only, show a non-intrusive warning banner. Use `addEventListener` instead of inline `onclick` handlers to avoid XSS risks.

**Add to:** `content/anchor-engine.js`

```javascript
/**
 * Show warning banner when anchoring falls back.
 * Uses addEventListener (not inline onclick) for security.
 * Only shows once per session per URL.
 */
static showAnchorWarning(annotationId) {
  const key = `noted-warning-${window.location.href}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, 'true');

  const banner = document.createElement('div');
  banner.className = 'noted-anchor-warning';

  const content = document.createElement('div');
  content.className = 'noted-warning-content';
  content.textContent = 'This page changed. Some annotations may be misaligned.';

  const viewBtn = document.createElement('button');
  viewBtn.textContent = 'View Original';
  viewBtn.addEventListener('click', () => {
    // Show thumbnail overlay for the affected annotation
    if (typeof annotationManager !== 'undefined') {
      annotationManager.showThumbnailOverlay(annotationId);
    }
  });

  const repositionBtn = document.createElement('button');
  repositionBtn.textContent = 'Reposition';
  repositionBtn.addEventListener('click', () => {
    if (typeof annotationManager !== 'undefined') {
      annotationManager.enableRepositionMode(annotationId);
    }
    banner.remove();
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.addEventListener('click', () => banner.remove());

  content.appendChild(viewBtn);
  content.appendChild(repositionBtn);
  content.appendChild(dismissBtn);
  banner.appendChild(content);

  document.body.insertBefore(banner, document.body.firstChild);

  // Auto-dismiss after 10 seconds
  setTimeout(() => banner.remove(), 10000);
}
```

---

### Phase 5 Testing Requirements

**Unit Tests** (`tests/anchor-engine.test.html`):
- [ ] Test `resolveWithConfidence()` with all strategy types
- [ ] Test fallback chain when strategies fail one by one
- [ ] Test confidence score boosting after successful resolution
- [ ] Test `recordCorrection()` and `calibrateOffset()` with mock data
- [ ] Test backward compatibility: old anchors without confidence scores
- [ ] Test `generatePageFingerprint()` and `hasContentChanged()`

**Manual Testing:**
- [ ] Create annotation on Wikipedia → refresh 5 times → stays anchored
- [ ] Create annotation on Twitter feed → scroll + refresh → warning appears
- [ ] Manually reposition annotation → correction recorded → offset calibrated after 3 corrections
- [ ] Navigate away and back → calibrated anchor persists
- [ ] Change page content (DevTools) → warning appears with thumbnail
- [ ] Verify old-format annotations (pre-Phase 5) still load correctly

**Test Sites:**
- Wikipedia (static)
- Twitter/X feed (dynamic)
- Reddit post (semi-static)
- Amazon product page (complex)
- Gmail (SPA)

---

## Phase 6: SVG Export

### Goal

Export annotations to SVG format with:
- Screenshot as locked background layer
- Annotations as editable vector foreground
- Single layered file compatible with Figma and other SVG editors

---

### Export Engine

**File:** `content/export-engine.js` (NEW)

**Important:** This is a content script (not an ES module). Do not use `export` syntax. Screenshot capture must go through the background service worker via message passing.

```javascript
// Export Engine - Generates layered SVG from annotations
// Loaded as content script (no ES module exports)

class ExportEngine {
  /**
   * Export annotations to SVG with screenshot background.
   * @param {Array} annotations - Annotations to export
   * @param {Object} options - { format: 'blob'|'string' }
   * @returns {Blob|string} SVG output
   */
  async exportToSVG(annotations, options = {}) {
    // Request screenshot from background service worker
    const screenshot = await this.captureScreenshot();

    // Use viewport dimensions as canvas size (matches screenshot)
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create SVG container
    const svg = this.createSVGContainer(width, height);

    // Add screenshot as locked background layer
    if (screenshot) {
      this.addBackgroundImage(svg, screenshot, width, height);
    }

    // Add annotations as editable foreground layer
    const annotationGroup = document.createElementNS(
      'http://www.w3.org/2000/svg', 'g'
    );
    annotationGroup.setAttribute('id', 'annotations-layer');

    // Calculate scroll offset to convert page coords → viewport coords
    const scrollX = window.pageXOffset || 0;
    const scrollY = window.pageYOffset || 0;

    annotations.forEach(annotation => {
      if (annotation.type === 'text') {
        this.addTextAnnotation(annotationGroup, annotation, scrollX, scrollY);
      } else if (annotation.type === 'drawing') {
        this.addDrawingAnnotation(annotationGroup, annotation, scrollX, scrollY);
      }
    });

    svg.appendChild(annotationGroup);

    if (options.format === 'blob') {
      return this.svgToBlob(svg);
    }

    return new XMLSerializer().serializeToString(svg);
  }

  createSVGContainer(width, height) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Add metadata
    const metadata = document.createElementNS(
      'http://www.w3.org/2000/svg', 'metadata'
    );
    metadata.textContent = JSON.stringify({
      generator: 'Noted Chrome Extension',
      url: window.location.href,
      exported: new Date().toISOString()
    });
    svg.appendChild(metadata);

    return svg;
  }

  addBackgroundImage(svg, screenshot, width, height) {
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', screenshot);
    image.setAttribute('x', '0');
    image.setAttribute('y', '0');
    image.setAttribute('width', width);
    image.setAttribute('height', height);
    image.setAttribute('id', 'background-screenshot');

    // Wrap in locked group (Figma respects sodipodi:insensitive)
    const lockedGroup = document.createElementNS(
      'http://www.w3.org/2000/svg', 'g'
    );
    lockedGroup.setAttribute('id', 'background-layer');
    lockedGroup.setAttribute('sodipodi:insensitive', 'true');
    lockedGroup.appendChild(image);

    svg.appendChild(lockedGroup);
  }

  /**
   * Add text annotation using native SVG elements (not foreignObject).
   * Native SVG text/rect is much better supported in Figma than foreignObject.
   */
  addTextAnnotation(group, annotation, scrollX, scrollY) {
    const x = annotation.position.x - scrollX;
    const y = annotation.position.y - scrollY;
    const w = annotation.position.width || 200;
    const h = annotation.position.height || 100;

    // Background rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('rx', '8');
    rect.setAttribute('fill', annotation.content.backgroundColor || '#FFEB3B');
    rect.setAttribute('fill-opacity', '0.9');
    group.appendChild(rect);

    // Text content
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x + 12);
    text.setAttribute('y', y + 24);
    text.setAttribute('font-family', 'system-ui, sans-serif');
    text.setAttribute('font-size', '14');
    text.setAttribute('fill', '#000000');

    // Word-wrap text into tspan lines
    const words = (annotation.content.text || '').split(' ');
    let line = '';
    let lineY = y + 24;
    const maxWidth = w - 24;

    words.forEach(word => {
      const testLine = line ? `${line} ${word}` : word;
      // Approximate: 7px per character at 14px font
      if (testLine.length * 7 > maxWidth && line) {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', x + 12);
        tspan.setAttribute('y', lineY);
        tspan.textContent = line;
        text.appendChild(tspan);
        line = word;
        lineY += 20;
      } else {
        line = testLine;
      }
    });

    // Last line
    if (line) {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', x + 12);
      tspan.setAttribute('y', lineY);
      tspan.textContent = line;
      text.appendChild(tspan);
    }

    group.appendChild(text);
  }

  addDrawingAnnotation(group, annotation, scrollX, scrollY) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Translate SVG path from page coords to viewport coords
    // The stored svgPath uses page coordinates, so offset by scroll
    const transform = `translate(${-scrollX}, ${-scrollY})`;
    path.setAttribute('transform', transform);
    path.setAttribute('d', annotation.content.svgPath);
    path.setAttribute('stroke', annotation.content.strokeColor);
    path.setAttribute('stroke-width', annotation.content.strokeWidth);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    group.appendChild(path);
  }

  /**
   * Capture screenshot via background service worker.
   * chrome.tabs.captureVisibleTab() is not available in content scripts.
   */
  async captureScreenshot() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT',
        format: 'png'
      });
      return response?.success ? response.dataUrl : null;
    } catch (error) {
      console.error('Noted: Screenshot capture failed:', error);
      return null;
    }
  }

  svgToBlob(svg) {
    const svgString = new XMLSerializer().serializeToString(svg);
    return new Blob([svgString], { type: 'image/svg+xml' });
  }
}

// Make available globally (content script context, not ES module)
const exportEngine = new ExportEngine();
```

---

### Background Service Worker Screenshot Handler

**Update:** `background/service-worker.js`

```javascript
// Add to message listener switch:
case 'CAPTURE_SCREENSHOT':
  handleCaptureScreenshot(message, sendResponse);
  return true;  // async response

async function handleCaptureScreenshot(message, sendResponse) {
  try {
    const format = message.format || 'png';
    const options = { format };
    if (format === 'jpeg') options.quality = 80;

    const dataUrl = await chrome.tabs.captureVisibleTab(null, options);
    sendResponse({ success: true, dataUrl });
  } catch (error) {
    console.error('Noted: Screenshot capture failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}
```

---

### Export UI

**Update:** `popup/dashboard.js`

The export flow is triggered from the popup. It sends a message to the content script to perform the export, then the content script initiates the download.

```javascript
// Popup sends export request to content script
async function handleExportSVG() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'EXPORT_SVG' });
    // Content script handles the download
  } catch (error) {
    showError('Export failed: ' + error.message);
  }
}
```

**Update:** `content/content-script.js` (add export message handler)

```javascript
// In the message listener switch:
case 'EXPORT_SVG':
  handleExportSVG();
  sendResponse({ success: true });
  break;

async function handleExportSVG() {
  if (!annotationManager) return;

  const annotations = annotationManager.getAnnotationsForCurrentPage();
  if (annotations.length === 0) {
    console.log('Noted: No annotations to export');
    return;
  }

  const svgBlob = await exportEngine.exportToSVG(annotations, { format: 'blob' });

  // Trigger download
  const url = URL.createObjectURL(svgBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `noted-${window.location.hostname}-${Date.now()}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

---

### Phase 6 Notes

- **Viewport-only export (MVP):** Only annotations visible in the current viewport are accurately positioned against the screenshot. Future enhancement: scroll-stitch for full-page export.
- **Figma compatibility:** Uses native SVG `<rect>` + `<text>` instead of `<foreignObject>` (which Figma doesn't render). Drawing paths are native SVG `<path>` elements and import cleanly.
- **No ES module syntax:** This file is loaded as a content script via `manifest.json`, not as a module. Use global `const exportEngine = new ExportEngine()` pattern.

---

### Phase 6 Testing Requirements

**Unit Tests** (`tests/export-engine.test.html`):
- [ ] Test SVG container creation (correct dimensions, viewBox)
- [ ] Test text annotation renders as `<rect>` + `<text>` (not foreignObject)
- [ ] Test drawing annotation renders as `<path>` with correct transform
- [ ] Test SVG serialization to Blob

**Manual Testing:**
- [ ] Export page with text annotations → open SVG in browser → renders correctly
- [ ] Export page with drawings → open SVG in browser → strokes visible
- [ ] Import SVG into Figma → text editable, drawings editable, background locked
- [ ] Export with no annotations → graceful "nothing to export" message
- [ ] Export on scrolled page → annotations align with screenshot

---

## Phase 7: Basic Sharing (Extension-to-Extension)

### Goal

Share annotations via link. Recipient must have the Noted extension installed to view.

### Approach: Storage-Based Sharing with Short IDs

**No authentication required for MVP.** Instead of encoding full annotation data in URLs (which hits browser URL length limits and breaks with non-ASCII text), use a lightweight approach:

1. Sender serializes annotations and stores them in `chrome.storage.local` with a generated share ID
2. Share link is a compact URL: `<page-url>#noted-share:<share-id>`
3. Recipient's extension detects the `#noted-share:` prefix and requests data
4. Since both parties have the extension, data transfer uses extension messaging

**Limitation:** This MVP approach only works when sharing between browsers on the same machine (shared `chrome.storage.local`). For cross-machine sharing, Phase 8+ cloud sync is needed. An intermediate option is to encode minimal annotation metadata (positions + colors, no SVG paths) and reconstruct on the receiving end.

---

### Share Link Generation

**Update:** `popup/dashboard.js`

```javascript
async function handleShareAnnotations() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'GENERATE_SHARE_LINK'
    });

    if (response?.shareUrl) {
      await navigator.clipboard.writeText(response.shareUrl);
      showSuccess('Share link copied to clipboard!');
    } else {
      showError('No annotations to share');
    }
  } catch (error) {
    showError('Failed to create share link: ' + error.message);
  }
}
```

**Update:** `content/content-script.js`

```javascript
// In message listener switch:
case 'GENERATE_SHARE_LINK':
  handleGenerateShareLink(sendResponse);
  return true;  // async response

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

  // Generate a short share ID
  const shareId = crypto.randomUUID().slice(0, 12);

  // Strip thumbnails to reduce storage size
  const lightAnnotations = annotations.map(a => {
    const copy = { ...a };
    delete copy.thumbnail;  // Don't share thumbnails
    return copy;
  });

  // Store share data
  const shareData = {
    url: window.location.href,
    annotations: lightAnnotations,
    created: Date.now(),
    expires: Date.now() + (90 * 24 * 60 * 60 * 1000)  // 90 days
  };

  await chrome.storage.local.set({
    [`noted-share-${shareId}`]: shareData
  });

  // Build share URL: original page URL + share fragment
  const baseUrl = window.location.href.split('#')[0];
  const shareUrl = `${baseUrl}#noted-share:${shareId}`;

  sendResponse({ shareUrl });
}
```

---

### Share Link Receiver

**Update:** `content/content-script.js`

The receiver checks for the unique `#noted-share:` prefix on page load. This prefix avoids false positives with normal hash-based routing.

```javascript
// Check for share link on initialization (after annotationManager is ready)
function checkForShareLink() {
  const hash = window.location.hash;
  if (!hash.startsWith('#noted-share:')) return;

  const shareId = hash.slice('#noted-share:'.length);
  if (!shareId) return;

  loadSharedAnnotations(shareId);
}

async function loadSharedAnnotations(shareId) {
  try {
    const key = `noted-share-${shareId}`;
    const result = await chrome.storage.local.get([key]);
    const shareData = result[key];

    if (!shareData) {
      console.log('Noted: Share data not found (may have expired or been deleted)');
      return;
    }

    // Check expiration
    if (shareData.expires && Date.now() > shareData.expires) {
      console.log('Noted: Share link expired');
      // Clean up expired data
      await chrome.storage.local.remove([key]);
      return;
    }

    // Show shared annotations banner
    showSharedBanner(shareData);

    // Render annotations as read-only
    shareData.annotations.forEach(annotation => {
      annotationManager.renderAnnotation(annotation, { readOnly: true });
    });

  } catch (error) {
    console.error('Noted: Failed to load shared annotations:', error);
  }
}

function showSharedBanner(shareData) {
  const banner = document.createElement('div');
  banner.className = 'noted-shared-banner';

  const label = document.createElement('span');
  label.textContent = 'Viewing shared annotations';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save to My Annotations';
  saveBtn.addEventListener('click', async () => {
    for (const annotation of shareData.annotations) {
      // Assign new IDs to avoid conflicts
      annotation.id = crypto.randomUUID();
      await annotationManager.saveAnnotation(annotation);
    }
    banner.remove();
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.addEventListener('click', () => banner.remove());

  banner.appendChild(label);
  banner.appendChild(saveBtn);
  banner.appendChild(dismissBtn);
  document.body.insertBefore(banner, document.body.firstChild);
}
```

---

### Phase 7 Limitations and Future Improvements

- **Same-machine only (MVP):** `chrome.storage.local` is not shared across browsers/machines. Cross-machine sharing requires cloud storage (Phase 8+).
- **Alternative for cross-machine (future):** Use a lightweight relay service or encode only text annotations (small payload) in the URL. Drawing annotations with SVG paths are too large for URL encoding.
- **Share link cleanup:** Add a periodic cleanup job (on extension startup) to delete expired share data from storage.

---

### Phase 7 Testing Requirements

**Manual Testing:**
- [ ] Generate share link → copied to clipboard → URL has `#noted-share:` prefix
- [ ] Open share link in same browser → shared annotations appear with banner
- [ ] Click "Save to My Annotations" → annotations saved with new IDs
- [ ] Click "Dismiss" → banner removed, shared annotations cleared
- [ ] Open share link after 90 days → gracefully handles expiration
- [ ] Open URL with normal hash (e.g., `#section-2`) → no false positive detection
- [ ] Verify share data doesn't include thumbnails (storage efficiency)

---

## Summary of File Changes

### New Files to Create
- `content/export-engine.js` (Phase 6)
- `tests/anchor-engine.test.html` (Phase 5)
- `tests/export-engine.test.html` (Phase 6)

### Files to Modify
- `content/anchor-engine.js` (Phase 5: add confidence scoring, correction calibration, warning system)
- `content/annotation-manager.js` (Phase 5: thumbnail capture via messaging)
- `background/service-worker.js` (Phases 5-6: add screenshot/thumbnail message handlers)
- `content/content-script.js` (Phases 6-7: export handler, share link receiver)
- `popup/dashboard.js` (Phases 6-7: export and share buttons)
- `manifest.json` (Phase 6: add export-engine.js to content scripts)
- `content/styles.css` (Phase 5: warning banner styles; Phase 7: shared banner styles)

---

## Phase Completion Checklist

### Phase 5 Complete When:
- [ ] Confidence-scored anchor resolution working (`resolveWithConfidence`)
- [ ] Richer text-context matching implemented
- [ ] Correction calibration recording and offset learning working
- [ ] Thumbnail capture via background messaging functional
- [ ] Warning banner shows on page changes (with addEventListener, no inline handlers)
- [ ] Old-format anchors still resolve correctly (backward compatibility)
- [ ] Storage quota strategy enforced (< 8MB check, 200 thumbnail cap)
- [ ] All anchor tests passing
- [ ] Manual testing on 5 test sites successful

### Phase 6 Complete When:
- [ ] SVG export generates with native SVG elements (rect/text, not foreignObject)
- [ ] Screenshot captured via background service worker messaging
- [ ] Figma can open and edit exported files (text editable, drawings editable)
- [ ] Background layer locked, annotations layer editable
- [ ] Export tests passing
- [ ] Manual export workflow verified (scrolled and unscrolled pages)

### Phase 7 Complete When:
- [ ] Share link generation stores data in chrome.storage.local with short ID
- [ ] Share URLs use `#noted-share:` prefix (no false positives)
- [ ] Share link receiver loads annotations read-only with banner
- [ ] "Save to My Annotations" assigns new IDs and persists
- [ ] Expiration check works, expired data cleaned up
- [ ] No thumbnails included in share data
- [ ] Manual sharing workflow verified

---

## After Completing Phases 5-7

**Update `project_spec_1_foundation.md`** with:

```markdown
### Completed (Phases 5-7)
- **Phase 5:** Enhanced anchoring with confidence scoring and correction calibration
  - Confidence-ranked strategy resolution (XPath, CSS selector, text context, position)
  - Automatic offset calibration from user corrections (3+ corrections to learn)
  - Screenshot thumbnail fallback with warning system
  - Backward compatible with pre-Phase 5 anchors

- **Phase 6:** SVG Export
  - Layered SVG with locked screenshot background
  - Native SVG elements (rect/text/path) for Figma compatibility
  - Viewport-scoped export with scroll offset handling

- **Phase 7:** Basic Sharing (Same-Machine MVP)
  - Extension-to-extension sharing via storage-based short IDs
  - Share URLs with #noted-share: prefix
  - 90-day expiration with automatic cleanup
  - Save shared annotations to local collection with new IDs
```

Then load `project_spec_3_phases8-12.md` for next phases.
