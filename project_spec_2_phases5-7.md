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

### Solution: Multi-Strategy Anchoring with Machine Learning

Generate 5 anchor strategies with confidence scores. Try each in order until one succeeds. Learn from user corrections over time.

---

### Multi-Strategy Anchor Generation

When creating an annotation, generate **5 anchor strategies**:

```javascript
{
  anchors: [
    // Strategy 1: Element ID (most reliable if stable)
    {
      type: "element_id",
      value: "#buy-button",
      confidence: 0.95,
      metadata: {
        tagName: "BUTTON",
        className: "cta-primary"
      }
    },
    
    // Strategy 2: Text content + context (survives layout changes)
    {
      type: "text_content",
      targetText: "Buy Now",
      contextBefore: "Only 3 left in stock",
      contextAfter: "Free shipping",
      confidence: 0.85,
      metadata: {
        textLength: 7,
        nearbyTextLength: 50
      }
    },
    
    // Strategy 3: XPath (good for static pages)
    {
      type: "xpath",
      value: "/html/body/div[2]/article[1]/button",
      confidence: 0.70,
      metadata: {
        depth: 4,
        indexed: true
      }
    },
    
    // Strategy 4: CSS Selector (flexible fallback)
    {
      type: "css_selector",
      value: "article.product > button.cta",
      confidence: 0.65,
      metadata: {
        specificity: [0, 2, 1]
      }
    },
    
    // Strategy 5: Position + DOM structure (last resort)
    {
      type: "position",
      x: 500,
      y: 300,
      scrollX: 0,
      scrollY: 1200,
      nearbyElements: ["button", "div.price", "img.product"],
      confidence: 0.40,
      metadata: {
        viewportWidth: 1920,
        viewportHeight: 1080
      }
    }
  ],
  
  // Track which anchor worked last time
  lastUsedAnchor: "element_id",
  
  // Page fingerprint for change detection
  pageFingerprint: {
    domHash: 123456789,      // Structure hash
    textHash: 987654321,     // Content hash
    timestamp: 1696704000000
  },
  
  // Machine learning from corrections
  learnedOffset: { x: 0, y: 0 },
  corrections: []  // Array of user corrections
}
```

---

### Anchor Resolution Algorithm

**File:** `content/anchor-engine.js` (NEW)

