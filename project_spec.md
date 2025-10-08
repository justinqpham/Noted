# Chrome Annotation Extension - Technical Specification

## Executive Summary

A Chrome extension that allows users to annotate any webpage with persistent text labels and drawings. Annotations anchor intelligently to page content, survive navigation and tab closures (with user preference), and sync across tabs in real-time.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Features](#core-features)
3. [Technical Challenges & Solutions](#technical-challenges--solutions)
4. [Data Models](#data-models)
5. [UI Components](#ui-components)
6. [Implementation Details](#implementation-details)
7. [Storage Strategy](#storage-strategy)
8. [Testing Requirements](#testing-requirements)

---

## Architecture Overview

### Extension Structure

```
annotation-extension/
├── manifest.json
├── background/
│   ├── service-worker.js          # Event handling, storage, tab management
│   └── sync-manager.js             # Real-time cross-tab sync
├── content/
│   ├── content-script.js           # Main injection logic
│   ├── annotation-manager.js       # Annotation lifecycle
│   ├── anchor-engine.js            # DOM anchoring system
│   ├── drawing-engine.js           # Canvas/SVG drawing
│   ├── text-engine.js              # Text annotation
│   ├── content-detector.js         # Change detection
│   └── styles.css                  # Injected styles
├── popup/
│   ├── dashboard.html              # Main dashboard UI
│   ├── dashboard.js                # Dashboard logic
│   └── dashboard.css               # Apple-style design
└── utils/
    ├── hotkey-manager.js           # Keyboard shortcuts
    └── storage-helper.js           # Storage abstraction
```

### Technology Stack

- **Manifest Version**: 3
- **Permissions**: `storage`, `tabs`, `activeTab`, `scripting`
- **Libraries**: 
  - None required (vanilla JS for performance)
  - Optional: Bezier.js for curve smoothing (can be implemented natively)

---

## Core Features

### 1. Annotation Modes

#### Text Note Mode
- **Trigger**: Hotkey (default: `Ctrl+Shift+T`) or Dashboard button
- **Cursor**: Changes to i-beam (`cursor: text`)
- **Behavior**: Click anywhere to place sticky note
- **Features**:
  - Rich text formatting (title, header, sub-header, body, bullets)
  - Background color (default: yellow, remembers last selection)
  - Draggable and resizable
  - Default size: 250px width × auto height (min: 100px × 80px, max: 600px × 800px)

#### Draw Note Mode
- **Trigger**: Hotkey (default: `Ctrl+Shift+D`) or Dashboard button
- **Cursor**: Changes to crosshair with brush icon
- **Color Palette**: 
  - 8 color circles appear near cursor (10 colors total including Black/White)
  - Colors: Red, Orange, Brown, Yellow, Green, Turquoise, Blue, Violet, Pink, Gray, Black, White
  - Hold `Shift` to show palette, release to dismiss
  - Auto-dismiss if cursor moves 200px away without selection
  - Default: Yellow or last used color
- **Features**:
  - Stroke smoothing (Catmull-Rom spline interpolation)
  - Brush size selector: 2px, 4px, 6px, 8px, 12px (default: 4px)
  - Undo/Redo while drawing (Ctrl+Z / Ctrl+Y)
  - Hover to grab/move completed drawings

### 2. Dashboard

#### Window Specs
- **Type**: Extension popup (400px × 600px)
- **Design**: Apple-style modern UI (SF Pro font family fallback to system fonts, subtle shadows, rounded corners, clean spacing)
- **Tabs**: 4 tabs with smooth transitions

#### Tab 1: Current Page (Default)
- **Auto-opens** when extension icon clicked
- **Display**: List view of annotations on current URL
- **Each item shows**:
  - Icon (📝 for text, ✏️ for drawing)
  - Title (first 50 chars for text, "Drawing 1, 2, 3..." for drawings)
  - Date created (MM/DD/YYYY format)
  - Action buttons: Edit (pencil icon), Delete (trash icon), Copy URL (link icon)
- **Search bar**: Real-time filter by title/description/tags
- **Filters**: 
  - Type (Text/Drawing/All)
  - Date range picker
  - Tags (multi-select)
- **Sort**: 
  - Date created (newest/oldest)
  - Alphabetical (A-Z/Z-A)
  - Last modified
- **Empty state**: "No annotations on this page. Start annotating!"

#### Tab 2: All Annotations
- Same layout as Current Page
- **Additional filter**: Domain/URL selector dropdown
- **Grouping**: Group by domain with collapsible sections
- **Clicking annotation**:
  - If URL open in another tab → switch to that tab and scroll to annotation
  - If URL not open → open in new tab and scroll to annotation

#### Tab 3: Collections
- **List view** of collections (folder icon + name + count)
- **Create button**: "+ New Collection" (modal with name input)
- **Each collection**:
  - Click to expand/collapse annotation list
  - Edit name (inline edit on double-click)
  - Delete (trash icon with confirmation)
- **Drag-and-drop**: Drag annotations between collections
- **Empty state**: "No collections yet. Organize your annotations!"

#### Tab 4: Settings
- **Toggle options**:
  - ☑️ "Keep annotations when closing tab (don't ask again)"
  - ☐ "Clear annotations when closing tab (don't ask again)"
  - Default: Neither checked (shows confirmation dialog)
- **Hotkey customization**: 
  - Text Mode: [Input field] (default: Ctrl+Shift+T)
  - Draw Mode: [Input field] (default: Ctrl+Shift+D)
- **Storage info**: "Using X MB of 10 MB"
- **Danger zone**: 
  - "Clear all annotations" (red button with confirmation)
  - "Export annotations as JSON" (download button)
  - "Import annotations" (upload button)

### 3. Edit Modal

Appears when clicking Edit icon on any annotation.

**Layout** (from screenshots):
```
┌─────────────────────────────────────┐
│ [B] [≡] Title input field           │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │  Description text area          │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Add tags (max 5), separated by     │
│ commas                              │
│ [tag1, tag2...]                     │
│                                     │
│ Collection: [Dropdown ▼]            │
│             [+ New Collection]      │
│                                     │
│ [    Save    ]  [  Cancel  ]       │
└─────────────────────────────────────┘
```

**Fields**:
- **Title**: First 50 chars (text annotations) or "Drawing X" (editable)
- **Description**: Full text content or notes about drawing
- **Tags**: Up to 5 tags, comma-separated, used for filtering
- **Collection**: Dropdown of existing collections + create new option
- **Formatting toolbar**: Bold (B), Align (≡) for text annotations only

---

## Technical Challenges & Solutions

### Challenge 1: DOM Anchoring on Dynamic Pages

**Problem**: Annotations must stay pinned to content even when DOM changes (SPAs, infinite scroll, dynamic loading).

**Solution**: Multi-layer anchoring system with fallback chain.

#### Primary: XPath + CSS Selector Hybrid

1. **On annotation creation**, store:
   ```javascript
   {
     anchorStrategy: "hybrid",
     xpath: "/html/body/div[2]/article[1]/p[3]",
     cssSelector: "article.post > p:nth-of-type(3)",
     textContent: "First 50 chars of nearest text node...",
     offsetX: 150,  // pixels from anchor element
     offsetY: 200,
     viewportWidth: 1920,  // for proportional scaling
     viewportHeight: 1080
   }
   ```

2. **On page load**, attempt anchoring in order:
   - Try XPath → if element exists, use it
   - Fall back to CSS selector → if element exists, use it
   - Fall back to text content matching → find element with matching text
   - Fall back to approximate position → show warning

3. **Mutation Observer**: Watch for DOM changes
   ```javascript
   const observer = new MutationObserver((mutations) => {
     // Re-anchor annotations if their anchor elements are affected
     mutations.forEach(mutation => {
       if (mutation.type === 'childList' || mutation.type === 'attributes') {
         reanchorAffectedAnnotations(mutation.target);
       }
     });
   });
   observer.observe(document.body, {
     childList: true,
     subtree: true,
     attributes: true,
     attributeFilter: ['class', 'id']
   });
   ```

#### Proportional Scaling Algorithm

When viewport size changes:
```javascript
function scaleAnnotation(annotation, newWidth, newHeight) {
  const scaleX = newWidth / annotation.viewportWidth;
  const scaleY = newHeight / annotation.viewportHeight;
  
  return {
    x: annotation.offsetX * scaleX,
    y: annotation.offsetY * scaleY,
    width: annotation.width * scaleX,
    height: annotation.height * scaleY
  };
}
```

---

### Challenge 2: Content Change Detection

**Problem**: Detect when page content has changed since annotation was created (warns user that anchoring may be broken).

**Solution**: Lightweight DOM fingerprinting.

#### Implementation

1. **On annotation creation**, generate fingerprint:
   ```javascript
   function generatePageFingerprint() {
     const mainContent = document.querySelector('main, article, #content, .content') || document.body;
     
     return {
       domHash: hashDOMStructure(mainContent),
       textHash: hashTextContent(mainContent),
       timestamp: Date.now()
     };
   }
   
   function hashDOMStructure(element) {
     // Create structure signature (tag names + depth)
     const structure = Array.from(element.querySelectorAll('*'))
       .slice(0, 100)  // Sample first 100 elements for performance
       .map(el => el.tagName)
       .join(',');
     return simpleHash(structure);
   }
   
   function hashTextContent(element) {
     // Hash first 1000 chars of text
     const text = element.innerText.slice(0, 1000);
     return simpleHash(text);
   }
   
   function simpleHash(str) {
     let hash = 0;
     for (let i = 0; i < str.length; i++) {
       const char = str.charCodeAt(i);
       hash = ((hash << 5) - hash) + char;
       hash = hash & hash;  // Convert to 32bit integer
     }
     return hash;
   }
   ```

2. **On page revisit**, compare fingerprints:
   ```javascript
   const currentFingerprint = generatePageFingerprint();
   const storedFingerprint = annotation.pageFingerprint;
   
   if (currentFingerprint.domHash !== storedFingerprint.domHash ||
       currentFingerprint.textHash !== storedFingerprint.textHash) {
     showContentChangedWarning(annotation);
   }
   ```

3. **Warning UI**: 
   - Yellow banner at top: "⚠️ This page's content has changed. Some annotations may be misaligned. [Reanchor] [Dismiss]"
   - Reanchor button attempts to find best match using text content

---

### Challenge 3: Infinite Scroll Detection

**Problem**: Infinite scroll sites cause annotations to break when content loads/unloads dynamically.

**Solution**: Detect infinite scroll patterns + maintain known domain list.

#### Detection Logic

```javascript
const INFINITE_SCROLL_DOMAINS = [
  'twitter.com', 'x.com',
  'reddit.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'pinterest.com',
  'tumblr.com',
  'medium.com'
];

function isInfiniteScrollPage() {
  const domain = window.location.hostname.replace('www.', '');
  
  // Check known domains
  if (INFINITE_SCROLL_DOMAINS.some(d => domain.includes(d))) {
    // Exclude specific non-scrolling pages
    const url = window.location.pathname;
    if (url.match(/\/(status|post|article|p)\/[\w-]+$/)) {
      return false;  // Individual post/article pages typically don't infinite scroll
    }
    return true;
  }
  
  // Heuristic detection
  const hasInfiniteScrollLib = !!document.querySelector('[data-infinite-scroll], .infinite-scroll');
  const isVeryTall = document.documentElement.scrollHeight > window.innerHeight * 3;
  const hasPagination = !!document.querySelector('[class*="pagination"], [id*="pagination"]');
  
  return hasInfiniteScrollLib || (isVeryTall && !hasPagination);
}
```

#### Warning Display

```javascript
if (isInfiniteScrollPage()) {
  showModal({
    title: '⚠️ Infinite Scroll Detected',
    message: 'This page uses infinite scrolling. Annotations may become misaligned when new content loads or old content unloads.',
    buttons: [
      { text: 'Annotate Anyway', action: 'proceed' },
      { text: 'Cancel', action: 'cancel' }
    ]
  });
}
```

---

### Challenge 4: Drawing Smoothing & Performance

**Problem**: Raw mouse input creates jagged lines. Need smooth curves without lag.

**Solution**: Catmull-Rom spline interpolation with throttled rendering.

#### Implementation

```javascript
class DrawingEngine {
  constructor() {
    this.points = [];
    this.isDrawing = false;
    this.strokeColor = '#FFEB3B';  // Default yellow
    this.strokeWidth = 4;
    this.canvas = null;
    this.ctx = null;
  }
  
  startDrawing(x, y) {
    this.isDrawing = true;
    this.points = [{ x, y, timestamp: Date.now() }];
  }
  
  addPoint(x, y) {
    if (!this.isDrawing) return;
    
    this.points.push({ x, y, timestamp: Date.now() });
    
    // Throttle: only redraw every 16ms (60fps)
    if (!this.drawPending) {
      this.drawPending = true;
      requestAnimationFrame(() => {
        this.drawSmoothedPath();
        this.drawPending = false;
      });
    }
  }
  
  drawSmoothedPath() {
    if (this.points.length < 2) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Catmull-Rom spline
    this.ctx.beginPath();
    this.ctx.moveTo(this.points[0].x, this.points[0].y);
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = this.points[Math.max(i - 1, 0)];
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const p3 = this.points[Math.min(i + 2, this.points.length - 1)];
      
      // Draw smooth curve through p1 to p2 using p0 and p3 as control points
      const segments = 10;
      for (let t = 0; t <= segments; t++) {
        const u = t / segments;
        const point = this.catmullRom(p0, p1, p2, p3, u);
        this.ctx.lineTo(point.x, point.y);
      }
    }
    
    this.ctx.stroke();
  }
  
  catmullRom(p0, p1, p2, p3, t) {
    // Catmull-Rom interpolation formula
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    
    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    
    return { x, y };
  }
  
  finishDrawing() {
    this.isDrawing = false;
    
    // Convert to SVG path for storage
    const svgPath = this.convertToSVG();
    return svgPath;
  }
  
  convertToSVG() {
    if (this.points.length < 2) return '';
    
    let path = `M ${this.points[0].x} ${this.points[0].y}`;
    
    for (let i = 0; i < this.points.length - 1; i++) {
      const p0 = this.points[Math.max(i - 1, 0)];
      const p1 = this.points[i];
      const p2 = this.points[i + 1];
      const p3 = this.points[Math.min(i + 2, this.points.length - 1)];
      
      // Create cubic bezier curve
      const cp1 = {
        x: p1.x + (p2.x - p0.x) / 6,
        y: p1.y + (p2.y - p0.y) / 6
      };
      const cp2 = {
        x: p2.x - (p3.x - p1.x) / 6,
        y: p2.y - (p3.y - p1.y) / 6
      };
      
      path += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`;
    }
    
    return path;
  }
}
```

---

### Challenge 5: Real-Time Cross-Tab Sync

**Problem**: User has same URL open in multiple tabs. Annotation in Tab A should appear instantly in Tab B.

**Solution**: Chrome storage events + broadcast channel.

#### Implementation

```javascript
// In background/sync-manager.js
class SyncManager {
  constructor() {
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.annotations) {
        this.broadcastAnnotationUpdate(changes.annotations.newValue);
      }
    });
  }
  
  broadcastAnnotationUpdate(annotations) {
    // Notify all tabs with matching URL
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (this.hasAnnotationsForURL(tab.url, annotations)) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'ANNOTATIONS_UPDATED',
            url: tab.url,
            annotations: this.getAnnotationsForURL(tab.url, annotations)
          });
        }
      });
    });
  }
}

