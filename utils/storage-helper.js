// Storage Helper - Manages Chrome storage with limit enforcement
// Handles storage limits, pruning, and usage calculations

class StorageHelper {
  static LIMITS = {
    MAX_ANNOTATIONS_PER_URL: 150,  // 50 drawings + 100 text
    MAX_TEXT_PER_URL: 100,
    MAX_DRAWINGS_PER_URL: 50,
    MAX_URLS: 50,
    MAX_STORAGE_MB: 10
  };

  /**
   * Check and enforce storage limits
   * Prunes oldest annotations if limits are exceeded
   */
  static async checkAndEnforce() {
    try {
      const result = await chrome.storage.local.get(['annotations']);
      const annotations = result.annotations || {};

      let modified = false;

      // Check per-URL limits
      Object.keys(annotations).forEach(url => {
        const urlAnnotations = annotations[url];
        const textAnnotations = urlAnnotations.filter(a => a.type === 'text');
        const drawingAnnotations = urlAnnotations.filter(a => a.type === 'drawing');

        // Enforce per-type limits
        if (textAnnotations.length > this.LIMITS.MAX_TEXT_PER_URL ||
            drawingAnnotations.length > this.LIMITS.MAX_DRAWINGS_PER_URL) {
          annotations[url] = this.pruneOldest(
            urlAnnotations,
            this.LIMITS.MAX_TEXT_PER_URL,
            this.LIMITS.MAX_DRAWINGS_PER_URL
          );
          modified = true;
        }
      });

      // Check total URL count
      const urlCount = Object.keys(annotations).length;
      if (urlCount > this.LIMITS.MAX_URLS) {
        const pruned = this.pruneLeastRecentlyUsedURLs(annotations, this.LIMITS.MAX_URLS);
        await chrome.storage.local.set({ annotations: pruned });
        return { enforced: true, urlsPruned: urlCount - this.LIMITS.MAX_URLS };
      }

      // Save if modified
      if (modified) {
        await chrome.storage.local.set({ annotations });
        return { enforced: true, annotationsPruned: true };
      }

      return { enforced: false };
    } catch (error) {
      console.error('Noted: Error enforcing storage limits:', error);
      throw error;
    }
  }

  /**
   * Prune oldest annotations by type
   * @param {Array} annotations - Array of annotation objects
   * @param {number} textLimit - Maximum number of text annotations
   * @param {number} drawLimit - Maximum number of drawing annotations
   * @returns {Array} Pruned array of annotations
   */
  static pruneOldest(annotations, textLimit, drawLimit) {
    const textAnnotations = annotations
      .filter(a => a.type === 'text')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, textLimit);

    const drawingAnnotations = annotations
      .filter(a => a.type === 'drawing')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, drawLimit);

    return [...textAnnotations, ...drawingAnnotations];
  }

  /**
   * Prune least recently used URLs
   * @param {Object} annotations - Annotations object keyed by URL
   * @param {number} maxUrls - Maximum number of URLs to keep
   * @returns {Object} Pruned annotations object
   */
  static pruneLeastRecentlyUsedURLs(annotations, maxUrls) {
    // Sort URLs by most recent modification date
    const sortedUrls = Object.keys(annotations).sort((a, b) => {
      const aLatest = Math.max(...annotations[a].map(ann => ann.modifiedAt || ann.createdAt));
      const bLatest = Math.max(...annotations[b].map(ann => ann.modifiedAt || ann.createdAt));
      return bLatest - aLatest; // Descending order (newest first)
    });

    // Keep only the most recent URLs
    const toKeep = sortedUrls.slice(0, maxUrls);
    const pruned = {};
    toKeep.forEach(url => {
      pruned[url] = annotations[url];
    });

    return pruned;
  }

  /**
   * Get current storage usage in MB
   * @returns {Promise<number>} Storage usage in MB (formatted to 2 decimals)
   */
  static async getStorageUsage() {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytes) => {
        const mb = bytes / 1024 / 1024;
        resolve(parseFloat(mb.toFixed(2)));
      });
    });
  }

  /**
   * Get storage usage as formatted string
   * @returns {Promise<string>} Formatted string like "2.45 MB of 10 MB"
   */
  static async getStorageUsageFormatted() {
    const usage = await this.getStorageUsage();
    return `${usage} MB of ${this.LIMITS.MAX_STORAGE_MB} MB`;
  }

  /**
   * Check if storage is near limit (>80%)
   * @returns {Promise<boolean>}
   */
  static async isStorageNearLimit() {
    const usage = await this.getStorageUsage();
    return usage >= (this.LIMITS.MAX_STORAGE_MB * 0.8);
  }

  /**
   * Calculate storage space used by a single annotation
   * @param {Object} annotation - Annotation object
   * @returns {number} Approximate size in bytes
   */
  static calculateAnnotationSize(annotation) {
    // Rough estimation based on JSON stringification
    const jsonString = JSON.stringify(annotation);
    return new Blob([jsonString]).size;
  }

  /**
   * Get annotation count for a specific URL
   * @param {string} url - The URL to check
   * @returns {Promise<Object>} Object with total, text, and drawing counts
   */
  static async getAnnotationCountForURL(url) {
    const result = await chrome.storage.local.get(['annotations']);
    const annotations = result.annotations || {};
    const urlAnnotations = annotations[url] || [];

    return {
      total: urlAnnotations.length,
      text: urlAnnotations.filter(a => a.type === 'text').length,
      drawing: urlAnnotations.filter(a => a.type === 'drawing').length
    };
  }

  /**
   * Get total annotation count across all URLs
   * @returns {Promise<Object>} Object with total, text, drawing, and url counts
   */
  static async getTotalAnnotationCount() {
    const result = await chrome.storage.local.get(['annotations']);
    const annotations = result.annotations || {};

    let totalText = 0;
    let totalDrawing = 0;

    Object.values(annotations).forEach(urlAnnotations => {
      totalText += urlAnnotations.filter(a => a.type === 'text').length;
      totalDrawing += urlAnnotations.filter(a => a.type === 'drawing').length;
    });

    return {
      total: totalText + totalDrawing,
      text: totalText,
      drawing: totalDrawing,
      urls: Object.keys(annotations).length
    };
  }
}

// For Node.js testing environment (if applicable)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageHelper;
}