```javascript
class AnchorEngine {
  async resolveAnchor(annotation) {
    // Sort strategies by confidence (highest first)
    const strategies = [...annotation.anchors].sort((a, b) => 
      b.confidence - a.confidence
    );
    
    // Try each strategy until one succeeds
    for (const strategy of strategies) {
      const result = await this.tryStrategy(strategy);
      
      if (result.element) {
        // Success! Apply learned corrections
        const position = this.applyLearning(
          result.element,
          annotation.learnedOffset,
          annotation.corrections
        );
        
        // Boost confidence for successful strategy
        strategy.confidence = Math.min(strategy.confidence + 0.05, 1.0);
        
        // Update last used anchor
        annotation.lastUsedAnchor = strategy.type;
        
        return {
          element: result.element,
          position: position,
          strategy: strategy.type,
          confidence: strategy.confidence,
          success: true
        };
      }
    }
    
    // All strategies failed - use fallback
    return this.useFallback(annotation);
  }
  
  async tryStrategy(strategy) {
    switch (strategy.type) {
      case "element_id":
        return this.resolveById(strategy.value);
        
      case "text_content":
        return this.resolveByText(
          strategy.targetText,
          strategy.contextBefore,
          strategy.contextAfter
        );
        
      case "xpath":
        return this.resolveByXPath(strategy.value);
        
      case "css_selector":
        return this.resolveBySelector(strategy.value);
        
      case "position":
        return this.resolveByPosition(strategy);
        
      default:
        return { element: null };
    }
  }
  
  resolveById(id) {
    const element = document.querySelector(id);
    return { element };
  }
  
  resolveByText(targetText, contextBefore, contextAfter) {
    // Find all text nodes
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
    
    // Search for target text with context matching
    for (let i = 0; i < textNodes.length; i++) {
      const text = textNodes[i].textContent;
      
      if (text.includes(targetText)) {
        // Check context before/after
        const prevText = textNodes[i - 1]?.textContent || "";
        const nextText = textNodes[i + 1]?.textContent || "";
        
        if (
          prevText.includes(contextBefore) &&
          nextText.includes(contextAfter)
        ) {
          return { element: textNodes[i].parentElement };
        }
      }
    }
    
    return { element: null };
  }
  
  resolveByXPath(xpath) {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return { element: result.singleNodeValue };
    } catch (e) {
      return { element: null };
    }
  }
  
  resolveBySelector(selector) {
    try {
      const element = document.querySelector(selector);
      return { element };
    } catch (e) {
      return { element: null };
    }
  }
  
  resolveByPosition(strategy) {
    // Find element at approximate position
    const element = document.elementFromPoint(
      strategy.x,
      strategy.y - window.scrollY
    );
    
    // Verify nearby elements match (70% similarity threshold)
    if (element) {
      const siblings = this.getNearbyElements(element);
      const match = this.compareElementLists(
        siblings,
        strategy.nearbyElements
      );
      
      if (match > 0.7) {
        return { element };
      }
    }
    
    return { element: null };
  }
  
  getNearbyElements(element) {
    const nearby = [];
    let current = element.previousElementSibling;
    while (current && nearby.length < 3) {
      nearby.push(current.tagName.toLowerCase());
      current = current.previousElementSibling;
    }
    
    current = element.nextElementSibling;
    while (current && nearby.length < 6) {
      nearby.push(current.tagName.toLowerCase());
      current = current.nextElementSibling;
    }
    
    return nearby;
  }
  
  compareElementLists(list1, list2) {
    const matches = list1.filter(el => list2.includes(el)).length;
    return matches / Math.max(list1.length, list2.length);
  }
  
  applyLearning(element, learnedOffset, corrections) {
    // Get element position
    const rect = element.getBoundingClientRect();
    let position = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY
    };
    
    // Apply learned offset if available
    if (learnedOffset && learnedOffset.x !== 0) {
      position.x += learnedOffset.x;
      position.y += learnedOffset.y;
    }
    
    return position;
  }
  
  useFallback(annotation) {
    // Show warning to user
    this.showAnchorWarning(annotation);
    
    // Use stored position as best guess
    return {
      element: null,
      position: annotation.position,
      strategy: "fallback",
      confidence: 0.10,
      success: false,
      requiresUserReview: true
    };
  }
  
  showAnchorWarning(annotation) {
    // Only show once per session per URL
    const key = `warning-shown-${annotation.url}`;
    if (sessionStorage.getItem(key)) return;
    
    sessionStorage.setItem(key, 'true');
    
    // Create warning banner
    const banner = document.createElement('div');
    banner.className = 'noted-anchor-warning';
    banner.innerHTML = `
      <div class="warning-content">
        <span class="warning-icon">⚠️</span>
        <span>This page changed. Annotation may be misaligned.</span>
        <div class="warning-actions">
          <button onclick="notedShowThumbnail('${annotation.id}')">
            View Original
          </button>
          <button onclick="notedRepositionMode('${annotation.id}')">
            Reposition
          </button>
          <button onclick="notedDismissWarning()">
            Dismiss
          </button>
        </div>
      </div>
    `;
    
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => banner.remove(), 10000);
  }
}
```

---

### Machine Learning from User Corrections

**File:** `content/anchor-learning.js` (NEW)