// In content/content-script.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANNOTATIONS_UPDATED') {
    // Refresh annotations on page
    annotationManager.loadAnnotations(message.annotations);
  }
});
```

---

### Challenge 6: Z-Index Wars

**Problem**: Some sites use z-index values in the millions. Annotations must always be on top.

**Solution**: Create isolated stacking context with maximum z-index.

```javascript
function createAnnotationContainer() {
  const container = document.createElement('div');
  container.id = 'annotation-extension-root';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;  /* Max 32-bit integer */
    isolation: isolate;  /* Create stacking context */
  `;
  
  // Allow clicks through to page content
  container.style.pointerEvents = 'none';
  
  // But enable clicks on annotations themselves
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('annotation')) {
      e.stopPropagation();
    }
  });
  
  document.documentElement.appendChild(container);
  return container;
}
```

---

## Data Models

### Annotation Object

```javascript
{
  id: 'uuid-v4',
  type: 'text' | 'drawing',
  url: 'https://example.com/page',
  
  // Anchoring data
  anchor: {
    strategy: 'hybrid',
    xpath: '/html/body/div[2]/article[1]',
    cssSelector: 'article.post:nth-of-type(1)',
    textContent: 'First 50 chars...',
    offsetX: 150,
    offsetY: 200,
    viewportWidth: 1920,
    viewportHeight: 1080
  },
  
  // Position data (current/computed)
  position: {
    x: 500,
    y: 300,
    width: 250,  // text only
    height: 150  // text only
  },
  
  // Content data
  content: {
    // For text annotations
    title: 'First 50 chars of text',
    text: 'Full annotation text...',
    backgroundColor: '#FFEB3B',
    formatting: {
      bold: [0, 10],  // character ranges
      header: true,
      bullets: false
    },
    
    // For drawing annotations
    svgPath: 'M 100 100 C 120 80...',
    strokeColor: '#FFEB3B',
    strokeWidth: 4,
    points: [{x: 100, y: 100}, ...]  // for undo/redo
  },
  
  // Metadata
  description: 'Optional notes about this annotation',
  tags: ['important', 'todo'],
  collections: ['project-alpha'],
  createdAt: 1696704000000,
  modifiedAt: 1696704000000,
  
  // Page fingerprint
  pageFingerprint: {
    domHash: 123456789,
    textHash: 987654321,
    timestamp: 1696704000000
  }
}
```

### Collection Object

```javascript
{
  id: 'uuid-v4',
  name: 'Project Alpha',
  annotationIds: ['uuid-1', 'uuid-2', 'uuid-3'],
  createdAt: 1696704000000,
  color: '#FF5722'  // optional UI color
}
```

### Settings Object

```javascript
{
  closeTabBehavior: 'ask' | 'keep' | 'clear',  // default: 'ask'
  hotkeys: {
    textMode: 'Ctrl+Shift+T',
    drawMode: 'Ctrl+Shift+D'
  },
  defaultTextColor: '#FFEB3B',
  defaultStrokeColor: '#FFEB3B',
  defaultStrokeWidth: 4
}
```

---

## UI Components

### Color Palette Component

```javascript
class ColorPalette {
  constructor(position) {
    this.colors = [
      { name: 'Red', hex: '#F44336' },
      { name: 'Orange', hex: '#FF9800' },
      { name: 'Brown', hex: '#795548' },
      { name: 'Yellow', hex: '#FFEB3B' },
      { name: 'Green', hex: '#4CAF50' },
      { name: 'Turquoise', hex: '#00BCD4' },
      { name: 'Blue', hex: '#2196F3' },
      { name: 'Violet', hex: '#9C27B0' },
      { name: 'Pink', hex: '#E91E63' },
      { name: 'Gray', hex: '#9E9E9E' },
      { name: 'Black', hex: '#000000' },
      { name: 'White', hex: '#FFFFFF' }
    ];
    this.position = position;
    this.element = null;
  }
  
  render() {
    const palette = document.createElement('div');
    palette.className = 'color-palette';
    palette.style.cssText = `
      position: fixed;
      left: ${this.position.x + 20}px;
      top: ${this.position.y}px;
      display: flex;
      gap: 8px;
      background: rgba(255, 255, 255, 0.95);
      padding: 8px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      pointer-events: auto;
      z-index: 2147483646;
    `;
    
    this.colors.forEach(color => {
      const circle = document.createElement('div');
      circle.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${color.hex};
        border: 2px solid ${color.hex === '#FFFFFF' ? '#E0E0E0' : color.hex};
        cursor: pointer;
        transition: transform 0.2s;
      `;
      circle.addEventListener('mouseenter', () => {
        circle.style.transform = 'scale(1.2)';
      });
      circle.addEventListener('mouseleave', () => {
        circle.style.transform = 'scale(1)';
      });
      circle.addEventListener('click', () => {
        this.onColorSelect(color.hex);
      });
      palette.appendChild(circle);
    });
    
    // X button
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      color: #666;
    `;
    closeBtn.addEventListener('click', () => this.dismiss());
    palette.appendChild(closeBtn);
    
    this.element = palette;
    return palette;
  }
  
  onColorSelect(color) {
    // Override in parent
  }
  
  dismiss() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
```

