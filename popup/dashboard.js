// Noted Dashboard - Popup Logic
// Phase 1: Basic initialization and tab switching
// Full functionality will be implemented in Phase 5

console.log('Noted: Dashboard initialized');

// State
let currentTab = 'current-page';
let currentURL = '';

const dashboardState = {
  normalizedCurrentURL: '',
  annotationIndex: {},
  currentAnnotations: [],
  allAnnotations: [],
  filters: {
    search: '',
    type: 'all',
    sort: 'newest'
  },
  allFilters: {
    search: '',
    type: 'all',
    domain: 'all',
    sort: 'newest'
  }
};

const TRACKING_PARAMS = new Set([
  'gclid', 'fbclid', 'msclkid', 'dclid', 'yclid', 'rbclickid', 'igshid',
  'mc_cid', 'mc_eid', 'cmpid', 'campaignid', 'adgroupid', 'creative',
  'creativeid', 'utm_id', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'utm_name', 'utm_creative', 'utm_place',
  '_hsenc', '_hsmi', '_ga', '_gl', 'ref', 'referrer', 'zx', 'no_sw_cr',
  's_kwcid', 'fb_source', 'spm', 'ck_subscriber_id'
]);

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Noted: Dashboard DOM loaded');

  // Get current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentURL = tab?.url || '';
    console.log('Noted: Current URL:', currentURL);
  } catch (error) {
    console.error('Noted: Error getting current tab:', error);
  }

  dashboardState.normalizedCurrentURL = normalizeURL(currentURL);
  await loadAnnotationsData();

  // Initialize tab switching
  initializeTabSwitching();

  // Initialize action buttons
  initializeActionButtons();

  // Initialize settings
  initializeSettings();

  // Initialize filters and list interactions
  initializeFilterControls();
  attachListListeners();

  // Load storage usage
  loadStorageUsage();
});

/**
 * Initialize tab switching functionality
 */
function initializeTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');

      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');

      currentTab = tabName;
      console.log('Noted: Switched to tab:', tabName);
    });
  });
}

function initializeFilterControls() {
  const searchCurrent = document.getElementById('search-input');
  const typeFilterCurrent = document.getElementById('type-filter');
  const sortCurrent = document.getElementById('sort-select');

  if (searchCurrent) {
    searchCurrent.addEventListener('input', (event) => {
      dashboardState.filters.search = event.target.value.toLowerCase();
      renderCurrentPageList();
    });
  }

  if (typeFilterCurrent) {
    typeFilterCurrent.addEventListener('change', (event) => {
      dashboardState.filters.type = event.target.value;
      renderCurrentPageList();
    });
  }

  if (sortCurrent) {
    sortCurrent.addEventListener('change', (event) => {
      dashboardState.filters.sort = event.target.value;
      renderCurrentPageList();
    });
  }

  const searchAll = document.getElementById('search-all-input');
  const domainFilter = document.getElementById('domain-filter');
  const typeFilterAll = document.getElementById('type-filter-all');
  const sortAll = document.getElementById('sort-select-all');

  if (searchAll) {
    searchAll.addEventListener('input', (event) => {
      dashboardState.allFilters.search = event.target.value.toLowerCase();
      renderAllAnnotationsList();
    });
  }

  if (domainFilter) {
    domainFilter.addEventListener('change', (event) => {
      dashboardState.allFilters.domain = event.target.value;
      renderAllAnnotationsList();
    });
  }

  if (typeFilterAll) {
    typeFilterAll.addEventListener('change', (event) => {
      dashboardState.allFilters.type = event.target.value;
      renderAllAnnotationsList();
    });
  }

  if (sortAll) {
    sortAll.addEventListener('change', (event) => {
      dashboardState.allFilters.sort = event.target.value;
      renderAllAnnotationsList();
    });
  }
}