```javascript
class AnchorLearning {
  recordCorrection(annotation, oldPosition, newPosition) {
    const correction = {
      timestamp: Date.now(),
      oldPosition,
      newPosition,
      delta: {
        x: newPosition.x - oldPosition.x,
        y: newPosition.y - oldPosition.y
      },
      pageFingerprint: this.generatePageFingerprint(),
      anchorUsed: annotation.lastUsedAnchor
    };
    
    // Add to annotation's correction history
    annotation.corrections.push(correction);
    
    // Keep only last 100 corrections per domain
    const domain = new URL(annotation.url).hostname;
    this.pruneCorrections(annotation, domain, 100);
    
    // Analyze patterns after 5+ corrections
    if (annotation.corrections.length >= 5) {
      this.analyzeAndAdjust(annotation);
    }
    
    // Save to storage
    annotationManager.saveAnnotation(annotation);
    
    // Show subtle feedback
    this.showLearningFeedback();
  }
  
  analyzeAndAdjust(annotation) {
    // Calculate average correction delta
    const deltas = annotation.corrections.map(c => c.delta);
    const avgDelta = {
      x: this.average(deltas.map(d => d.x)),
      y: this.average(deltas.map(d => d.y))
    };
    
    // Calculate standard deviation
    const stdDev = {
      x: this.standardDeviation(deltas.map(d => d.x)),
      y: this.standardDeviation(deltas.map(d => d.y))
    };
    
    // If consistent pattern (low variance), apply as permanent offset
    if (stdDev.x < 20 && stdDev.y < 20) {
      annotation.learnedOffset = avgDelta;
      
      console.log(`[Noted] Learned anchor offset: (${avgDelta.x}, ${avgDelta.y})`);
    }
  }
  
  average(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
  
  standardDeviation(numbers) {
    const avg = this.average(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }
  
  generatePageFingerprint() {
    const mainContent = document.querySelector('main, article, #content, .content') 
      || document.body;
    
    return {
      domHash: this.hashDOMStructure(mainContent),
      textHash: this.hashTextContent(mainContent),
      timestamp: Date.now()
    };
  }
  
  hashDOMStructure(element) {
    // Sample first 100 elements for performance
    const structure = Array.from(element.querySelectorAll('*'))
      .slice(0, 100)
      .map(el => el.tagName)
      .join(',');
    
    return this.simpleHash(structure);
  }
  
  hashTextContent(element) {
    // Hash first 1000 chars
    const text = element.innerText.slice(0, 1000);
    return this.simpleHash(text);
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;  // Convert to 32-bit integer
    }
    return hash;
  }
  
  pruneCorrections(annotation, domain, maxCorrections) {
    if (annotation.corrections.length > maxCorrections) {
      // Keep most recent corrections
      annotation.corrections = annotation.corrections.slice(-maxCorrections);
    }
  }
  
  showLearningFeedback() {
    // Subtle toast notification
    const toast = document.createElement('div');
    toast.className = 'noted-learning-toast';
    toast.innerHTML = '✓ Remembered anchor correction';
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 2147483647;
      animation: fadeInOut 2s ease-in-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 2000);
  }
}
```

---

### Screenshot Thumbnail Fallback

**Update:** `content/annotation-manager.js`

```javascript
class AnnotationManager {
  async createAnnotation(type, data) {
    // Generate anchors
    const anchors = await anchorEngine.generateAnchors(data.position);
    
    // Capture thumbnail
    const thumbnail = await this.captureThumbnail(data.position);
    
    // Generate page fingerprint
    const fingerprint = anchorLearning.generatePageFingerprint();
    
    const annotation = {
      id: this.generateId(),
      type,
      url: this.normalizeURL(window.location.href),
      position: data.position,
      content: data.content,
      anchors,
      pageFingerprint: fingerprint,
      thumbnail,
      corrections: [],
      learnedOffset: { x: 0, y: 0 },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.annotations.push(annotation);
    await this.saveAnnotations();
    
    return annotation;
  }
  
  async captureThumbnail(position) {
    try {
      // Calculate viewport region (300×200 around annotation)
      const rect = {
        x: Math.max(0, position.x - 50),
        y: Math.max(0, position.y - 50),
        width: 300,
        height: 200
      };
      
      // Capture visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'jpeg',
        quality: 60  // Compress for storage
      });
      
      // Crop to annotation area
      const croppedImage = await this.cropImage(dataUrl, rect);
      
      return croppedImage;
      
    } catch (error) {
      console.error('[Noted] Thumbnail capture failed:', error);
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
        
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = dataUrl;
    });
  }
}

// Global functions for warning banner buttons
window.notedShowThumbnail = function(annotationId) {
  const annotation = annotationManager.getAnnotation(annotationId);
  
  if (annotation.thumbnail) {
    // Show thumbnail overlay
    const overlay = document.createElement('div');
    overlay.className = 'noted-thumbnail-overlay';
    overlay.innerHTML = `
      <div class="overlay-content">
        <h3>Original Page State</h3>
        <img src="${annotation.thumbnail}" alt="Original annotation context" />
        <button onclick="this.parentElement.parentElement.remove()">
          Close
        </button>
      </div>
    `;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
    `;
    
    document.body.appendChild(overlay);
  }
};