### Text Annotation Component

```javascript
class TextAnnotation {
  constructor(annotation) {
    this.annotation = annotation;
    this.element = null;
    this.isDragging = false;
    this.isResizing = false;
  }
  
  render() {
    const container = document.createElement('div');
    container.className = 'text-annotation';
    container.dataset.annotationId = this.annotation.id;
    container.style.cssText = `
      position: absolute;
      left: ${this.annotation.position.x}px;
      top: ${this.annotation.position.y}px;
      width: ${this.annotation.position.width}px;
      min-height: ${this.annotation.position.height}px;
      background: ${this.annotation.content.backgroundColor};
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      cursor: move;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      z-index: 1000;
    `;
    
    // Content
    const content = document.createElement('div');
    content.className = 'annotation-content';
    content.innerHTML = this.annotation.content.text;
    content.contentEditable = true;
    content.style.cssText = `
      outline: none;
      min-height: 50px;
    `;
    
    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.style.cssText = `
      position: absolute;
      right: 0;
      bottom: 0;
      width: 12px;
      height: 12px;
      cursor: se-resize;
      background: linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.3) 50%);
    `;
    
    container.appendChild(content);
    container.appendChild(resizeHandle);
    
    this.attachEventListeners(container, content, resizeHandle);
    
    this.element = container;
    return container;
  }
  
  attachEventListeners(container, content, resizeHandle) {
    // Dragging
    container.addEventListener('mousedown', (e) => {
      if (e.target === resizeHandle) return;
      this.isDragging = true;
      this.dragStartX = e.clientX - this.annotation.position.x;
      this.dragStartY = e.clientY - this.annotation.position.y;
    });
    
    // Resizing
    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.isResizing = true;
      this.resizeStartWidth = this.annotation.position.width;
      this.resizeStartHeight = this.annotation.position.height;
      this.resizeStartX = e.clientX;
      this.resizeStartY = e.clientY;
    });
    
    // Content editing
    content.addEventListener('input', () => {
      this.annotation.content.text = content.innerHTML;
      this.saveAnnotation();
    });
  }
  
  saveAnnotation() {
    // Save to storage
    chrome.storage.local.get(['annotations'], (result) => {
      const annotations = result.annotations || {};
      const url = this.annotation.url;
      if (!annotations[url]) annotations[url] = [];
      
      const index = annotations[url].findIndex(a => a.id === this.annotation.id);
      if (index >= 0) {
        annotations[url][index] = this.annotation;
      } else {
        annotations[url].push(this.annotation);
      }
      
      chrome.storage.local.set({ annotations });
    });
  }
}
```

