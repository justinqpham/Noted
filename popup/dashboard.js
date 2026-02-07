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
  collections: {},
  activeCollectionId: null,
  undoStack: [],
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

  // Load collections first so annotation cards can show collection tags
  initializeCollections();
  await loadCollections();

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
    // Add to collection
    const addBtn = event.target.closest('.action-button[data-action="add-to-collection"]');
    if (addBtn) {
      event.stopPropagation();
      showCollectionDropdown(addBtn, addBtn.dataset.annotationId);
      return;
    }

    const deleteBtn = event.target.closest('.action-button[data-action="delete"]');
    if (deleteBtn) {
      event.stopPropagation();
      const annotationId = deleteBtn.dataset.annotationId;
      if (annotationId) {
        await deleteAnnotationById(annotationId);
      }
      return;
    }

    // Click on annotation item to navigate/scroll
    const item = event.target.closest('.annotation-item');
    if (item) {
      const annotationId = item.dataset.annotationId;
      const normalizedUrl = item.dataset.normalizedUrl;
      if (annotationId && normalizedUrl) {
        await navigateToAnnotation(annotationId, normalizedUrl);
      }
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

  // Phase 6: Export button (SVG or PNG based on settings)
  const exportSvgBtn = document.getElementById('export-svg-btn');
  if (exportSvgBtn) {
    exportSvgBtn.addEventListener('click', async () => {
      try {
        const result = await chrome.storage.local.get(['settings']);
        const format = result.settings?.exportFormat || 'svg';
        console.log('Noted: Export button clicked, format:', format);
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, { type: 'EXPORT_ANNOTATIONS', format });
          window.close();
        }
      } catch (error) {
        console.error('Noted: Error triggering export:', error);
      }
    });
  }

  // Phase 7: Share button
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      console.log('Noted: Share button clicked');
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GENERATE_SHARE_LINK' });
          if (response?.shareUrl) {
            await navigator.clipboard.writeText(response.shareUrl);
            shareBtn.textContent = '✓';
            shareBtn.title = 'Link copied!';
            setTimeout(() => {
              shareBtn.textContent = '🔗';
              shareBtn.title = 'Share Annotations';
            }, 2000);
          } else {
            shareBtn.title = 'No annotations to share';
            setTimeout(() => { shareBtn.title = 'Share Annotations'; }, 2000);
          }
        }
      } catch (error) {
        console.error('Noted: Error generating share link:', error);
      }
    });
  }

  // New collection button — handled by initializeCollections()

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

  // Undo delete buttons (Current Page + All Annotations tabs)
  const undoDeleteBtn = document.getElementById('undo-delete-btn');
  if (undoDeleteBtn) {
    undoDeleteBtn.addEventListener('click', async () => {
      await undoDelete();
    });
  }

  const undoDeleteAllBtn = document.getElementById('undo-delete-all-btn');
  if (undoDeleteAllBtn) {
    undoDeleteAllBtn.addEventListener('click', async () => {
      await undoDelete();
    });
  }

  // Clear Page button (Current Page tab)
  const clearPageBtn = document.getElementById('clear-page-btn');
  if (clearPageBtn) {
    clearPageBtn.addEventListener('click', async () => {
      if (clearPageBtn.dataset.confirmPending === 'true') {
        clearPageBtn.dataset.confirmPending = 'false';
        clearPageBtn.textContent = 'Clear Page';
        clearPageBtn.style.background = '';
        clearPageBtn.style.color = '';
        clearPageBtn.style.borderColor = '';
        await clearCurrentPageAnnotations();
      } else {
        clearPageBtn.dataset.confirmPending = 'true';
        clearPageBtn.textContent = 'Click to confirm';
        clearPageBtn.style.background = '#ff3b30';
        clearPageBtn.style.color = 'white';
        clearPageBtn.style.borderColor = '#ff3b30';
        setTimeout(() => {
          clearPageBtn.dataset.confirmPending = 'false';
          clearPageBtn.textContent = 'Clear Page';
          clearPageBtn.style.background = '';
          clearPageBtn.style.color = '';
          clearPageBtn.style.borderColor = '';
        }, 3000);
      }
    });
  }

  // Clear All button (All Annotations tab)
  const clearAllAnnotationsBtn = document.getElementById('clear-all-annotations-btn');
  if (clearAllAnnotationsBtn) {
    clearAllAnnotationsBtn.addEventListener('click', async () => {
      if (clearAllAnnotationsBtn.dataset.confirmPending === 'true') {
        clearAllAnnotationsBtn.dataset.confirmPending = 'false';
        clearAllAnnotationsBtn.textContent = 'Clear All';
        clearAllAnnotationsBtn.style.background = '';
        clearAllAnnotationsBtn.style.color = '';
        clearAllAnnotationsBtn.style.borderColor = '';
        await clearAllAnnotations();
      } else {
        clearAllAnnotationsBtn.dataset.confirmPending = 'true';
        clearAllAnnotationsBtn.textContent = 'Click to confirm';
        clearAllAnnotationsBtn.style.background = '#ff3b30';
        clearAllAnnotationsBtn.style.color = 'white';
        clearAllAnnotationsBtn.style.borderColor = '#ff3b30';
        setTimeout(() => {
          clearAllAnnotationsBtn.dataset.confirmPending = 'false';
          clearAllAnnotationsBtn.textContent = 'Clear All';
          clearAllAnnotationsBtn.style.background = '';
          clearAllAnnotationsBtn.style.color = '';
          clearAllAnnotationsBtn.style.borderColor = '';
        }, 3000);
      }
    });
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

    // Hotkey inputs — click to record new shortcut
    const textHotkey = document.getElementById('text-hotkey');
    const drawHotkey = document.getElementById('draw-hotkey');

    textHotkey.value = settings.hotkeys?.textMode || 'Ctrl+Shift+T';
    drawHotkey.value = settings.hotkeys?.drawMode || 'Ctrl+Shift+D';

    setupHotkeyInput(textHotkey, 'textMode');
    setupHotkeyInput(drawHotkey, 'drawMode');

    // Export format
    const exportFormatSelect = document.getElementById('export-format-select');
    if (exportFormatSelect) {
      exportFormatSelect.value = settings.exportFormat || 'svg';
      updateExportButton(exportFormatSelect.value);

      exportFormatSelect.addEventListener('change', () => {
        updateSettings({ exportFormat: exportFormatSelect.value });
        updateExportButton(exportFormatSelect.value);
      });
    }
  });
}