function attachListListeners() {
  const currentList = document.getElementById('current-page-list');
  const allList = document.getElementById('all-annotations-list');

  const handler = async (event) => {
    const deleteBtn = event.target.closest('.action-button[data-action="delete"]');
    if (deleteBtn) {
      event.stopPropagation();
      const annotationId = deleteBtn.dataset.annotationId;
      if (annotationId) {
        await deleteAnnotationById(annotationId);
      }
      return;
    }
  };

  if (currentList) {
    currentList.addEventListener('click', handler);
  }

  if (allList) {
    allList.addEventListener('click', handler);
  }
}

/**
 * Initialize header action buttons
 */
function initializeActionButtons() {
  // Text mode button
  const textModeBtn = document.getElementById('text-mode-btn');
  textModeBtn.addEventListener('click', async () => {
    console.log('Noted: Text mode button clicked');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TEXT_MODE' });
      window.close(); // Close popup after activation
    } catch (error) {
      console.error('Noted: Error toggling text mode:', error);
    }
  });

  // Draw mode button
  const drawModeBtn = document.getElementById('draw-mode-btn');
  drawModeBtn.addEventListener('click', async () => {
    console.log('Noted: Draw mode button clicked');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DRAW_MODE' });
      window.close(); // Close popup after activation
    } catch (error) {
      console.error('Noted: Error toggling draw mode:', error);
    }
  });

  // New collection button
  const newCollectionBtn = document.getElementById('new-collection-btn');
  newCollectionBtn.addEventListener('click', () => {
    console.log('Noted: New collection button clicked (Phase 5)');
    // Phase 5: Show modal to create new collection
  });

  // Export button
  const exportBtn = document.getElementById('export-btn');
  exportBtn.addEventListener('click', async () => {
    console.log('Noted: Export button clicked');
    await exportAnnotations();
  });

  // Import button
  const importBtn = document.getElementById('import-btn');
  importBtn.addEventListener('click', () => {
    console.log('Noted: Import button clicked (Phase 6)');
    // Phase 6: Show file picker to import annotations
  });

  // Clear all button
  const clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    console.log('Noted: Clear all button found, attaching listener');
    clearAllBtn.addEventListener('click', async () => {
      console.log('Noted: Clear all button clicked');

      // Double-click to confirm (since confirm() doesn't work in popups)
      if (clearAllBtn.dataset.confirmPending === 'true') {
        // Second click - actually clear
        clearAllBtn.dataset.confirmPending = 'false';
        clearAllBtn.textContent = 'Clear All Annotations';
        clearAllBtn.style.background = '';
        await clearAllAnnotations();
      } else {
        // First click - ask for confirmation
        clearAllBtn.dataset.confirmPending = 'true';
        clearAllBtn.textContent = 'Click again to confirm';
        clearAllBtn.style.background = '#ff3b30';

        // Reset after 3 seconds
        setTimeout(() => {
          clearAllBtn.dataset.confirmPending = 'false';
          clearAllBtn.textContent = 'Clear All Annotations';
          clearAllBtn.style.background = '';
        }, 3000);
      }
    });
  } else {
    console.error('Noted: Clear all button not found');
  }
}

/**
 * Initialize settings functionality
 */
function initializeSettings() {
  // Load settings from storage
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || {};

    // Tab close behavior checkboxes
    const keepOnClose = document.getElementById('keep-on-close');
    const clearOnClose = document.getElementById('clear-on-close');

    if (settings.closeTabBehavior === 'keep') {
      keepOnClose.checked = true;
    } else if (settings.closeTabBehavior === 'clear') {
      clearOnClose.checked = true;
    }

    // Ensure only one checkbox is checked
    keepOnClose.addEventListener('change', () => {
      if (keepOnClose.checked) {
        clearOnClose.checked = false;
        updateSettings({ closeTabBehavior: 'keep' });
      } else {
        updateSettings({ closeTabBehavior: 'ask' });
      }
    });

    clearOnClose.addEventListener('change', () => {
      if (clearOnClose.checked) {
        keepOnClose.checked = false;
        updateSettings({ closeTabBehavior: 'clear' });
      } else {
        updateSettings({ closeTabBehavior: 'ask' });
      }
    });

    // Hotkeys display (read-only in Phase 1)
    const textHotkey = document.getElementById('text-hotkey');
    const drawHotkey = document.getElementById('draw-hotkey');

    textHotkey.value = settings.hotkeys?.textMode || 'Ctrl+Shift+T';
    drawHotkey.value = settings.hotkeys?.drawMode || 'Ctrl+Shift+D';
  });
}