### Drawing Annotation Component

```javascript
class DrawingAnnotation {
  constructor(annotation) {
    this.annotation = annotation;
    this.element = null;
  }
  
  render() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.className = 'drawing-annotation';
    svg.dataset.annotationId = this.annotation.id;
    svg.style.cssText = `
      position: absolute;
      left: ${this.annotation.position.x}px;
      top: ${this.annotation.position.y}px;
      pointer-events: auto;
      cursor: grab;
      z-index: 999;
    `;
    
    // Calculate bounding box
    const bbox = this.calculateBoundingBox(this.annotation.content.points);
    svg.setAttribute('width', bbox.width);
    svg.setAttribute('height', bbox.height);
    svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    
    // Create path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', this.annotation.content.svgPath);
    path.setAttribute('stroke', this.annotation.content.strokeColor);
    path.setAttribute('stroke-width', this.annotation.content.strokeWidth);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    
    svg.appendChild(path);
    
    this.attachDragListeners(svg);
    
    this.element = svg;
    return svg;
  }
  
  calculateBoundingBox(points) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return {
      x: Math.min(...xs) - 10,
      y: Math.min(...ys) - 10,
      width: Math.max(...xs) - Math.min(...xs) + 20,
      height: Math.max(...ys) - Math.min(...ys) + 20
    };
  }
  
  attachDragListeners(svg) {
    let isDragging = false;
    let startX, startY;
    
    svg.addEventListener('mouseenter', () => {
      svg.style.cursor = 'grab';
    });
    
    svg.addEventListener('mousedown', (e) => {
      isDragging = true;
      svg.style.cursor = 'grabbing';
      startX = e.clientX - this.annotation.position.x;
      startY = e.clientY - this.annotation.position.y;
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      this.annotation.position.x = e.clientX - startX;
      this.annotation.position.y = e.clientY - startY;
      
      svg.style.left = this.annotation.position.x + 'px';
      svg.style.top = this.annotation.position.y + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        svg.style.cursor = 'grab';
        this.saveAnnotation();
      }
    });
  }
  
  saveAnnotation() {
    // Same as TextAnnotation.saveAnnotation()
  }
}
```