window.notedRepositionMode = function(annotationId) {
  // Enable drag mode for this annotation
  annotationManager.enableRepositionMode(annotationId);
};

window.notedDismissWarning = function() {
  document.querySelector('.noted-anchor-warning')?.remove();
};
```

---

### Phase 5 Testing Requirements

**Unit Tests** (`tests/anchor-engine.test.html`):
- [ ] Test each anchor strategy individually
- [ ] Test fallback chain when strategies fail
- [ ] Test confidence score adjustments
- [ ] Test learning algorithm with mock corrections
- [ ] Test page fingerprint generation

**Manual Testing:**
- [ ] Create annotation on Wikipedia → refresh 5 times → stays anchored
- [ ] Create annotation on Twitter feed → scroll + refresh → warning appears
- [ ] Manually reposition annotation → learning data saved
- [ ] Navigate away and back → repositioned anchor persists
- [ ] Change page content (DevTools) → warning appears
- [ ] Thumbnail shows in warning modal

**Test Sites:**
- Wikipedia (static)
- Twitter feed (dynamic)
- Reddit post (semi-static)
- Amazon product page (complex)
- Gmail (SPA)

---

## Phase 6: SVG Export

### Goal

Export annotations to SVG format with:
- Screenshot as locked background layer
- Annotations as editable vector foreground
- Single layered file ready for Figma

---

### Export Engine

**File:** `content/export-engine.js` (NEW)

```javascript
class ExportEngine {
  async exportToSVG(annotations, options = {}) {
    // Capture full page screenshot
    const screenshot = await this.captureFullPage();
    
    // Calculate bounding box for all annotations
    const bbox = this.calculateBoundingBox(annotations);
    
    // Create SVG container
    const svg = this.createSVGContainer(bbox);
    
    // Add screenshot as background layer
    this.addBackgroundImage(svg, screenshot, bbox);
    
    // Add annotation layers
    const annotationGroup = this.createAnnotationGroup();
    
    annotations.forEach(annotation => {
      if (annotation.type === 'text') {
        this.addTextAnnotation(annotationGroup, annotation);
      } else if (annotation.type === 'drawing') {
        this.addDrawingAnnotation(annotationGroup, annotation);
      }
    });
    
    svg.appendChild(annotationGroup);
    
    // Return as Blob for download
    if (options.format === 'blob') {
      return this.svgToBlob(svg);
    }
    
    return new XMLSerializer().serializeToString(svg);
  }
  
  createSVGContainer(bbox) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', bbox.width);
    svg.setAttribute('height', bbox.height);
    svg.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Add metadata
    const metadata = document.createElementNS('http://www.w3.org/2000/svg', 'metadata');
    metadata.textContent = JSON.stringify({
      generator: 'Noted Chrome Extension',
      url: window.location.href,
      exported: new Date().toISOString()
    });
    svg.appendChild(metadata);
    
