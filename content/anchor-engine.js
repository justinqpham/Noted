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

  /**
   * Detect if current page uses infinite scroll
   * @returns {boolean}
   */
  static isInfiniteScrollPage() {
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

    const domain = window.location.hostname.replace('www.', '');

    // Check known domains
    if (INFINITE_SCROLL_DOMAINS.some(d => domain.includes(d))) {
      // Exclude specific non-scrolling pages
      const url = window.location.pathname;
      if (url.match(/\/(status|post|article|p|comments)\/[\w-]+$/)) {
        return false;  // Individual post/article pages typically don't infinite scroll
      }
      return true;
    }

    // Heuristic detection - only check for explicit infinite scroll indicators
    const hasInfiniteScrollLib = !!document.querySelector('[data-infinite-scroll], .infinite-scroll, [infinite-scroll]');

    // Don't rely on page height alone - too many false positives
    return hasInfiniteScrollLib;
  }
}
