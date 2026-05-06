# FaceFinder State Machine

## 🔄 Complete State Diagram

```
                    ┌─────────────────┐
                    │   APP_LOADED    │
                    │  (Empty State)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  AWAITING_IMAGE │
                    │  Upload: Empty  │
                    │  Link: Disabled │
                    │  Button: Disabled│
                    └────────┬────────┘
                             │
                    User uploads image
                             │
                    ┌────────▼────────┐
                    │ IMAGE_UPLOADING │
                    │  Progress: 0-100%│
                    │  Button: Disabled│
                    └────┬────────┬───┘
                         │        │
                    Success    Failure
                         │        │
                         │   ┌────▼────────┐
                         │   │ UPLOAD_ERROR│
                         │   │ Show: Error │
                         │   │ Action: Retry│
                         │   └────┬────────┘
                         │        │
                         │    User retries
                         │        │
                    ┌────▼────────┴───┐
                    │ IMAGE_UPLOADED  │
                    │  Upload: Success│
                    │  Link: Enabled  │
                    │  Button: Disabled│
                    └────────┬────────┘
                             │
                    User pastes link
                             │
                    ┌────────▼────────┐
                    │ LINK_VALIDATING │
                    │  Checking URL...│
                    └────┬────────┬───┘
                         │        │
                    Valid      Invalid
                         │        │
                         │   ┌────▼────────┐
                         │   │  LINK_ERROR │
                         │   │ Show: Error │
                         │   │ Action: Fix │
                         │   └────┬────────┘
                         │        │
                         │    User fixes
                         │        │
                    ┌────▼────────┴───┐
                    │   READY_STATE   │
                    │  Upload: Success│
                    │  Link: Valid    │
                    │  Button: ENABLED│
                    └────────┬────────┘
                             │
                    User clicks "Find Me"
                             │
                    ┌────────▼────────┐
                    │   PROCESSING    │
                    │  Progress: 0-100%│
                    │  Status: Updates│
                    │  Cancel: Enabled│
                    └────┬────────┬───┘
                         │        │
                    Success    Failure
                         │        │
                         │   ┌────▼────────┐
                         │   │PROCESS_ERROR│
                         │   │ Show: Error │
                         │   │ Action: Retry│
                         │   └────┬────────┘
                         │        │
                         │    User retries
                         │        │
                    ┌────▼────────┴───┐
                    │ RESULTS_READY   │
                    └────┬────────┬───┘
                         │        │
                    Matches    No Matches
                         │        │
                         │   ┌────▼────────┐
                         │   │ EMPTY_STATE │
                         │   │ Show: Tips  │
                         │   │ Action: Retry│
                         │   └────┬────────┘
                         │        │
                    ┌────▼────────┴───┐
                    │ SHOWING_RESULTS │
                    │  Display: Grid  │
                    │  Actions: D/L   │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
            User downloads      User starts new
                    │                 │
            ┌───────▼───────┐         │
            │  DOWNLOADING  │         │
            │  Progress: %  │         │
            └───────┬───────┘         │
                    │                 │
            ┌───────▼───────┐         │
            │DOWNLOAD_DONE  │         │
            │ Show: Success │         │
            └───────┬───────┘         │
                    │                 │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │   RESET_STATE   │
                    │  Clear all data │
                    └────────┬────────┘
                             │
                    Back to AWAITING_IMAGE
```

---

## 📋 State Definitions

### **1. APP_LOADED**
```javascript
{
  upload: { status: 'empty', file: null },
  link: { status: 'empty', url: '', disabled: true },
  button: { enabled: false, text: 'Find Me' },
  results: null,
  error: null
}
```

### **2. IMAGE_UPLOADING**
```javascript
{
  upload: { 
    status: 'uploading', 
    progress: 45,
    file: { name: 'photo.jpg', size: 2400000 }
  },
  link: { disabled: true },
  button: { enabled: false },
  message: 'Uploading... 45%'
}
```