/**
 * Update export button tooltip to reflect chosen format
 */
function updateExportButton(format) {
  const btn = document.getElementById('export-svg-btn');
  if (btn) {
    btn.title = format === 'png' ? 'Export as PNG' : 'Export as SVG';
  }
}

/**
 * Set up a hotkey input to record key combinations on click
 * @param {HTMLInputElement} input - The hotkey input element
 * @param {string} mode - 'textMode' or 'drawMode'
 */
function setupHotkeyInput(input, mode) {
  let captured = false;

  input.addEventListener('click', () => {
    captured = false;
    input.dataset.originalValue = input.value;
    input.value = 'Press keys...';
    input.removeAttribute('readonly');
    input.style.borderColor = 'var(--accent-blue)';
    input.style.background = 'var(--primary-bg)';
    input.style.color = 'var(--accent-blue)';
    input.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1)';
  });

  input.addEventListener('keydown', (e) => {
    if (input.getAttribute('readonly') !== null) return;

    e.preventDefault();
    e.stopPropagation();

    // Ignore modifier-only presses
    if (['Control', 'Shift', 'Alt', 'Meta', 'OS'].includes(e.key)) return;

    // Require at least one modifier
    if (!e.ctrlKey && !e.shiftKey && !e.altKey) return;

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    parts.push(e.key.toUpperCase());

    const combo = parts.join('+');
    input.value = combo;
    captured = true;

    // Save hotkey (preserve the other mode's value)
    saveHotkey(mode, combo);
    input.setAttribute('readonly', '');
    resetHotkeyInputStyle(input);
  });

  input.addEventListener('blur', () => {
    if (!captured && !input.getAttribute('readonly')) {
      input.value = input.dataset.originalValue || (mode === 'textMode' ? 'Ctrl+Shift+T' : 'Ctrl+Shift+D');
    }
    input.setAttribute('readonly', '');
    resetHotkeyInputStyle(input);
  });
}

