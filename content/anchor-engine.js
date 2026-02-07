// Anchor Engine - Robust DOM anchoring system for annotations
// Handles XPath generation, CSS selectors, text matching, and fallback strategies

class AnchorEngine {
  /**
   * Generate anchor data for an annotation at a given position
   * @param {number} x - X coordinate (viewport)
   * @param {number} y - Y coordinate (viewport)
   * @param {number} viewportWidth - Current viewport width
   * @param {number} viewportHeight - Current viewport height
   * @returns {Object} Anchor data with multiple strategies
   */
  static generateAnchor(x, y, viewportWidth, viewportHeight) {
    // Find the element at the annotation position
    const element = document.elementFromPoint(x, y);

    // Store scroll position for page-relative coordinates
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    console.log('Noted: Generating anchor', {
      viewportPos: { x, y },
      scroll: { x: scrollX, y: scrollY },
      pagePos: { x: x + scrollX, y: y + scrollY }
    });

    if (!element || element === document.body || element === document.documentElement) {
      // No specific anchor element - use page positioning (viewport + scroll)
      return {
        strategy: 'page',
        xpath: null,
        cssSelector: null,
        textContent: null,
        pageX: x + scrollX,
        pageY: y + scrollY,
        scrollX: scrollX,
        scrollY: scrollY,
        viewportWidth: viewportWidth,
        viewportHeight: viewportHeight
      };
    }

    // Generate XPath
    const xpath = this.generateXPath(element);

    // Generate CSS selector
    const cssSelector = this.generateCSSSelector(element);

    // Get text content for matching
    const textContent = this.getTextContent(element);

    // Calculate offset from element
    const rect = element.getBoundingClientRect();
    const offsetX = x - rect.left;
    const offsetY = y - rect.top;

    return {
      strategy: 'hybrid',
      xpath: xpath,
      cssSelector: cssSelector,
      textContent: textContent,
      offsetX: offsetX,
      offsetY: offsetY,
      pageX: x + scrollX,
      pageY: y + scrollY,
      elementPageX: rect.left + scrollX,
      elementPageY: rect.top + scrollY,
      scrollX: scrollX,
      scrollY: scrollY,
      viewportWidth: viewportWidth,
      viewportHeight: viewportHeight
    };
  }

  /**
   * Generate XPath for an element
   * @param {Element} element - Target element
   * @returns {string} XPath expression
   */
  static generateXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling = current.previousSibling;

      // Count same-tag siblings before this element
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      const tagName = current.nodeName.toLowerCase();
      const position = index > 0 ? `[${index + 1}]` : '';
      parts.unshift(`${tagName}${position}`);

      current = current.parentNode;