### **3. IMAGE_UPLOADED**
```javascript
{
  upload: { 
    status: 'success', 
    file: { name: 'photo.jpg', preview: 'blob:...' }
  },
  link: { status: 'empty', disabled: false },
  button: { enabled: false },
  message: '✓ Photo uploaded'
}
```

### **4. UPLOAD_ERROR**
```javascript
{
  upload: { status: 'error' },
  error: {
    type: 'FILE_TOO_LARGE',
    message: 'File too large (15.2 MB)',
    suggestion: 'Please use an image under 10MB',
    action: 'retry'
  },
  button: { enabled: false }
}
```

### **5. LINK_VALIDATING**
```javascript
{
  upload: { status: 'success' },
  link: { 
    status: 'validating', 
    url: 'https://example.com/data'
  },
  button: { enabled: false },
  message: 'Checking link...'
}
```

### **6. READY_STATE**
```javascript
{
  upload: { status: 'success' },
  link: { status: 'valid', url: 'https://...' },
  button: { 
    enabled: true, 
    text: 'Find Me',
    variant: 'accent',
    pulse: true
  },
  message: '✓ Ready to search'
}
```

### **7. PROCESSING**
```javascript
{
  upload: { status: 'locked' },
  link: { status: 'locked' },
  button: { enabled: false, text: 'Finding...' },
  progress: {
    percent: 67,
    phase: 'searching',
    message: '🔎 Searching dataset...',
    timeRemaining: 15
  },
  cancelable: true
}
```

### **8. SHOWING_RESULTS**
```javascript
{
  results: {
    total: 12,
    matches: [
      {
        id: '001',
        image: 'https://...',
        confidence: 98,
        filename: 'image_0234.jpg',
        timestamp: '2024-01-15'
      },
      // ... more matches
    ],
    searchTime: 47,
    datasetSize: 1247
  },
  actions: ['download', 'newSearch']
}
```

### **9. EMPTY_STATE (No Results)**
```javascript
{
  results: {
    total: 0,
    datasetSize: 1247,
    searchTime: 52
  },
  message: {
    title: '🔍 No Matches Found',
    body: 'We searched 1,247 images but couldn\'t find any matches',
    tips: [
      'Use a clearer photo',
      'Try a different angle',
      'Check if dataset is correct'
    ]
  },
  actions: ['retryPhoto', 'retryDataset', 'startOver']
}
```

### **10. DOWNLOADING**
```javascript
{
  download: {
    status: 'active',
    type: 'bulk', // or 'single'
    progress: 65,
    current: 8,
    total: 12,
    message: 'Compressing 8 of 12 images...'
  }
}
```

---

## 🎯 Transition Rules

### **Upload Transitions**

| From State | Event | Validation | To State |
|------------|-------|------------|----------|
| AWAITING_IMAGE | file_selected | Check type, size | IMAGE_UPLOADING |
| IMAGE_UPLOADING | upload_complete | Verify integrity | IMAGE_UPLOADED |
| IMAGE_UPLOADING | upload_failed | Log error | UPLOAD_ERROR |
| UPLOAD_ERROR | retry_clicked | Clear error | AWAITING_IMAGE |
| IMAGE_UPLOADED | remove_clicked | Clear data | AWAITING_IMAGE |

### **Link Transitions**

| From State | Event | Validation | To State |
|------------|-------|------------|----------|
| IMAGE_UPLOADED | link_pasted | Check format | LINK_VALIDATING |
| LINK_VALIDATING | validation_pass | Ping URL | READY_STATE |
| LINK_VALIDATING | validation_fail | Show error | LINK_ERROR |
| LINK_ERROR | link_edited | Re-validate | LINK_VALIDATING |
| READY_STATE | link_cleared | Reset | IMAGE_UPLOADED |

### **Search Transitions**

| From State | Event | Validation | To State |
|------------|-------|------------|----------|
| READY_STATE | find_clicked | Check inputs | PROCESSING |
| PROCESSING | progress_update | Update % | PROCESSING |
| PROCESSING | search_complete | Check results | RESULTS_READY |
| PROCESSING | search_failed | Log error | PROCESS_ERROR |
| PROCESSING | cancel_clicked | Abort request | READY_STATE |
| PROCESS_ERROR | retry_clicked | Clear error | PROCESSING |