function resetHotkeyInputStyle(input) {
  input.style.borderColor = '';
  input.style.background = '';
  input.style.color = '';
  input.style.boxShadow = '';
}

/**
 * Save a single hotkey binding, preserving the other mode's value
 */
async function saveHotkey(mode, combo) {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    const hotkeys = settings.hotkeys || {
      textMode: 'Ctrl+Shift+T',
      drawMode: 'Ctrl+Shift+D'
    };
    hotkeys[mode] = combo;
    await updateSettings({ hotkeys });
    console.log(`Noted: Hotkey updated — ${mode}: ${combo}`);
  } catch (error) {
    console.error('Noted: Error saving hotkey:', error);
  }
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

  // Show collection membership tags
  const collectionNames = getCollectionNamesForAnnotation(annotation.id);
  if (collectionNames.length) {
    const tagsRow = document.createElement('div');
    tagsRow.className = 'annotation-collection-tags';
    collectionNames.forEach(name => {
      const tag = document.createElement('span');
      tag.className = 'collection-tag';
      tag.textContent = name;
      tagsRow.appendChild(tag);
    });
    content.appendChild(tagsRow);
  }

  const actions = document.createElement('div');
  actions.className = 'annotation-actions';
  actions.style.position = 'relative';

  const addToCollectionBtn = document.createElement('button');
  addToCollectionBtn.className = 'action-button';
  addToCollectionBtn.dataset.action = 'add-to-collection';
  addToCollectionBtn.dataset.annotationId = annotation.id;
  addToCollectionBtn.title = 'Add to collection';
  addToCollectionBtn.textContent = '📁';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-button';
  deleteBtn.dataset.action = 'delete';
  deleteBtn.dataset.annotationId = annotation.id;
  deleteBtn.title = 'Delete annotation';
  deleteBtn.textContent = '🗑';

  actions.appendChild(addToCollectionBtn);
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

// ========================================================
// Undo Stack
// ========================================================

/**
 * Save a snapshot of current annotations/index before a destructive operation
 */
function pushUndoSnapshot(annotations, annotationIndex) {
  dashboardState.undoStack.push({
    annotations: JSON.parse(JSON.stringify(annotations)),
    annotationIndex: JSON.parse(JSON.stringify(annotationIndex))
  });
  if (dashboardState.undoStack.length > 20) dashboardState.undoStack.shift();
  updateUndoButtons();
}

/**
 * Restore the most recent undo snapshot
 */
async function undoDelete() {
  const snapshot = dashboardState.undoStack.pop();
  if (!snapshot) return;

  await chrome.storage.local.set({
    annotations: snapshot.annotations,
    annotationIndex: snapshot.annotationIndex
  });
  await loadAnnotationsData();
  loadStorageUsage();
  await notifyActiveTabAnnotationsUpdated();
  updateUndoButtons();
}

/**
 * Enable/disable all undo buttons based on stack
 */
function updateUndoButtons() {
  const hasUndo = dashboardState.undoStack.length > 0;
  const undoBtn = document.getElementById('undo-delete-btn');
  const undoAllBtn = document.getElementById('undo-delete-all-btn');
  if (undoBtn) undoBtn.disabled = !hasUndo;
  if (undoAllBtn) undoAllBtn.disabled = !hasUndo;
}

/**
 * Clear annotations for the current page only
 */