---

## Implementation Details

### 1. Hotkey System

```javascript
// utils/hotkey-manager.js
class HotkeyManager {
  constructor() {
    this.bindings = new Map();
    this.loadSettings();
    this.attachListeners();
  }
  
  loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      this.bindings.set('textMode', settings.hotkeys?.textMode || 'Ctrl+Shift+T');
      this.bindings.set('drawMode', settings.hotkeys?.drawMode || 'Ctrl+Shift+D');
    });
  }
  
  attachListeners() {
    document.addEventListener('keydown', (e) => {
      const key = this.getKeyCombo(e);
      
      if (key === this.bindings.get('textMode')) {
        e.preventDefault();
        this.triggerTextMode();
      } else if (key === this.bindings.get('drawMode')) {
        e.preventDefault();
        this.triggerDrawMode();
      }
    });
  }
  
  getKeyCombo(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Meta');
    
    const key = e.key.toUpperCase();
    if (key !== 'CONTROL' && key !== 'SHIFT' && key !== 'ALT' && key !== 'META') {
      parts.push(key);
    }
    
    return parts.join('+');
  }
  
  triggerTextMode() {
    chrome.runtime.sendMessage({ type: 'ACTIVATE_TEXT_MODE' });
  }
  
  triggerDrawMode() {
    chrome.runtime.sendMessage({ type: 'ACTIVATE_DRAW_MODE' });
  }
}
```