    return svg;
  }
  
  addBackgroundImage(svg, screenshot, bbox) {
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', screenshot);
    image.setAttribute('x', '0');
    image.setAttribute('y', '0');
    image.setAttribute('width', bbox.width);
    image.setAttribute('height', bbox.height);
    image.setAttribute('id', 'background-screenshot');
    
    // Lock layer (non-editable hint for SVG editors)
    image.setAttribute('class', 'locked-layer');
    
    svg.appendChild(image);
  }
  
  createAnnotationGroup() {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('id', 'annotations-layer');
    group.setAttribute('class', 'editable-layer');
    return group;
  }
  
  addTextAnnotation(group, annotation) {
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', annotation.position.x);
    foreignObject.setAttribute('y', annotation.position.y);
    foreignObject.setAttribute('width', annotation.position.width);
    foreignObject.setAttribute('height', annotation.position.height);
    
    // Embed HTML content
    const div = document.createElement('div');
    div.style.cssText = `
      background: ${annotation.content.backgroundColor};
      padding: 12px;
      border-radius: 8px;
      font-family: system-ui;
      font-size: 14px;
    `;
    div.innerHTML = annotation.content.text;
    
    foreignObject.appendChild(div);
    group.appendChild(foreignObject);
  }
  
  addDrawingAnnotation(group, annotation) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', annotation.content.svgPath);
    path.setAttribute('stroke', annotation.content.strokeColor);
    path.setAttribute('stroke-width', annotation.content.strokeWidth);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    
    group.appendChild(path);
  }
  
  calculateBoundingBox(annotations) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    annotations.forEach(ann => {
      minX = Math.min(minX, ann.position.x);
      minY = Math.min(minY, ann.position.y);
      
      if (ann.type === 'text') {
        maxX = Math.max(maxX, ann.position.x + ann.position.width);
        maxY = Math.max(maxY, ann.position.y + ann.position.height);
      } else {
        // For drawings, calculate from points
        const xs = ann.content.points.map(p => p.x);
        const ys = ann.content.points.map(p => p.y);
        maxX = Math.max(maxX, ...xs);
        maxY = Math.max(maxY, ...ys);
      }
    });
    
    // Add padding
    const padding = 50;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }
  
  async captureFullPage() {
    // For MVP: capture visible viewport only
    // Future: stitch multiple screenshots for full page
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png'
    });
    
    return dataUrl;
  }
  
  svgToBlob(svg) {
    const svgString = new XMLSerializer().serializeToString(svg);
    return new Blob([svgString], { type: 'image/svg+xml' });
  }
}

export default new ExportEngine();
```

---

### Export UI

**Update:** `popup/dashboard.js`

```javascript
async function handleExportSVG() {
  const selectedIds = getSelectedAnnotationIds();
  
  if (selectedIds.length === 0) {
    showError("Select annotations to export");
    return;
  }
  
  showLoadingSpinner("Generating SVG export...");
  
  try {
    const annotations = await getAnnotationsByIds(selectedIds);
    const svgBlob = await exportEngine.exportToSVG(annotations, {
      format: 'blob'
    });
    
    // Trigger download
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noted-annotations-${Date.now()}.svg`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    showSuccess("SVG exported successfully!");
    
  } catch (error) {
    showError("Export failed: " + error.message);
  }
}
```

---

### Phase 6 Testing Requirements

**Unit Tests** (`tests/export-engine.test.html`):
- [ ] Test SVG structure generation
- [ ] Test background layer creation
- [ ] Test text annotation conversion
- [ ] Test drawing annotation conversion
- [ ] Test bounding box calculation

**Manual Testing:**
- [ ] Export single text annotation → opens in Figma → editable
- [ ] Export single drawing → opens in Figma → editable vector
- [ ] Export mixed annotations → layers separate → background locked
- [ ] Export from long page → screenshot captures correctly
- [ ] Exported SVG opens in browser → renders correctly

---

## Phase 7: Basic Sharing (Extension-to-Extension)

### Goal

Share annotations via link. Recipient must have extension installed to view.

### Approach: Local-First Sharing

**No authentication required for MVP.** Share links contain:
- Serialized annotation data
- URL of annotated page
- Expiration timestamp (optional)

---

### Share Link Generation

**Update:** `popup/dashboard.js`

```javascript
async function handleShareAnnotations() {
  const selectedIds = getSelectedAnnotationIds();
  
  if (selectedIds.length === 0) {
    showError("Select at least one annotation to share");
    return;
  }
  
  showLoadingSpinner("Generating share link...");
  
  try {
    const annotations = await getAnnotationsByIds(selectedIds);
    
    // Serialize annotation data
    const shareData = {
      url: window.location.href,
      annotations: annotations,
      created: Date.now(),
      expires: Date.now() + (90 * 24 * 60 * 60 * 1000) // 90 days
    };
    
    // Compress and encode
    const compressed = await compressData(shareData);
    const encoded = btoa(compressed);
    
    // Generate shareable URL
    const shareUrl = `https://noted.app/share#${encoded}`;
    
    // Copy to clipboard
    await navigator.clipboard.writeText(shareUrl);
    
    showShareSuccessModal({
      url: shareUrl,
      expiresAt: shareData.expires
    });
    
  } catch (error) {
    showError("Failed to create share link: " + error.message);
  }
}