async function clearCurrentPageAnnotations() {
  try {
    const result = await chrome.storage.local.get(['annotations', 'annotationIndex']);
    const annotations = result.annotations || {};
    const annotationIndex = result.annotationIndex || {};

    const url = dashboardState.normalizedCurrentURL;
    if (!annotations[url] || annotations[url].length === 0) return;

    pushUndoSnapshot(annotations, annotationIndex);

    annotations[url].forEach(a => delete annotationIndex[a.id]);
    delete annotations[url];

    await chrome.storage.local.set({ annotations, annotationIndex });
    await loadAnnotationsData();
    loadStorageUsage();
    await notifyActiveTabAnnotationsUpdated();
  } catch (error) {
    console.error('Noted: Error clearing current page annotations:', error);
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

    pushUndoSnapshot(annotations, annotationIndex);

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

/**
 * Navigate to an annotation — scroll if on current page, otherwise open the URL
 */
async function navigateToAnnotation(annotationId, normalizedUrl) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentNormalized = dashboardState.normalizedCurrentURL;

    if (normalizedUrl === currentNormalized) {
      // Same page — scroll to annotation
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SCROLL_TO_ANNOTATION',
        annotationId
      });
      window.close();
    } else {
      // Different page — navigate there
      await chrome.tabs.update(tab.id, { url: normalizedUrl });
      window.close();
    }
  } catch (error) {
    console.error('Noted: Error navigating to annotation:', error);
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
    const result = await chrome.storage.local.get(['annotations', 'annotationIndex']);
    pushUndoSnapshot(result.annotations || {}, result.annotationIndex || {});

    await chrome.storage.local.set({
      annotations: {},
      collections: {},
      annotationIndex: {}
    });

    console.log('Noted: All annotations cleared from storage');
    alert('All annotations have been cleared.');

    // Reload storage usage
    await loadAnnotationsData();
    await loadCollections();
    loadStorageUsage();
    await notifyActiveTabAnnotationsUpdated();
  } catch (error) {
    console.error('Noted: Error clearing annotations:', error);
    alert('Error clearing annotations. Please try again.');
  }
}

// ========================================================
// Collections
// ========================================================

/**
 * Initialize collections UI event handlers
 */
function initializeCollections() {
  const newBtn = document.getElementById('new-collection-btn');
  const createForm = document.getElementById('collection-create-form');
  const nameInput = document.getElementById('collection-name-input');
  const saveBtn = document.getElementById('collection-save-btn');
  const cancelBtn = document.getElementById('collection-cancel-btn');
  const backBtn = document.getElementById('collection-back-btn');

  newBtn.addEventListener('click', () => {
    createForm.style.display = '';
    nameInput.value = '';
    nameInput.focus();
  });

  cancelBtn.addEventListener('click', () => {
    createForm.style.display = 'none';
  });

  saveBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    await createCollection(name);
    createForm.style.display = 'none';
  });

  nameInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const name = nameInput.value.trim();
      if (!name) return;
      await createCollection(name);
      createForm.style.display = 'none';
    } else if (e.key === 'Escape') {
      createForm.style.display = 'none';
    }
  });

  backBtn.addEventListener('click', () => {
    dashboardState.activeCollectionId = null;
    document.getElementById('collections-detail-view').style.display = 'none';
    document.getElementById('collections-list-view').style.display = '';
  });

  // Delegated click handler for collections list
  const collectionsList = document.getElementById('collections-list');
  collectionsList.addEventListener('click', async (event) => {
    const deleteBtn = event.target.closest('.action-button[data-action="delete-collection"]');
    if (deleteBtn) {
      event.stopPropagation();
      await deleteCollection(deleteBtn.dataset.collectionId);
      return;
    }

    const item = event.target.closest('.collection-item');
    if (item) {
      openCollectionDetail(item.dataset.collectionId);
    }
  });

  // Delegated click handler for collection detail annotations
  const detailList = document.getElementById('collection-annotations-list');
  detailList.addEventListener('click', async (event) => {
    const removeBtn = event.target.closest('.action-button[data-action="remove-from-collection"]');
    if (removeBtn) {
      event.stopPropagation();
      await removeFromCollection(dashboardState.activeCollectionId, removeBtn.dataset.annotationId);
      return;
    }

    const item = event.target.closest('.annotation-item');
    if (item) {
      const annotationId = item.dataset.annotationId;
      const normalizedUrl = item.dataset.normalizedUrl;
      if (annotationId && normalizedUrl) {
        await navigateToAnnotation(annotationId, normalizedUrl);
      }
    }
  });

  // Close any open collection dropdown when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.collection-dropdown') && !e.target.closest('.action-button[data-action="add-to-collection"]')) {
      document.querySelectorAll('.collection-dropdown').forEach(d => d.remove());
    }
  });
}