### 2. Tab Close Handler

```javascript
// background/service-worker.js
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Get URL from tab before it closes
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    
    chrome.storage.local.get(['settings', 'annotations'], (result) => {
      const settings = result.settings || {};
      const annotations = result.annotations || {};
      
      if (!annotations[tab.url] || annotations[tab.url].length === 0) return;
      
      if (settings.closeTabBehavior === 'keep') {
        // Do nothing, keep annotations
        return;
      } else if (settings.closeTabBehavior === 'clear') {
        // Clear annotations
        delete annotations[tab.url];
        chrome.storage.local.set({ annotations });
      } else {
        // Ask user
        chrome.windows.create({
          url: `dialog.html?url=${encodeURIComponent(tab.url)}&tabId=${tabId}`,
          type: 'popup',
          width: 400,
          height: 200
        });
      }
    });
  });
});
```

### 3. Storage Limits & Cleanup

```javascript
// utils/storage-helper.js
class StorageHelper {
  static LIMITS = {
    MAX_ANNOTATIONS_PER_URL: 150,  // 50 drawings + 100 text
    MAX_URLS: 50,
    MAX_STORAGE_MB: 10
  };
  
  static async checkAndEnforce() {
    const result = await chrome.storage.local.get(['annotations']);
    const annotations = result.annotations || {};
    
    // Check per-URL limits
    Object.keys(annotations).forEach(url => {
      const urlAnnotations = annotations[url];
      const textCount = urlAnnotations.filter(a => a.type === 'text').length;
      const drawCount = urlAnnotations.filter(a => a.type === 'drawing').length;
      
      if (textCount > 100 || drawCount > 50) {
        // Remove oldest annotations
        annotations[url] = this.pruneOldest(urlAnnotations, 100, 50);
      }
    });
    
    // Check total URL count
    if (Object.keys(annotations).length > this.LIMITS.MAX_URLS) {
      // Remove least recently used URLs
      const sortedUrls = Object.keys(annotations).sort((a, b) => {
        const aLatest = Math.max(...annotations[a].map(ann => ann.modifiedAt));
        const bLatest = Math.max(...annotations[b].map(ann => ann.modifiedAt));
        return bLatest - aLatest;
      });
      
      const toKeep = sortedUrls.slice(0, this.LIMITS.MAX_URLS);
      const pruned = {};
      toKeep.forEach(url => {
        pruned[url] = annotations[url];
      });
      
      await chrome.storage.local.set({ annotations: pruned });
      return;
    }
    
    await chrome.storage.local.set({ annotations });
  }
  
  static pruneOldest(annotations, textLimit, drawLimit) {
    const text = annotations.filter(a => a.type === 'text')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, textLimit);
    
    const drawings = annotations.filter(a => a.type === 'drawing')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, drawLimit);
    
    return [...text, ...drawings];
  }
  
  static async getStorageUsage() {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        resolve((bytes / 1024 / 1024).toFixed(2));  // MB
      });
    });
  }
}
```