### **Results Transitions**

| From State | Event | Validation | To State |
|------------|-------|------------|----------|
| RESULTS_READY | has_matches | Count > 0 | SHOWING_RESULTS |
| RESULTS_READY | no_matches | Count = 0 | EMPTY_STATE |
| SHOWING_RESULTS | download_clicked | Check selection | DOWNLOADING |
| DOWNLOADING | download_complete | Verify file | SHOWING_RESULTS |
| SHOWING_RESULTS | new_search_clicked | Confirm | RESET_STATE |
| EMPTY_STATE | retry_clicked | Clear results | READY_STATE |

---

## 🔒 State Guards

### **Can Upload?**
```javascript
function canUpload(state) {
  return state.upload.status !== 'uploading' 
      && state.upload.status !== 'locked';
}
```

### **Can Paste Link?**
```javascript
function canPasteLink(state) {
  return state.upload.status === 'success'
      && state.link.status !== 'locked';
}
```

### **Can Search?**
```javascript
function canSearch(state) {
  return state.upload.status === 'success'
      && state.link.status === 'valid'
      && state.button.enabled === true;
}
```

### **Can Download?**
```javascript
function canDownload(state) {
  return state.results?.total > 0
      && state.download?.status !== 'active';
}
```

### **Can Cancel?**
```javascript
function canCancel(state) {
  return state.progress?.cancelable === true
      && state.progress?.percent < 95;
}
```

---

## ⚡ Side Effects

### **On IMAGE_UPLOADED**
```javascript
- Enable link input
- Show success message (3s)
- Scroll to link input
- Focus link input
- Track analytics: 'image_uploaded'
```

### **On READY_STATE**
```javascript
- Enable Find Me button
- Add pulse animation
- Show estimated time
- Track analytics: 'ready_to_search'
```

### **On PROCESSING**
```javascript
- Lock all inputs
- Start progress updates (1s interval)
- Update time estimates
- Enable cancel button
- Track analytics: 'search_started'
```

### **On SHOWING_RESULTS**
```javascript
- Scroll to results
- Animate cards in (stagger)
- Track analytics: 'results_shown', { count: N }
- Enable download actions
```

### **On DOWNLOAD_DONE**
```javascript
- Show success toast (5s)
- Track analytics: 'download_complete'
- Offer new search
```

---

## 🎨 UI State Mapping

### **Button States**

```javascript
const buttonStates = {
  AWAITING_IMAGE: {
    text: 'Find Me',
    variant: 'disabled',
    icon: null,
    tooltip: 'Upload a photo first'
  },
  IMAGE_UPLOADED: {
    text: 'Find Me',
    variant: 'disabled',
    icon: null,
    tooltip: 'Paste a dataset link'
  },
  READY_STATE: {
    text: 'Find Me',
    variant: 'accent',
    icon: 'search',
    pulse: true,
    tooltip: null
  },
  PROCESSING: {
    text: 'Finding...',
    variant: 'disabled',
    icon: 'spinner',
    tooltip: null
  },
  SHOWING_RESULTS: {
    text: 'New Search',
    variant: 'secondary',
    icon: 'refresh',
    tooltip: null
  }
};
```

### **Upload Zone States**

```javascript
const uploadStates = {
  empty: {
    border: 'dashed',
    color: 'neutral',
    icon: 'upload',
    text: 'Drop your photo here'
  },
  hover: {
    border: 'dashed',
    color: 'primary',
    icon: 'upload',
    text: 'Drop to upload'
  },
  uploading: {
    border: 'solid',
    color: 'primary',
    icon: 'spinner',
    text: 'Uploading...'
  },
  success: {
    border: 'solid',
    color: 'success',
    icon: 'check',
    text: 'Upload complete'
  },
  error: {
    border: 'solid',
    color: 'error',
    icon: 'alert',
    text: 'Upload failed'
  }
};
```

---

## 🧪 State Testing Scenarios

