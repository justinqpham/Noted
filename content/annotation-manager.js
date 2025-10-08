// Annotation Manager - Manages lifecycle of all annotations on the page
// Handles loading, saving, rendering, and cleanup

class AnnotationManager {
  constructor() {
    this.annotations = [];
    this.containerElement = null;
    this.rawURL = window.location.href;
    this.currentURL = this.normalizeURL(this.rawURL);
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.skipNextStorageReload = false; // Flag to prevent reload during drag operations

    console.log('Noted: AnnotationManager initialized for', {
      rawURL: this.rawURL,
      normalizedURL: this.currentURL
    });

    this.initialize();
  }

  /**
   * Normalize URLs by stripping common tracking/query noise so refreshes map consistently
   * @param {string} urlString - Raw URL from window.location.href
   * @returns {string} Normalized URL
   */
  normalizeURL(urlString) {
    try {
      const url = new URL(urlString);
      const params = new URLSearchParams(url.search);
      const lowerParams = Array.from(params.keys());

      const STATIC_PARAMS = new Set([
        'gclid', 'fbclid', 'msclkid', 'dclid', 'yclid', 'rbclickid', 'igshid',
        'mc_cid', 'mc_eid', 'cmpid', 'campaignid', 'adgroupid', 'creative',
        'creativeid', 'utm_id', 'utm_source', 'utm_medium', 'utm_campaign',
        'utm_term', 'utm_content', 'utm_name', 'utm_creative', 'utm_place',
        '_hsenc', '_hsmi', '_ga', '_gl', 'ref', 'referrer', 'zx', 'no_sw_cr',
        's_kwcid', 'fb_source', 'spm', 'ck_subscriber_id'
      ]);

      lowerParams.forEach((key) => {
        const normalizedKey = key.toLowerCase();
        if (normalizedKey.startsWith('utm_') || STATIC_PARAMS.has(normalizedKey)) {
          params.delete(key);
        }
      });

      const cleanedSearch = params.toString();
      url.search = cleanedSearch ? `?${cleanedSearch}` : '';

      return url.toString();
    } catch (error) {
      console.warn('Noted: Failed to normalize URL, using raw value', error);
      return urlString;
    }
  }

