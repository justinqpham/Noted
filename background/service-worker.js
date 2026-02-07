// Background Service Worker for Noted Extension
// Handles tab management, storage events, and cross-tab communication

import { SyncManager } from './sync-manager.js';

console.log('Noted: Service worker initialized');

// Initialize sync manager
const syncManager = new SyncManager();

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Noted: Extension installed');

    // Initialize default settings
    chrome.storage.local.set({
      settings: {
        closeTabBehavior: 'ask',
        hotkeys: {
          textMode: 'Ctrl+Shift+T',
          drawMode: 'Ctrl+Shift+D'
        },
        defaultTextColor: '#FFEB3B',
        defaultStrokeColor: '#FFEB3B',
        defaultStrokeWidth: 4
      },
      annotations: {},
      collections: {},
      annotationIndex: {}
    });
  }
});

// Listen for keyboard commands
chrome.commands.onCommand.addListener((command) => {
  console.log('Noted: Command received:', command);

  if (command === 'activate-text-mode') {
    notifyActiveTab({ type: 'TOGGLE_TEXT_MODE' });
  } else if (command === 'activate-draw-mode') {
    notifyActiveTab({ type: 'TOGGLE_DRAW_MODE' });
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Noted: Message received:', message.type);

  switch (message.type) {
    case 'ACTIVATE_TEXT_MODE':
    case 'TOGGLE_TEXT_MODE':
      notifyActiveTab({ type: 'TOGGLE_TEXT_MODE' });
      break;

    case 'ACTIVATE_DRAW_MODE':
    case 'TOGGLE_DRAW_MODE':
      notifyActiveTab({ type: 'TOGGLE_DRAW_MODE' });
      break;

    case 'SAVE_ANNOTATION':
      handleSaveAnnotation(message.annotation, sendResponse);
      return true; // Will respond asynchronously

    case 'GET_ANNOTATIONS':
      handleGetAnnotations(message.url, sendResponse);
      return true; // Will respond asynchronously

    default:
      console.warn('Noted: Unknown message type:', message.type);
  }
});

// Listen for tab closures
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log('Noted: Tab closed:', tabId);

  // Get tab URL before it's completely removed
  // Note: In practice, we need to track tab URLs ourselves since
  // chrome.tabs.get won't work after tab is removed
  // This will be implemented fully in Phase 6
});

// Helper function to notify the active tab
async function notifyActiveTab(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, message);
    }
  } catch (error) {
    console.error('Noted: Error notifying active tab:', error);
  }
}

// Handle saving annotations
async function handleSaveAnnotation(annotation, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['annotations', 'annotationIndex']);
    const annotations = result.annotations || {};
    const annotationIndex = result.annotationIndex || {};

    const url = annotation.url;
    if (!annotations[url]) {
      annotations[url] = [];
    }

    // Check if annotation exists (update) or is new (create)
    const existingIndex = annotations[url].findIndex(a => a.id === annotation.id);
    if (existingIndex >= 0) {
      annotations[url][existingIndex] = annotation;
    } else {
      annotations[url].push(annotation);
    }

    // Update index
    annotationIndex[annotation.id] = url;

    // Save to storage
    await chrome.storage.local.set({ annotations, annotationIndex });

    sendResponse({ success: true });
  } catch (error) {
    console.error('Noted: Error saving annotation:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle getting annotations for a URL
async function handleGetAnnotations(url, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['annotations']);
    const annotations = result.annotations || {};
    sendResponse({ annotations: annotations[url] || [] });
  } catch (error) {
    console.error('Noted: Error getting annotations:', error);
    sendResponse({ annotations: [] });
  }
}