### **Test 1: Happy Path**
```
AWAITING_IMAGE 
  → file_selected 
  → IMAGE_UPLOADING 
  → upload_complete 
  → IMAGE_UPLOADED 
  → link_pasted 
  → LINK_VALIDATING 
  → validation_pass 
  → READY_STATE 
  → find_clicked 
  → PROCESSING 
  → search_complete 
  → SHOWING_RESULTS
```

### **Test 2: Upload Error Recovery**
```
AWAITING_IMAGE 
  → file_selected (15MB) 
  → UPLOAD_ERROR 
  → retry_clicked 
  → AWAITING_IMAGE 
  → file_selected (2MB) 
  → IMAGE_UPLOADING 
  → IMAGE_UPLOADED
```

### **Test 3: Link Error Recovery**
```
IMAGE_UPLOADED 
  → link_pasted (invalid) 
  → LINK_ERROR 
  → link_edited 
  → LINK_VALIDATING 
  → validation_pass 
  → READY_STATE
```

### **Test 4: Search Cancellation**
```
READY_STATE 
  → find_clicked 
  → PROCESSING (45%) 
  → cancel_clicked 
  → READY_STATE
```

### **Test 5: No Results Flow**
```
PROCESSING 
  → search_complete 
  → RESULTS_READY (0 matches) 
  → EMPTY_STATE 
  → retry_clicked 
  → READY_STATE
```

---

## 📊 State Persistence

### **Session Storage**
```javascript
// Save on state change
sessionStorage.setItem('facefinder_state', JSON.stringify({
  upload: state.upload,
  link: state.link,
  timestamp: Date.now()
}));

// Restore on page load
const savedState = JSON.parse(sessionStorage.getItem('facefinder_state'));
if (savedState && Date.now() - savedState.timestamp < 3600000) {
  // Restore if < 1 hour old
  restoreState(savedState);
}
```

### **What to Persist**
- ✅ Upload status (not file blob)
- ✅ Link URL
- ✅ Last search parameters
- ❌ Results (too large)
- ❌ Progress state (transient)
- ❌ Error messages (transient)

---

## 🚀 Implementation Example

```javascript
// State machine using XState or similar
const facefinderMachine = {
  id: 'facefinder',
  initial: 'awaitingImage',
  
  states: {
    awaitingImage: {
      on: {
        FILE_SELECTED: {
          target: 'imageUploading',
          guard: 'isValidFile'
        }
      }
    },
    
    imageUploading: {
      invoke: {
        src: 'uploadImage',
        onDone: 'imageUploaded',
        onError: 'uploadError'
      }
    },
    
    imageUploaded: {
      entry: ['enableLinkInput', 'focusLinkInput'],
      on: {
        LINK_PASTED: 'linkValidating',
        REMOVE_IMAGE: 'awaitingImage'
      }
    },
    
    linkValidating: {
      invoke: {
        src: 'validateLink',
        onDone: 'readyState',
        onError: 'linkError'
      }
    },
    
    readyState: {
      entry: ['enableButton', 'showEstimate'],
      on: {
        FIND_CLICKED: 'processing',
        LINK_CLEARED: 'imageUploaded'
      }
    },
    
    processing: {
      entry: ['lockInputs', 'startProgress'],
      invoke: {
        src: 'searchDataset',
        onDone: 'resultsReady',
        onError: 'processError'
      },
      on: {
        CANCEL: 'readyState'
      }
    },
    
    resultsReady: {
      always: [
        { target: 'showingResults', guard: 'hasMatches' },
        { target: 'emptyState', guard: 'noMatches' }
      ]
    },
    
    showingResults: {
      entry: ['displayResults', 'trackAnalytics'],
      on: {
        DOWNLOAD: 'downloading',
        NEW_SEARCH: 'resetState'
      }
    },
    
    emptyState: {
      entry: ['showTips', 'trackAnalytics'],
      on: {
        RETRY: 'readyState',
        START_OVER: 'resetState'
      }
    }
  }
};
```

This state machine ensures:
- ✅ No invalid transitions
- ✅ Clear error recovery
- ✅ Predictable behavior
- ✅ Easy testing
- ✅ Maintainable code