  /**
   * Initialize the annotation system
   */
  async initialize() {
    // Create container for annotations
    this.createContainer();

    // Load annotations from storage
    await this.loadAnnotations();

    // Listen for window resize
    window.addEventListener('resize', () => this.handleResize());

    // Listen for storage changes (cross-tab sync)
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.annotations) {
        this.handleStorageChange(changes.annotations);
      }
    });
  }

  /**
   * Create container element for annotations
   */
  createContainer() {
    // Check if container already exists
    if (document.getElementById('noted-extension-root')) {
      this.containerElement = document.getElementById('noted-extension-root');
      return;
    }

    const container = document.createElement('div');
    container.id = 'noted-extension-root';
    container.className = 'noted-extension-root';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483647;
      isolation: isolate;
    `;

    document.documentElement.appendChild(container);
    this.containerElement = container;

    console.log('Noted: Container created');
  }

  /**
   * Load annotations from storage
   */
  async loadAnnotations() {
    try {
      const result = await chrome.storage.local.get(['annotations', 'annotationIndex']);
      const allAnnotations = result.annotations || {};
      const annotationIndex = result.annotationIndex || {};

      const normalizedKey = this.currentURL;
      const rawKey = this.rawURL;

      const normalizedAnnotations = allAnnotations[normalizedKey] || [];
      const annotationMap = new Map(
        normalizedAnnotations.map(annotation => [
          annotation.id,
          {
            ...annotation,
            url: normalizedKey
          }
        ])
      );

      normalizedAnnotations.forEach(annotation => {
        annotationIndex[annotation.id] = normalizedKey;
      });

      let migrated = false;

      if (rawKey !== normalizedKey && allAnnotations[rawKey] && allAnnotations[rawKey].length > 0) {
        console.log('Noted: Migrating annotations from raw URL to normalized URL', {
          rawKey,
          normalizedKey,
          count: allAnnotations[rawKey].length
        });

        allAnnotations[rawKey].forEach(annotation => {
          const migratedAnnotation = {
            ...annotation,
            url: normalizedKey
          };
          annotationMap.set(migratedAnnotation.id, migratedAnnotation);
          annotationIndex[migratedAnnotation.id] = normalizedKey;
        });

        delete allAnnotations[rawKey];
        migrated = true;
      }

      const urlAnnotations = Array.from(annotationMap.values());

      allAnnotations[normalizedKey] = urlAnnotations;

      if (migrated) {
        // Prevent immediate reload when migration writes back
        this.skipNextStorageReload = true;
        await chrome.storage.local.set({ annotations: allAnnotations, annotationIndex });
      }

      console.log(`Noted: Loaded ${urlAnnotations.length} annotations for current URL`);

      // Clear existing rendered annotations
      this.clearRenderedAnnotations();

      // Store and render annotations
      this.annotations = urlAnnotations;
      this.renderAllAnnotations();

    } catch (error) {
      console.error('Noted: Error loading annotations:', error);
    }
  }

  /**
   * Render all annotations
   */
  renderAllAnnotations() {
    this.annotations.forEach(annotation => {
      this.renderAnnotation(annotation);
    });
  }

  /**
   * Render a single annotation
   * @param {Object} annotation - Annotation object
   * @param {boolean} autoFocus - Whether to auto-focus the annotation
   * @returns {Object} The rendered annotation instance
   */
  renderAnnotation(annotation, autoFocus = false) {
    if (annotation.type === 'text') {
      // Import and render text annotation
      if (typeof TextAnnotation !== 'undefined') {
        const textAnnotation = new TextAnnotation(annotation, this);
        const element = textAnnotation.render();
        this.containerElement.appendChild(element);

        // Auto-focus if requested (for newly created annotations)
        if (autoFocus) {
          setTimeout(() => textAnnotation.focus(), 50);
        }

        return textAnnotation;
      } else {
        console.warn('Noted: TextAnnotation class not loaded');
      }
    } else if (annotation.type === 'drawing') {
      // Render drawing annotation
      if (typeof DrawingAnnotation !== 'undefined') {
        const drawingAnnotation = new DrawingAnnotation(annotation, this);
        const element = drawingAnnotation.render();
        this.containerElement.appendChild(element);
        return drawingAnnotation;
      } else {
        console.warn('Noted: DrawingAnnotation class not loaded');
      }
    }
    return null;
  }

  /**
   * Clear all rendered annotations from DOM
   */
  clearRenderedAnnotations() {
    if (this.containerElement) {
      this.containerElement.innerHTML = '';
    }
  }

  /**
   * Add a new annotation
   * @param {Object} annotation - Annotation object
   * @param {boolean} autoFocus - Whether to auto-focus the annotation
   */
  async addAnnotation(annotation, autoFocus = true) {
    try {
      // Ensure annotation uses normalized URL
      annotation.url = this.currentURL;

      // Add to local array
      this.annotations.push(annotation);

      // Save to storage
      await this.saveAnnotation(annotation);

      // Render with auto-focus
      this.renderAnnotation(annotation, autoFocus);

      console.log('Noted: Annotation added:', annotation.id);

    } catch (error) {
      console.error('Noted: Error adding annotation:', error);
    }
  }

  /**
   * Update an existing annotation
   * @param {Object} annotation - Updated annotation object
   */
  async updateAnnotation(annotation) {
    try {
      // Persist normalized URL on update
      annotation.url = this.currentURL;

      // Update in local array
      const index = this.annotations.findIndex(a => a.id === annotation.id);
      if (index >= 0) {
        this.annotations[index] = annotation;
      }

      // Save to storage
      await this.saveAnnotation(annotation);

      console.log('Noted: Annotation updated:', annotation.id);

    } catch (error) {
      console.error('Noted: Error updating annotation:', error);
    }
  }

  /**
   * Delete an annotation
   * @param {string} annotationId - ID of annotation to delete
   */
  async deleteAnnotation(annotationId) {
    try {
      // Remove from local array
      this.annotations = this.annotations.filter(a => a.id !== annotationId);

      // Remove from storage
      const result = await chrome.storage.local.get(['annotations', 'annotationIndex']);
      const allAnnotations = result.annotations || {};
      const annotationIndex = result.annotationIndex || {};

      if (allAnnotations[this.currentURL]) {
        allAnnotations[this.currentURL] = allAnnotations[this.currentURL].filter(
          a => a.id !== annotationId
        );
      }

      // Update index
      delete annotationIndex[annotationId];

      await chrome.storage.local.set({ annotations: allAnnotations, annotationIndex });

      // Remove from DOM
      const element = document.querySelector(`[data-annotation-id="${annotationId}"]`);
      if (element) {
        element.remove();
      }

      console.log('Noted: Annotation deleted:', annotationId);

    } catch (error) {
      console.error('Noted: Error deleting annotation:', error);
    }
  }

  /**
   * Save annotation to storage
   * @param {Object} annotation - Annotation to save
   */
  async saveAnnotation(annotation) {
    try {
      annotation.url = this.currentURL;

      const result = await chrome.storage.local.get(['annotations', 'annotationIndex']);
      const allAnnotations = result.annotations || {};
      const annotationIndex = result.annotationIndex || {};

      // Initialize URL array if needed
      if (!allAnnotations[this.currentURL]) {
        allAnnotations[this.currentURL] = [];
      }

      // Update or add annotation
      const existingIndex = allAnnotations[this.currentURL].findIndex(
        a => a.id === annotation.id
      );

      if (existingIndex >= 0) {
        allAnnotations[this.currentURL][existingIndex] = annotation;
      } else {
        allAnnotations[this.currentURL].push(annotation);
      }

      // Update index
      annotationIndex[annotation.id] = this.currentURL;

      // Save to storage
      await chrome.storage.local.set({ annotations: allAnnotations, annotationIndex });

    } catch (error) {
      console.error('Noted: Error saving annotation:', error);
      throw error;
    }
  }

  /**
   * Handle window resize - scale annotations proportionally
   */
  handleResize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    const scaleX = newWidth / this.viewportWidth;
    const scaleY = newHeight / this.viewportHeight;

    console.log('Noted: Window resized, scaling annotations', { scaleX, scaleY });

    // Update all annotations
    this.annotations.forEach(annotation => {
      if (annotation.position) {
        annotation.position.x = annotation.position.x * scaleX;
        annotation.position.y = annotation.position.y * scaleY;

        if (annotation.type === 'text') {
          annotation.position.width = annotation.position.width * scaleX;
          annotation.position.height = annotation.position.height * scaleY;
        }
      }
    });

    // Update viewport dimensions
    this.viewportWidth = newWidth;
    this.viewportHeight = newHeight;

    // Re-render all annotations
    this.clearRenderedAnnotations();
    this.renderAllAnnotations();
  }

  /**
   * Handle storage changes from other tabs
   * @param {Object} change - Storage change object
   */
  handleStorageChange(change) {
    // Skip reload if this change was triggered by a drag operation
    if (this.skipNextStorageReload) {
      console.log('Noted: Skipping storage reload (drag operation in progress)');
      this.skipNextStorageReload = false;
      return;
    }

    console.log('Noted: Storage changed, reloading annotations');
    this.loadAnnotations();
  }

  /**
   * Generate unique ID for annotation
   * @returns {string} UUID v4
   */
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Make available globally
window.AnnotationManager = AnnotationManager;