/**
 * Update settings in storage
 * @param {Object} updates - Settings updates
 */
async function updateSettings(updates) {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};

    const updatedSettings = { ...settings, ...updates };
    await chrome.storage.local.set({ settings: updatedSettings });

    console.log('Noted: Settings updated:', updatedSettings);
  } catch (error) {
    console.error('Noted: Error updating settings:', error);
  }
}

/**
 * Load and display storage usage
 */
async function loadStorageUsage() {
  try {
    const bytes = await new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, resolve);
    });

    const mb = (bytes / 1024 / 1024).toFixed(2);
    const maxMB = 10;
    const percentage = Math.min((mb / maxMB) * 100, 100);

    // Update storage bar
    const storageBarFill = document.getElementById('storage-bar-fill');
    const storageText = document.getElementById('storage-text');

    storageBarFill.style.width = `${percentage}%`;
    storageText.textContent = `Using ${mb} MB of ${maxMB} MB`;

    console.log('Noted: Storage usage:', mb, 'MB');
  } catch (error) {
    console.error('Noted: Error loading storage usage:', error);
  }
}

async function loadAnnotationsData() {
  try {
    const result = await chrome.storage.local.get(['annotations', 'annotationIndex']);
    const annotationsByUrl = result.annotations || {};
    dashboardState.annotationIndex = result.annotationIndex || {};

    const currentList = annotationsByUrl[dashboardState.normalizedCurrentURL] || [];
    dashboardState.currentAnnotations = currentList.map((annotation) =>
      mapAnnotation(annotation, dashboardState.normalizedCurrentURL)
    );

    const allAnnotations = [];
    Object.entries(annotationsByUrl).forEach(([url, items]) => {
      items.forEach(annotation => {
        allAnnotations.push(mapAnnotation(annotation, url));
      });
    });
    dashboardState.allAnnotations = allAnnotations;

    const domains = Array.from(new Set(allAnnotations.map(a => a.domain).filter(Boolean))).sort();
    populateDomainFilter(domains);

    renderCurrentPageList();
    renderAllAnnotationsList();
  } catch (error) {
    console.error('Noted: Error loading annotations into dashboard:', error);
  }
}

function populateDomainFilter(domains) {
  const domainSelect = document.getElementById('domain-filter');
  if (!domainSelect) return;

  const previous = dashboardState.allFilters.domain;
  domainSelect.innerHTML = '';

  const createOption = (value, label) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  };

  domainSelect.appendChild(createOption('all', 'All Domains'));
  domains.forEach(domain => {
    domainSelect.appendChild(createOption(domain, domain));
  });

  if (previous !== 'all' && !domains.includes(previous)) {
    dashboardState.allFilters.domain = 'all';
    domainSelect.value = 'all';
  } else {
    domainSelect.value = dashboardState.allFilters.domain;
  }
}

function renderCurrentPageList() {
  const container = document.getElementById('current-page-list');
  if (!container) return;

  const filtered = filterAnnotations(dashboardState.currentAnnotations, dashboardState.filters);
  renderAnnotationList(container, filtered, {
    icon: '📄',
    title: 'No annotations on this page.',
    subtitle: 'Start annotating!'
  }, { showDomain: false });
}

function renderAllAnnotationsList() {
  const container = document.getElementById('all-annotations-list');
  if (!container) return;

  const filtered = filterAnnotations(dashboardState.allAnnotations, dashboardState.allFilters);
  renderAnnotationList(container, filtered, {
    icon: '📚',
    title: 'No annotations yet.',
    subtitle: 'Annotate any webpage to get started!'
  }, { showDomain: true });
}