---

## Storage Strategy

### Chrome Storage Structure

```javascript
{
  annotations: {
    'https://example.com/page1': [
      { id: 'uuid-1', type: 'text', ... },
      { id: 'uuid-2', type: 'drawing', ... }
    ],
    'https://example.com/page2': [...]
  },
  
  collections: {
    'collection-uuid-1': {
      id: 'collection-uuid-1',
      name: 'Project Alpha',
      annotationIds: ['uuid-1', 'uuid-3'],
      createdAt: 1696704000000
    }
  },
  
  settings: {
    closeTabBehavior: 'ask',
    hotkeys: {
      textMode: 'Ctrl+Shift+T',
      drawMode: 'Ctrl+Shift+D'
    },
    defaultTextColor: '#FFEB3B',
    defaultStrokeColor: '#FFEB3B',
    defaultStrokeWidth: 4
  }
}
```

### Indexing for Performance

For fast lookups, maintain an index:

```javascript
{
  annotationIndex: {
    'uuid-1': 'https://example.com/page1',
    'uuid-2': 'https://example.com/page1',
    'uuid-3': 'https://example.com/page2'
  }
}
```

---

## Testing Requirements

### Unit Tests

1. **Anchor Engine**
   - XPath generation and resolution
   - CSS selector fallback
   - Text content matching
   - Proportional scaling calculations

2. **Drawing Engine**
   - Catmull-Rom interpolation accuracy
   - SVG path conversion
   - Bounding box calculations