      // Stop at body
      if (current === document.body) {
        parts.unshift('body');
        break;
      }
    }

    return '/' + parts.join('/');
  }

  /**
   * Generate CSS selector for an element
   * @param {Element} element - Target element
   * @returns {string} CSS selector
   */
  static generateCSSSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }

    const parts = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.nodeName.toLowerCase();

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(c => c);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      // Add nth-of-type for specificity
      const siblings = Array.from(current.parentNode?.children || []);
      const sameTagSiblings = siblings.filter(s => s.nodeName === current.nodeName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }

      parts.unshift(selector);
      current = current.parentNode;

      // Limit selector depth for performance
      if (parts.length >= 5) break;
    }

    return parts.join(' > ');
  }

  /**
   * Get text content from element for matching
   * @param {Element} element - Target element
   * @returns {string} First 50 characters of text content
   */
  static getTextContent(element) {
    const text = element.textContent || element.innerText || '';
    return text.trim().slice(0, 50);
  }

  /**
   * Resolve anchor to find element and position
   * @param {Object} anchor - Anchor data
   * @returns {Object|null} { element, x, y } or null if not found
   */
  static resolveAnchor(anchor) {
    if (!anchor) return null;

    const currentScrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Page strategy - use page coordinates (handle old "viewport" strategy too)
    if (anchor.strategy === 'page' || anchor.strategy === 'viewport') {
      if (anchor.pageX !== undefined && anchor.pageY !== undefined) {
        // New page-relative coordinates
        return {
          element: null,
          x: anchor.pageX - currentScrollX,
          y: anchor.pageY - currentScrollY
        };
      } else {
        // Old viewport strategy - proportional scaling
        const scaleX = window.innerWidth / anchor.viewportWidth;
        const scaleY = window.innerHeight / anchor.viewportHeight;
        return {
          element: null,
          x: anchor.offsetX * scaleX,
          y: anchor.offsetY * scaleY
        };
      }
    }

    // Try XPath first
    if (anchor.xpath) {
      const element = this.resolveXPath(anchor.xpath);
      if (element) {
        const rect = element.getBoundingClientRect();
        return {
          element: element,
          x: rect.left + anchor.offsetX,
          y: rect.top + anchor.offsetY
        };
      }
    }

    // Fall back to CSS selector
    if (anchor.cssSelector) {
      const element = this.resolveCSSSelector(anchor.cssSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        return {
          element: element,
          x: rect.left + anchor.offsetX,
          y: rect.top + anchor.offsetY
        };
      }
    }

    // Fall back to text content matching
    if (anchor.textContent) {
      const element = this.resolveByTextContent(anchor.textContent);
      if (element) {
        const rect = element.getBoundingClientRect();
        return {
          element: element,
          x: rect.left + anchor.offsetX,
          y: rect.top + anchor.offsetY
        };
      }
    }

    // Last resort: use stored page coordinates with current scroll
    if (anchor.elementPageX !== undefined && anchor.elementPageY !== undefined) {
      return {
        element: null,
        x: anchor.elementPageX - currentScrollX + anchor.offsetX,
        y: anchor.elementPageY - currentScrollY + anchor.offsetY,
        warning: 'approximate'
      };
    }

    return null;
  }

  /**
   * Resolve XPath to element
   * @param {string} xpath - XPath expression
   * @returns {Element|null}
   */
  static resolveXPath(xpath) {
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    } catch (e) {
      console.warn('Noted: XPath resolution failed:', e);
      return null;
    }
  }

  /**
   * Resolve CSS selector to element
   * @param {string} selector - CSS selector
   * @returns {Element|null}
   */
  static resolveCSSSelector(selector) {
    try {
      return document.querySelector(selector);
    } catch (e) {
      console.warn('Noted: CSS selector resolution failed:', e);
      return null;
    }
  }

  /**
   * Find element by text content matching
   * @param {string} targetText - Text to match
   * @returns {Element|null}
   */
  static resolveByTextContent(targetText) {
    if (!targetText) return null;

    // Search all elements
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const text = (el.textContent || el.innerText || '').trim().slice(0, 50);
      if (text === targetText) {
        return el;
      }
    }

    return null;
  }

  /**
   * Generate page fingerprint for content change detection
   * @returns {Object} Fingerprint with DOM hash and text hash
   */
  static generatePageFingerprint() {
    const mainContent = document.querySelector('main, article, #content, .content') || document.body;

    return {
      domHash: this.hashDOMStructure(mainContent),
      textHash: this.hashTextContent(mainContent),
      timestamp: Date.now()
    };
  }

  /**
   * Hash DOM structure (tag names + depth)
   * @param {Element} element - Root element
   * @returns {number} Hash value
   */
  static hashDOMStructure(element) {
    const structure = Array.from(element.querySelectorAll('*'))
      .slice(0, 100)  // Sample first 100 elements for performance
      .map(el => el.tagName)
      .join(',');

    return this.simpleHash(structure);
  }

  /**
   * Hash text content
   * @param {Element} element - Root element
   * @returns {number} Hash value
   */
  static hashTextContent(element) {
    const text = (element.innerText || element.textContent || '').slice(0, 1000);
    return this.simpleHash(text);
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {number} 32-bit integer hash
   */
  static simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;  // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Compare page fingerprints
   * @param {Object} stored - Stored fingerprint
   * @param {Object} current - Current fingerprint
   * @returns {boolean} True if content has changed
   */
  static hasContentChanged(stored, current) {
    if (!stored || !current) return false;

    return stored.domHash !== current.domHash || stored.textHash !== current.textHash;
  }

  // ========================================================
  // Phase 5: Confidence-Scored Resolution & Correction Calibration
  // ========================================================

  /**
   * Generate anchor with confidence scores and text context.
   * Extends the existing generateAnchor() with richer data.
   */
  static generateAnchorWithConfidence(x, y, viewportWidth, viewportHeight) {
    const base = this.generateAnchor(x, y, viewportWidth, viewportHeight);

    base.confidence = {
      xpath: base.xpath ? 0.70 : 0,
      cssSelector: base.cssSelector ? 0.65 : 0,
      textContent: base.textContent ? 0.85 : 0,
      position: 0.40
    };

    // Boost xpath confidence if it uses an ID
    if (base.xpath && base.xpath.includes('@id=')) {
      base.confidence.xpath = 0.95;
    }

    // Add richer text context
    const element = document.elementFromPoint(x, y);
    if (element && element !== document.body && element !== document.documentElement) {
      base.textContext = this.getTextContext(element);
    }

    base.learnedOffset = { x: 0, y: 0 };
    base.corrections = [];

    return base;
  }

  /**
   * Get surrounding text context for an element
   */
  static getTextContext(element) {
    const targetText = (element.textContent || '').trim().slice(0, 50);
    let contextBefore = '';
    let contextAfter = '';

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let prevText = '';
    let foundTarget = false;
    let node;

    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if (!text) continue;
      if (!foundTarget && element.contains(node)) {
        contextBefore = prevText;
        foundTarget = true;
      } else if (foundTarget && !element.contains(node)) {
        contextAfter = text.slice(0, 50);
        break;
      }
      prevText = text.slice(0, 50);
    }

    return {
      targetText,
      contextBefore,
      contextAfter,
      parentTag: element.tagName,
      parentClasses: (typeof element.className === 'string' && element.className) ? element.className.split(/\s+/).filter(Boolean) : []
    };
  }

  /**
   * Resolve anchor using confidence-ranked strategies.
   * Falls back to existing resolveAnchor() for old-format anchors.
   */
  static resolveWithConfidence(anchor) {
    if (!anchor || !anchor.confidence) {
      const result = this.resolveAnchor(anchor);
      if (result) {
        return { ...result, strategy: 'legacy', confidence: 0.5, success: true };
      }
      return { element: null, x: 0, y: 0, strategy: 'fallback', confidence: 0, success: false };
    }

    const strategies = [
      { type: 'xpath', confidence: anchor.confidence.xpath || 0 },
      { type: 'cssSelector', confidence: anchor.confidence.cssSelector || 0 },
      { type: 'textContent', confidence: anchor.confidence.textContent || 0 },
      { type: 'position', confidence: anchor.confidence.position || 0 }
    ].sort((a, b) => b.confidence - a.confidence);

    for (const strategy of strategies) {
      if (strategy.confidence === 0) continue;
      const result = this._tryStrategy(strategy.type, anchor);
      if (result) {
        if (anchor.learnedOffset) {
          result.x += anchor.learnedOffset.x || 0;
          result.y += anchor.learnedOffset.y || 0;
        }
        anchor.confidence[strategy.type] = Math.min(
          (anchor.confidence[strategy.type] || 0) + 0.05, 1.0
        );
        return { ...result, strategy: strategy.type, confidence: strategy.confidence, success: true };
      }
    }

    const currentScrollX = window.pageXOffset || 0;
    const currentScrollY = window.pageYOffset || 0;
    return {
      element: null,
      x: (anchor.pageX || 0) - currentScrollX,
      y: (anchor.pageY || 0) - currentScrollY,
      strategy: 'fallback',
      confidence: 0.10,
      success: false,
      requiresUserReview: true
    };
  }

  static _tryStrategy(type, anchor) {
    switch (type) {
      case 'xpath': return this._tryXPath(anchor);
      case 'cssSelector': return this._tryCSSSelector(anchor);
      case 'textContent': return this._tryTextContent(anchor);
      case 'position': return this._tryPosition(anchor);
      default: return null;
    }
  }

  static _tryXPath(anchor) {
    if (!anchor.xpath) return null;
    const element = this.resolveXPath(anchor.xpath);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { element, x: rect.left + (anchor.offsetX || 0), y: rect.top + (anchor.offsetY || 0) };
  }

  static _tryCSSSelector(anchor) {
    if (!anchor.cssSelector) return null;
    const element = this.resolveCSSSelector(anchor.cssSelector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { element, x: rect.left + (anchor.offsetX || 0), y: rect.top + (anchor.offsetY || 0) };
  }

  static _tryTextContent(anchor) {
    const ctx = anchor.textContext;
    if (!ctx && !anchor.textContent) return null;
    const targetText = ctx ? ctx.targetText : anchor.textContent;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) textNodes.push(node);
    }

    for (let i = 0; i < textNodes.length; i++) {
      const text = textNodes[i].textContent;
      if (!text.includes(targetText)) continue;
      if (ctx && ctx.contextBefore) {
        const prevText = textNodes[i - 1]?.textContent || '';
        const nextText = textNodes[i + 1]?.textContent || '';
        if (!prevText.includes(ctx.contextBefore) || !nextText.includes(ctx.contextAfter || '')) continue;
      }
      const element = textNodes[i].parentElement;
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      return { element, x: rect.left + (anchor.offsetX || 0), y: rect.top + (anchor.offsetY || 0) };
    }
    return null;
  }

  static _tryPosition(anchor) {
    if (anchor.pageX === undefined) return null;
    return {
      element: null,
      x: anchor.pageX - (window.pageXOffset || 0),
      y: anchor.pageY - (window.pageYOffset || 0)
    };
  }

  /**
   * Record a user correction when they reposition an annotation.
   * After 3+ corrections with consistent direction, applies a permanent offset.
   */
  static recordCorrection(anchor, oldPosition, newPosition) {
    if (!anchor) return;
    if (!anchor.corrections) anchor.corrections = [];

    anchor.corrections.push({
      timestamp: Date.now(),
      delta: { x: newPosition.x - oldPosition.x, y: newPosition.y - oldPosition.y }
    });

    if (anchor.corrections.length > 20) {
      anchor.corrections = anchor.corrections.slice(-20);
    }

    if (anchor.corrections.length >= 3) {
      this.calibrateOffset(anchor);
    }
  }

  /**
   * Analyze correction history and apply permanent offset if consistent.
   */
  static calibrateOffset(anchor) {
    const deltas = anchor.corrections.map(c => c.delta);
    const avgX = deltas.reduce((sum, d) => sum + d.x, 0) / deltas.length;
    const avgY = deltas.reduce((sum, d) => sum + d.y, 0) / deltas.length;
    const stdX = Math.sqrt(deltas.reduce((sum, d) => sum + Math.pow(d.x - avgX, 2), 0) / deltas.length);
    const stdY = Math.sqrt(deltas.reduce((sum, d) => sum + Math.pow(d.y - avgY, 2), 0) / deltas.length);

    if (stdX < 20 && stdY < 20) {
      anchor.learnedOffset = { x: Math.round(avgX), y: Math.round(avgY) };
      console.log('Noted: Calibrated anchor offset:', anchor.learnedOffset);
    }
  }

  /**
   * Show warning banner when anchoring falls back.
   * Uses addEventListener (not inline onclick) for security.
   */
  static showAnchorWarning(annotationId) {
    const key = `noted-warning-${window.location.href}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, 'true');

    const banner = document.createElement('div');
    banner.className = 'noted-anchor-warning';

    const icon = document.createElement('div');
    icon.className = 'noted-warning-icon';
    icon.textContent = '\u26A0\uFE0F';

    const text = document.createElement('div');
    text.className = 'noted-warning-text';
    text.textContent = 'This page changed. Some annotations may be misaligned.';

    const actions = document.createElement('div');
    actions.className = 'noted-warning-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'noted-warning-action-btn';
    viewBtn.textContent = 'View Original';
    viewBtn.addEventListener('click', () => {
      if (typeof annotationManager !== 'undefined') {
        annotationManager.showThumbnailOverlay(annotationId);
      }
    });

    const repositionBtn = document.createElement('button');
    repositionBtn.className = 'noted-warning-action-btn';
    repositionBtn.textContent = 'Reposition';
    repositionBtn.addEventListener('click', () => {
      if (typeof annotationManager !== 'undefined') {
        annotationManager.enableRepositionMode(annotationId);
      }
      banner.remove();
    });

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'noted-warning-dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => banner.remove());

    actions.appendChild(viewBtn);
    actions.appendChild(repositionBtn);
    banner.appendChild(icon);
    banner.appendChild(text);
    banner.appendChild(actions);
    banner.appendChild(dismissBtn);

    document.body.insertBefore(banner, document.body.firstChild);
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 10000);
  }

  /**
   * Detect if current page uses infinite scroll.
   * Conservative approach: only flag pages with strong evidence.
   * Phase 5's anchor warning system handles misalignment after-the-fact,
   * so false negatives here are OK (they just get a warning later).
   * False positives are annoying (modal blocks annotation workflow).
   * @returns {boolean}
   */
  static isInfiniteScrollPage() {
    // If the page has traditional pagination, it's NOT infinite scroll
    const hasPagination = !!document.querySelector(
      'a[rel="next"], [aria-label="pagination"], nav.pagination, .pagination, ' +
      'ul.pager, .pager, [role="navigation"] a[href*="page="], [role="navigation"] a[href*="page/"]'
    );
    if (hasPagination) return false;

    // Check for explicit infinite scroll library markers
    const hasInfiniteScrollLib = !!document.querySelector(
      '[data-infinite-scroll], [infinite-scroll], ' +
      '[data-infinite-scroll-url], .infinite-scroll-component'
    );
    if (hasInfiniteScrollLib) return true;

    // Check for IntersectionObserver sentinel elements at the bottom of content
    // These are invisible trigger elements that load more content
    const sentinelSelectors = [
      '.sentinel', '.infinite-scroll-trigger', '.load-more-sentinel',
      '[data-testid="cellInnerDiv"] + div[style*="height: 0"]',  // Twitter/X feed
      'faceplate-partial[loading="lazily"]'  // Reddit
    ];
    const hasSentinel = sentinelSelectors.some(sel => {
      try { return !!document.querySelector(sel); } catch { return false; }
    });

    return hasSentinel;
  }
}