function renderAnnotationList(container, annotations, emptyState, options = {}) {
  container.innerHTML = '';

  if (!annotations.length) {
    container.appendChild(createEmptyState(emptyState.icon, emptyState.title, emptyState.subtitle));
    return;
  }

  const fragment = document.createDocumentFragment();
  annotations.forEach(annotation => {
    fragment.appendChild(createAnnotationItem(annotation, options));
  });
  container.appendChild(fragment);
}

function createAnnotationItem(annotation, options = {}) {
  const { showDomain = false } = options;
  const item = document.createElement('div');
  item.className = 'annotation-item';
  item.dataset.annotationId = annotation.id;
  item.dataset.normalizedUrl = annotation.normalizedUrl;

  const icon = document.createElement('div');
  icon.className = 'annotation-icon';
  icon.textContent = annotation.type === 'text' ? '📝' : '✏️';

  const content = document.createElement('div');
  content.className = 'annotation-content';

  const title = document.createElement('div');
  title.className = 'annotation-title';
  title.textContent = annotation.title;

  const meta = document.createElement('div');
  meta.className = 'annotation-meta';
  const metaParts = [];
  if (showDomain && annotation.domain) {
    metaParts.push(annotation.domain);
  }
  metaParts.push(annotation.type === 'text' ? 'Text annotation' : 'Drawing');
  if (annotation.modifiedAt) {
    metaParts.push(`Updated ${formatTimestamp(annotation.modifiedAt)}`);
  }
  meta.textContent = metaParts.join(' • ');

  content.appendChild(title);
  content.appendChild(meta);

  if (annotation.snippet) {
    const snippet = document.createElement('div');
    snippet.className = 'annotation-snippet';
    snippet.textContent = annotation.snippet;
    content.appendChild(snippet);
  }

  const actions = document.createElement('div');
  actions.className = 'annotation-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-button';
  deleteBtn.dataset.action = 'delete';
  deleteBtn.dataset.annotationId = annotation.id;
  deleteBtn.title = 'Delete annotation';
  deleteBtn.textContent = '🗑';

  actions.appendChild(deleteBtn);

  item.appendChild(icon);
  item.appendChild(content);
  item.appendChild(actions);

  return item;
}

function createEmptyState(iconText, title, subtitle) {
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';

  const icon = document.createElement('div');
  icon.className = 'empty-icon';
  icon.textContent = iconText;

  const titleEl = document.createElement('p');
  titleEl.className = 'empty-text';
  titleEl.textContent = title;

  const subtitleEl = document.createElement('p');
  subtitleEl.className = 'empty-subtext';
  subtitleEl.textContent = subtitle;

  wrapper.appendChild(icon);
  wrapper.appendChild(titleEl);
  wrapper.appendChild(subtitleEl);
  return wrapper;
}