/**
 * Load collections from storage
 */
async function loadCollections() {
  try {
    const result = await chrome.storage.local.get(['collections']);
    dashboardState.collections = result.collections || {};
    renderCollectionsList();
  } catch (error) {
    console.error('Noted: Error loading collections:', error);
  }
}

/**
 * Save collections to storage
 */
async function saveCollections() {
  await chrome.storage.local.set({ collections: dashboardState.collections });
}

/**
 * Create a new collection
 */
async function createCollection(name) {
  const id = crypto.randomUUID().slice(0, 12);
  dashboardState.collections[id] = {
    id,
    name,
    createdAt: Date.now(),
    annotationIds: []
  };
  await saveCollections();
  renderCollectionsList();
  console.log('Noted: Collection created:', name);
}

/**
 * Delete a collection
 */
async function deleteCollection(collectionId) {
  delete dashboardState.collections[collectionId];
  await saveCollections();
  renderCollectionsList();
  console.log('Noted: Collection deleted:', collectionId);
}

/**
 * Add annotation to a collection
 */
async function addToCollection(collectionId, annotationId) {
  const collection = dashboardState.collections[collectionId];
  if (!collection) return;
  if (collection.annotationIds.includes(annotationId)) return;
  collection.annotationIds.push(annotationId);
  await saveCollections();
  renderCollectionsList();
  updateAnnotationCollectionTags(annotationId);
  console.log('Noted: Added annotation to collection:', collection.name);
}

/**
 * Remove annotation from a collection
 */
async function removeFromCollection(collectionId, annotationId) {
  const collection = dashboardState.collections[collectionId];
  if (!collection) return;
  collection.annotationIds = collection.annotationIds.filter(id => id !== annotationId);
  await saveCollections();
  if (dashboardState.activeCollectionId === collectionId) {
    renderCollectionDetail(collectionId);
  }
  renderCollectionsList();
  updateAnnotationCollectionTags(annotationId);
}

/**
 * Render the collections list
 */
function renderCollectionsList() {
  const container = document.getElementById('collections-list');
  container.innerHTML = '';

  const collections = Object.values(dashboardState.collections);
  if (!collections.length) {
    container.appendChild(createEmptyState('📁', 'No collections yet.', 'Organize your annotations!'));
    return;
  }

  // Sort by creation date (newest first)
  collections.sort((a, b) => b.createdAt - a.createdAt);

  const fragment = document.createDocumentFragment();
  collections.forEach(collection => {
    const item = document.createElement('div');
    item.className = 'collection-item';
    item.dataset.collectionId = collection.id;

    const icon = document.createElement('div');
    icon.className = 'collection-item-icon';
    icon.textContent = '📁';

    const content = document.createElement('div');
    content.className = 'collection-item-content';

    const name = document.createElement('div');
    name.className = 'collection-item-name';
    name.textContent = collection.name;

    const count = document.createElement('div');
    count.className = 'collection-item-count';
    const n = collection.annotationIds.length;
    count.textContent = `${n} annotation${n !== 1 ? 's' : ''}`;

    content.appendChild(name);
    content.appendChild(count);

    const actions = document.createElement('div');
    actions.className = 'collection-item-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-button';
    deleteBtn.dataset.action = 'delete-collection';
    deleteBtn.dataset.collectionId = collection.id;
    deleteBtn.title = 'Delete collection';
    deleteBtn.textContent = '🗑';
    actions.appendChild(deleteBtn);

    item.appendChild(icon);
    item.appendChild(content);
    item.appendChild(actions);

    fragment.appendChild(item);
  });

  container.appendChild(fragment);
}