3. **Storage Helper**
   - Limit enforcement
   - Pruning logic
   - Storage usage calculations

### Integration Tests

1. **Content Script Injection**
   - Test on various sites (Wikipedia, Twitter, Gmail, Reddit)
   - Verify annotation persistence across page refreshes
   - Test dynamic content loading (SPAs)

2. **Cross-Tab Sync**
   - Open same URL in 2 tabs
   - Create annotation in Tab A
   - Verify instant appearance in Tab B

3. **Infinite Scroll Detection**
   - Test on Twitter feed
   - Verify warning appears
   - Test on individual tweet (no warning)

### Edge Cases

1. **Z-Index conflicts**: Test on sites with modal overlays
2. **CSP restrictions**: Test on sites with strict CSP
3. **Iframe handling**: Annotations should not work inside iframes
4. **Full-screen mode**: Annotations should hide/show appropriately
5. **Page zoom**: Test at 50%, 100%, 150%, 200% zoom levels
6. **Very long pages**: Test on 10,000px+ tall pages
7. **Empty pages**: Test on blank pages or error pages

---

## Apple-Style Design System

### Colors

```css
:root {
  --primary-bg: #FFFFFF;
  --secondary-bg: #F5F5F7;
  --hover-bg: #E8E8ED;
  --border-color: #D2D2D7;
  --text-primary: #1D1D1F;
  --text-secondary: #6E6E73;
  --accent-blue: #007AFF;
  --accent-red: #FF3B30;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.16);
}
```

### Typography

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 
               'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}

h1 { font-size: 28px; font-weight: 700; }
h2 { font-size: 22px; font-weight: 600; }
h3 { font-size: 18px; font-weight: 600; }
```

### Spacing

Use 4px base unit: 4, 8, 12, 16, 24, 32, 48, 64

### Components

```css
.button {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.button-primary {
  background: var(--accent-blue);
  color: white;
}

.button-primary:hover {
  background: #0051D5;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.input {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  transition: border 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--accent-blue);
}

.card {
  background: var(--primary-bg);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Manifest.json setup
- Extension permissions
- Content script injection
- Basic storage system
- Hotkey manager

### Phase 2: Text Annotations (Week 1)
- Text mode activation
- Sticky note UI
- Dragging and resizing
- Text formatting
- Basic anchoring (pixel-based)

### Phase 3: Drawing System (Week 2)
- Draw mode activation
- Color palette UI
- Canvas drawing with smoothing
- SVG conversion and storage
- Brush size controls

### Phase 4: Advanced Anchoring (Week 2)
- XPath + CSS selector system
- Content fingerprinting
- Change detection
- Infinite scroll detection
- Proportional scaling

### Phase 5: Dashboard (Week 3)
- Popup UI with tabs
- Current Page view
- All Annotations view
- Collections system
- Settings panel

### Phase 6: Polish & Sync (Week 3)
- Cross-tab sync
- Edit modal
- Search/filter/sort
- Export/import
- Tab close handling

### Phase 7: Testing & Refinement (Week 4)
- Cross-browser testing
- Performance optimization
- Bug fixes
- Documentation

---

## Success Metrics

1. **Reliability**: Annotations persist correctly 99%+ of the time
2. **Performance**: No noticeable lag when drawing (60fps)
3. **Compatibility**: Works on top 100 websites
4. **User Experience**: Intuitive enough for non-technical users
5. **Storage**: Handles 10,000 annotations without slowdown

---

## Known Limitations

1. **Iframes**: Cannot annotate content inside cross-origin iframes
2. **PDF files**: Chrome's built-in PDF viewer blocks content scripts
3. **Dynamic content**: Very aggressive DOM manipulation (e.g., virtual scrolling) may break anchoring
4. **Canvas elements**: Cannot annotate on top of canvas or WebGL content
5. **Browser restrictions**: Some sites block all extensions via CSP

---

## Future Enhancements

1. **Cloud sync**: Sync annotations across devices
2. **Collaboration**: Share annotations with others
3. **OCR**: Extract text from images in annotations
4. **Voice notes**: Record audio annotations
5. **Smart anchoring**: ML-based content matching
6. **Mobile support**: iOS/Android extension equivalent
7. **Export formats**: PDF, Markdown, HTML with annotations
8. **Page snapshots**: Archive page state with annotations

---

## Conclusion

The key to success is robust DOM anchoring with multiple fallback strategies, efficient storage management, and a polished Apple-style UI. The most challenging aspects are handling dynamic content and infinite scroll, but the proposed solutions provide a solid foundation that will work on 95%+ of websites.