function filterAnnotations(list, filters) {
  const searchTerm = filters.search?.trim() || '';
  const typeFilter = filters.type || 'all';
  const domainFilter = filters.domain || 'all';

  const filtered = list.filter(annotation => {
    if (typeFilter !== 'all' && annotation.type !== typeFilter) {
      return false;
    }

    if (domainFilter !== 'all' && annotation.domain !== domainFilter) {
      return false;
    }

    if (searchTerm) {
      const haystack = `${annotation.title} ${annotation.snippet}`.toLowerCase();
      if (!haystack.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  return filtered.sort((a, b) => sortAnnotations(a, b, filters.sort));
}

function sortAnnotations(a, b, sortKey = 'newest') {
  switch (sortKey) {
    case 'oldest':
      return (a.createdAt || 0) - (b.createdAt || 0);
    case 'a-z':
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    case 'z-a':
      return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
    case 'modified':
    case 'newest':
    default:
      return (b.modifiedAt || b.createdAt || 0) - (a.modifiedAt || a.createdAt || 0);
  }
}

function mapAnnotation(annotation, normalizedUrl) {
  const createdAt = annotation.createdAt || annotation.timestamp || 0;
  const modifiedAt = annotation.modifiedAt || createdAt;
  let domain = '';

  try {
    const urlObj = new URL(normalizedUrl);
    domain = urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    console.warn('Noted: Unable to parse URL for domain', normalizedUrl, error);
  }

  return {
    id: annotation.id,
    type: annotation.type,
    annotation,
    normalizedUrl,
    domain,
    createdAt,
    modifiedAt,
    title: getAnnotationTitle(annotation),
    snippet: getAnnotationSnippet(annotation)
  };
}

function getAnnotationTitle(annotation) {
  if (annotation.type === 'text') {
    const text = extractPlainText(annotation.content?.text || '');
    return text ? text.slice(0, 60) : 'Text Annotation';
  }

  const color = annotation.content?.strokeColor || '#000000';
  return `Drawing (${color.toUpperCase()})`;
}

function getAnnotationSnippet(annotation) {
  if (annotation.type === 'text') {
    const text = extractPlainText(annotation.content?.text || '');
    return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  }

  const points = annotation.content?.points?.length || 0;
  const width = annotation.content?.strokeWidth || 0;
  return `Stroke width ${width}px • ${points} points`;
}

function extractPlainText(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent?.trim() || '';
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'unknown';
  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    console.warn('Noted: Failed to format timestamp', timestamp, error);
    return 'unknown';
  }
}

function normalizeURL(urlString) {
  try {
    const url = new URL(urlString);
    const params = new URLSearchParams(url.search);

    Array.from(params.keys()).forEach((key) => {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey.startsWith('utm_') || TRACKING_PARAMS.has(normalizedKey)) {
        params.delete(key);
      }
    });

    const cleanedSearch = params.toString();
    url.search = cleanedSearch ? `?${cleanedSearch}` : '';

    return url.toString();
  } catch (error) {
    console.warn('Noted: Failed to normalize URL in dashboard', error);
    return urlString;
  }
}

async function deleteAnnotationById(annotationId) {
  try {
    const result = await chrome.storage.local.get(['annotations', 'annotationIndex']);
    const annotations = result.annotations || {};
    const annotationIndex = result.annotationIndex || {};
    const targetUrl = annotationIndex[annotationId];

    if (!targetUrl || !annotations[targetUrl]) {
      console.warn('Noted: Annotation ID not found:', annotationId);
      return;
    }

    annotations[targetUrl] = annotations[targetUrl].filter(annotation => annotation.id !== annotationId);
    if (annotations[targetUrl].length === 0) {
      delete annotations[targetUrl];
    }

    delete annotationIndex[annotationId];

    await chrome.storage.local.set({ annotations, annotationIndex });
    await notifyActiveTabAnnotationsUpdated();
    await loadAnnotationsData();
    loadStorageUsage();
  } catch (error) {
    console.error('Noted: Error deleting annotation:', error);
    alert('Error deleting annotation. Please try again.');
  }
}

async function notifyActiveTabAnnotationsUpdated() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length) {
      await chrome.tabs.sendMessage(tabs[0].id, { type: 'ANNOTATIONS_UPDATED' });
    }
  } catch (error) {
    console.warn('Noted: Unable to notify active tab about annotation updates', error);
  }
}

/**
 * Export annotations as JSON
 */
async function exportAnnotations() {
  try {
    const result = await chrome.storage.local.get(['annotations', 'collections', 'settings']);

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      annotations: result.annotations || {},
      collections: result.collections || {},
      settings: result.settings || {}
    };

    // Create blob and download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `noted-annotations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Noted: Annotations exported');
  } catch (error) {
    console.error('Noted: Error exporting annotations:', error);
    alert('Error exporting annotations. Please try again.');
  }
}

/**
 * Clear all annotations
 */
async function clearAllAnnotations() {
  try {
    console.log('Noted: Clearing all annotations...');
    await chrome.storage.local.set({
      annotations: {},
      collections: {},
      annotationIndex: {}
    });

    console.log('Noted: All annotations cleared from storage');
    alert('All annotations have been cleared.');

    // Reload storage usage
    await loadAnnotationsData();
    loadStorageUsage();
    await notifyActiveTabAnnotationsUpdated();
  } catch (error) {
    console.error('Noted: Error clearing annotations:', error);
    alert('Error clearing annotations. Please try again.');
  }
}