/**
 * Open collection detail view
 */
function openCollectionDetail(collectionId) {
  const collection = dashboardState.collections[collectionId];
  if (!collection) return;

  dashboardState.activeCollectionId = collectionId;
  document.getElementById('collections-list-view').style.display = 'none';
  document.getElementById('collections-detail-view').style.display = '';
  document.getElementById('collection-detail-name').textContent = collection.name;

  renderCollectionDetail(collectionId);
}

/**
 * Render annotations inside a collection detail view
 */
function renderCollectionDetail(collectionId) {
  const container = document.getElementById('collection-annotations-list');
  container.innerHTML = '';

  const collection = dashboardState.collections[collectionId];
  if (!collection) return;

  // Resolve annotation IDs to mapped annotations
  const annotations = collection.annotationIds
    .map(id => dashboardState.allAnnotations.find(a => a.id === id))
    .filter(Boolean);

  if (!annotations.length) {
    container.appendChild(createEmptyState('📄', 'No annotations in this collection.', 'Add annotations from the other tabs.'));
    return;
  }

  const fragment = document.createDocumentFragment();
  annotations.forEach(annotation => {
    const item = createAnnotationItem(annotation, { showDomain: true });
    // Replace the add-to-collection button with a remove button
    const addBtn = item.querySelector('.action-button[data-action="add-to-collection"]');
    if (addBtn) {
      addBtn.dataset.action = 'remove-from-collection';
      addBtn.dataset.annotationId = annotation.id;
      addBtn.title = 'Remove from collection';
      addBtn.textContent = '➖';
    }
    fragment.appendChild(item);
  });

  container.appendChild(fragment);
}

/**
 * Show dropdown to pick a collection for an annotation
 */
function showCollectionDropdown(buttonEl, annotationId) {
  // Remove existing dropdowns
  document.querySelectorAll('.collection-dropdown').forEach(d => d.remove());

  const collections = Object.values(dashboardState.collections);

  const dropdown = document.createElement('div');
  dropdown.className = 'collection-dropdown';

  if (!collections.length) {
    const empty = document.createElement('div');
    empty.className = 'collection-dropdown-empty';
    empty.textContent = 'No collections — create one first';
    dropdown.appendChild(empty);
  } else {
    collections.forEach(collection => {
      const option = document.createElement('div');
      option.className = 'collection-dropdown-item';

      const isIn = collection.annotationIds.includes(annotationId);
      if (isIn) {
        option.classList.add('in-collection');
        option.textContent = `✓ ${collection.name}`;
      } else {
        option.textContent = collection.name;
      }

      option.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (isIn) {
          await removeFromCollection(collection.id, annotationId);
        } else {
          await addToCollection(collection.id, annotationId);
        }
        dropdown.remove();
      });

      dropdown.appendChild(option);
    });
  }

  buttonEl.parentElement.appendChild(dropdown);
}

/**
 * Get collection names that contain a given annotation
 */
function getCollectionNamesForAnnotation(annotationId) {
  return Object.values(dashboardState.collections)
    .filter(c => c.annotationIds.includes(annotationId))
    .map(c => c.name);
}

/**
 * Update collection tags on all visible cards for a given annotation
 */
function updateAnnotationCollectionTags(annotationId) {
  const cards = document.querySelectorAll(`.annotation-item[data-annotation-id="${annotationId}"]`);
  const collectionNames = getCollectionNamesForAnnotation(annotationId);

  cards.forEach(card => {
    const content = card.querySelector('.annotation-content');
    if (!content) return;

    // Remove existing tags row
    const existing = content.querySelector('.annotation-collection-tags');
    if (existing) existing.remove();

    // Add new tags if any
    if (collectionNames.length) {
      const tagsRow = document.createElement('div');
      tagsRow.className = 'annotation-collection-tags';
      collectionNames.forEach(name => {
        const tag = document.createElement('span');
        tag.className = 'collection-tag';
        tag.textContent = name;
        tagsRow.appendChild(tag);
      });
      content.appendChild(tagsRow);
    }
  });
}