async function compressData(data) {
  // Simple compression using JSON stringify
  // Future: Use CompressionStream API for better compression
  return JSON.stringify(data);
}
```

---

### Share Link Receiver

**Update:** `content/content-script.js`

```javascript
// Check if current page is a share link
if (window.location.hash.startsWith('#')) {
  const encoded = window.location.hash.slice(1);
  
  try {
    const compressed = atob(encoded);
    const shareData = JSON.parse(compressed);
    
    // Check expiration
    if (shareData.expires && Date.now() > shareData.expires) {
      showError("This share link has expired");
    } else {
      // Load shared annotations
      loadSharedAnnotations(shareData);
    }
  } catch (error) {
    console.error('[Noted] Invalid share link:', error);
  }
}

function loadSharedAnnotations(shareData) {
  // Show banner
  const banner = document.createElement('div');
  banner.className = 'noted-shared-banner';
  banner.innerHTML = `
    <div class="banner-content">
      <span>📌 Viewing shared annotations</span>
      <button onclick="saveSharedAnnotations()">Save to My Annotations</button>
      <button onclick="dismissSharedBanner()">Dismiss</button>
    </div>
  `;
  document.body.insertBefore(banner, document.body.firstChild);
  
  // Render annotations (read-only)
  shareData.annotations.forEach(annotation => {
    annotationManager.renderAnnotation(annotation, { readOnly: true });
  });
}

window.saveSharedAnnotations = async function() {
  // Save to local storage
  const shareData = getCurrentShareData();
  
  for (const annotation of shareData.annotations) {
    await annotationManager.saveAnnotation(annotation);
  }
  
  showSuccess("Annotations saved to your collection!");
  document.querySelector('.noted-shared-banner').remove();
};

window.dismissSharedBanner = function() {
  document.querySelector('.noted-shared-banner').remove();
};
```

---

### Phase 7 Testing Requirements

**Manual Testing:**
- [ ] Generate share link → copy to clipboard
- [ ] Open link in new tab (with extension) → annotations appear
- [ ] Open link in incognito (with extension) → annotations appear
- [ ] Open link without extension → appropriate message
- [ ] Save shared annotations → added to local collection
- [ ] Share link with expired timestamp → shows error

---

## Summary of File Changes

### New Files to Create
- `content/anchor-engine.js` (Phase 5)
- `content/anchor-learning.js` (Phase 5)
- `content/export-engine.js` (Phase 6)
- `tests/anchor-engine.test.html` (Phase 5)
- `tests/export-engine.test.html` (Phase 6)

### Files to Modify
- `content/annotation-manager.js` (Phase 5: thumbnails)
- `popup/dashboard.js` (Phases 6-7: export and share UI)
- `content/content-script.js` (Phase 7: share link receiver)
- `manifest.json` (Phase 5: add new permissions if needed)

---

## Phase Completion Checklist

### Phase 5 Complete When:
- [ ] Multi-strategy anchoring implemented
- [ ] Learning from corrections works
- [ ] Thumbnail fallback functional
- [ ] Warning banner shows on page changes
- [ ] All anchor tests passing
- [ ] Manual testing on 5 test sites successful

### Phase 6 Complete When:
- [ ] SVG export generates correctly
- [ ] Figma can open and edit exported files
- [ ] Background layer locked, annotations editable
- [ ] Export tests passing
- [ ] Manual export workflow verified

### Phase 7 Complete When:
- [ ] Share link generation works
- [ ] Share link receiver loads annotations
- [ ] Expiration check works
- [ ] Save to collection works
- [ ] Manual sharing workflow verified

---

## After Completing Phases 5-7

**Update `project_spec_1_foundation.md`** with:

```markdown
### ✅ Completed (Phases 5-7)
- **Phase 5:** Robust multi-strategy anchoring with ML learning
  - 5 anchor strategies (element ID, text content, XPath, CSS selector, position)
  - Automatic learning from user corrections (100 corrections per domain)
  - Screenshot thumbnail fallback with warning system
  
- **Phase 6:** SVG Export
  - Layered SVG with locked screenshot background
  - Editable annotation vectors
  - Figma-compatible output
  
- **Phase 7:** Basic Sharing
  - Extension-to-extension sharing via encoded URLs
  - 90-day expiration
  - Save shared annotations to local collection
```

Then load `project_spec_3_phases8-12.md` for next phases.