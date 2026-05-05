# FaceFinder Component Architecture

## 📁 Directory Structure

```
facefinderai/
├── app/
│   ├── layout.tsx              # Root layout with fonts
│   ├── page.tsx                # Main page (original)
│   ├── page-refactored.tsx     # Refactored page with new components
│   └── globals.css             # Global styles
├── components/
│   ├── ui/                     # Reusable UI primitives
│   │   ├── Button.tsx          # Button with variants
│   │   ├── Badge.tsx           # Status badges
│   │   ├── ProgressBar.tsx     # Progress indicator
│   │   └── ToastNotification.tsx # Toast messages
│   ├── features/               # Feature-specific components
│   │   ├── UploadZone.tsx      # File upload with drag & drop
│   │   ├── LinkInput.tsx       # URL input with validation
│   │   ├── FindButton.tsx      # CTA button with animations
│   │   ├── ProcessingState.tsx # Loading state
│   │   ├── ResultCard.tsx      # Individual result card
│   │   └── ResultsGrid.tsx     # Results grid with sorting
│   └── Header.tsx              # App header
├── lib/
│   ├── utils.ts                # Utility functions
│   └── useToast.ts             # Toast hook
├── types/
│   └── index.ts                # TypeScript types
└── tailwind.config.js          # Tailwind configuration
```

---

## 🧩 Component Breakdown

### **UI Components** (`components/ui/`)

Reusable, primitive components with no business logic.

#### **1. Button**
```tsx
<Button 
  variant="primary" | "secondary" | "accent" | "ghost"
  size="sm" | "md" | "lg"
  isLoading={boolean}
  icon={ReactNode}
  disabled={boolean}
>
  Click Me
</Button>
```

**Props:**
- `variant`: Visual style
- `size`: Button size
- `isLoading`: Shows spinner
- `icon`: Optional icon
- `disabled`: Disabled state

**Features:**
- Framer Motion animations
- Hover/tap effects
- Loading state with spinner
- Consistent styling

---

#### **2. Badge**
```tsx
<Badge 
  variant="success" | "warning" | "error" | "info" | "neutral"
  size="sm" | "md" | "lg"
  icon="✓"
>
  High Match
</Badge>
```

**Props:**
- `variant`: Color scheme
- `size`: Badge size
- `icon`: Optional emoji/icon

**Features:**
- Color-coded variants
- Backdrop blur effect
- Flexible sizing

---

#### **3. ProgressBar**
```tsx
<ProgressBar 
  progress={67}
  showLabel={true}
  size="sm" | "md" | "lg"
  variant="primary" | "accent" | "gradient"
/>
```

**Props:**
- `progress`: 0-100 percentage
- `showLabel`: Show percentage text
- `size`: Bar height
- `variant`: Color style

**Features:**
- Animated progress
- Shimmer effect
- Gradient support
- Auto-clamping (0-100)

---

#### **4. ToastNotification**
```tsx
<ToastNotification 
  toast={toast}
  onClose={() => {}}
/>
```

**Props:**
- `toast`: Toast object or null
- `onClose`: Close callback

**Features:**
- Auto-dismiss with timer
- Animated entrance/exit
- Type-based styling
- Progress bar indicator

---

### **Feature Components** (`components/features/`)

Business logic components for specific features.

#### **1. UploadZone**
```tsx
<UploadZone 
  onFileSelect={(file) => {}}
  uploadedFile={file}
  disabled={false}
/>
```

**Props:**
- `onFileSelect`: Callback with UploadedFile
- `uploadedFile`: Current file state
- `disabled`: Disable interactions

**Features:**
- Drag & drop support
- File validation (type, size)
- Image preview
- Error handling
- Remove functionality

**Validation:**
- Max size: 10MB
- Types: JPG, PNG, WEBP
- Min dimensions: 100x100px

---

#### **2. LinkInput**
```tsx
<LinkInput 
  value={url}
  onChange={(value) => {}}
  disabled={false}
  onValidationChange={(isValid) => {}}
/>
```

**Props:**
- `value`: Current URL
- `onChange`: Value change callback
- `disabled`: Disable input
- `onValidationChange`: Validation callback

**Features:**
- Real-time URL validation
- Visual feedback (icons, colors)
- Focus glow effect
- Error messages
- Debounced validation

---

#### **3. FindButton**
```tsx
<FindButton 
  onClick={() => {}}
  disabled={false}
  isReady={true}
  isLoading={false}
/>
```

**Props:**
- `onClick`: Click handler
- `disabled`: Disable button
- `isReady`: Enable animations
- `isLoading`: Show loading state

**Features:**
- Animated glow when ready
- Shimmer effect
- Estimated time display
- Helper text
- Pulse animation

---

#### **4. ProcessingState**
```tsx
<ProcessingState 
  progress={67}
  onCancel={() => {}}
  showCancel={true}
/>
```

**Props:**
- `progress`: 0-100 percentage
- `onCancel`: Cancel callback
- `showCancel`: Show cancel button

**Features:**
- 4-phase progress messages
- Animated icons
- Time remaining estimate
- Gradient progress bar
- Animated background

**Phases:**
1. **0-25%**: Uploading (📤)
2. **25-50%**: Analyzing (🧠)
3. **50-75%**: Searching (🔎)
4. **75-95%**: Finalizing (✨)
5. **95-100%**: Complete (✅)

---

#### **5. ResultCard**
```tsx
<ResultCard 
  result={result}
  onDownload={(result) => {}}
  onViewDetails={(result) => {}}
  index={0}
/>
```

**Props:**
- `result`: SearchResult object
- `onDownload`: Download callback
- `onViewDetails`: Details callback
- `index`: For stagger animation

**Features:**
- Confidence badge
- Hover overlay with actions
- Quick action buttons
- Staggered animation
- Metadata display

---

#### **6. ResultsGrid**
```tsx
<ResultsGrid 
  results={results}
  onReset={() => {}}
  onDownloadAll={() => {}}
  searchTime={47}
/>
```

**Props:**
- `results`: Array of SearchResult
- `onReset`: New search callback
- `onDownloadAll`: Bulk download
- `searchTime`: Search duration

**Features:**
- Sortable results (4 options)
- Responsive grid layout
- Staggered card animations
- Load more functionality
- Result count display

**Sort Options:**
- Confidence (High to Low)
- Confidence (Low to High)
- Filename
- Date

---

## 🔧 Utilities (`lib/utils.ts`)

### **File Utilities**
```typescript
formatFileSize(bytes: number): string
validateImageFile(file: File): { valid: boolean; error?: string }
createFilePreview(file: File): Promise<string>
```

### **Validation**
```typescript
isValidUrl(url: string): boolean
```

### **Processing**
```typescript
getConfidenceBadge(confidence: number): ConfidenceBadge
getProcessingStatus(progress: number): ProcessingStatus
```

### **Formatting**
```typescript
formatDate(dateString: string): string
generateId(): string
```

### **Performance**
```typescript
debounce<T>(func: T, wait: number): Function
```

---

## 🎣 Custom Hooks

### **useToast** (`lib/useToast.ts`)

```typescript
const { toast, success, error, warning, info, hideToast } = useToast()

// Usage
success('Upload Complete', 'Your file is ready')
error('Upload Failed', 'Please try again')
warning('Low Confidence', 'Results may be inaccurate')
info('Processing', 'This may take a moment')
```

**Returns:**
- `toast`: Current toast state
- `success()`: Show success toast
- `error()`: Show error toast
- `warning()`: Show warning toast
- `info()`: Show info toast
- `hideToast()`: Manually close toast

---

## 📦 TypeScript Types (`types/index.ts`)

### **Core Types**
```typescript
interface UploadedFile {
  file: File
  preview: string
  size: number
  name: string
}

interface SearchResult {
  id: string
  imageUrl: string
  confidence: number
  filename: string
  timestamp: string
  metadata?: {
    width?: number
    height?: number
    source?: string
  }
}

type ConfidenceLevel = 'high' | 'medium' | 'low'

interface ConfidenceBadge {
  level: ConfidenceLevel
  color: string
  label: string
  icon: string
}

type ProcessingPhase = 'uploading' | 'analyzing' | 'searching' | 'finalizing' | 'complete'

interface ProcessingStatus {
  phase: ProcessingPhase
  progress: number
  message: string
  icon: string
  timeRemaining: number
}

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}
```

---

## 🎨 Design Patterns

### **1. Composition Over Inheritance**
Components are composed from smaller primitives:
```tsx
<FindButton>
  <Button variant="accent">
    <Icon />
    <Text />
  </Button>
</FindButton>
```

### **2. Controlled Components**
All form inputs are controlled:
```tsx
<LinkInput value={url} onChange={setUrl} />
```

### **3. Render Props / Callbacks**
Components communicate via callbacks:
```tsx
<UploadZone onFileSelect={(file) => handleFile(file)} />
```

### **4. Single Responsibility**
Each component has one clear purpose:
- `Button` → Clickable action
- `Badge` → Status display
- `ProgressBar` → Progress indication

### **5. Prop Drilling Prevention**
Use hooks for cross-cutting concerns:
```tsx
const { success, error } = useToast()
```

---

## 🚀 Usage Example

```tsx
'use client'

import { useState } from 'react'
import { UploadedFile } from '@/types'
import { useToast } from '@/lib/useToast'

import UploadZone from '@/components/features/UploadZone'
import LinkInput from '@/components/features/LinkInput'
import FindButton from '@/components/features/FindButton'
import ToastNotification from '@/components/ui/ToastNotification'

export default function SearchPage() {
  const [file, setFile] = useState<UploadedFile | null>(null)
  const [url, setUrl] = useState('')
  const [isValid, setIsValid] = useState(false)
  const { toast, success, hideToast } = useToast()

  const handleSearch = () => {
    success('Search Started', 'Finding matches...')
  }

  return (
    <div>
      <UploadZone onFileSelect={setFile} uploadedFile={file} />
      <LinkInput 
        value={url} 
        onChange={setUrl}
        onValidationChange={setIsValid}
      />
      <FindButton 
        onClick={handleSearch}
        disabled={!file || !isValid}
        isReady={file !== null && isValid}
      />
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  )
}
```

---

## ✅ Benefits

### **Reusability**
- UI components work anywhere
- No business logic coupling
- Consistent styling

### **Maintainability**
- Single source of truth
- Easy to update styles
- Clear component boundaries

### **Type Safety**
- Full TypeScript support
- Autocomplete in IDE
- Catch errors early

### **Performance**
- Optimized re-renders
- Memoized callbacks
- Lazy loading ready

### **Testing**
- Isolated components
- Easy to mock props
- Clear interfaces

---

## 🎯 Next Steps

1. **Add unit tests** for utilities
2. **Add Storybook** for component docs
3. **Add E2E tests** with Playwright
4. **Add accessibility** (ARIA labels)
5. **Add dark mode** support
6. **Add i18n** for translations

---

Built with modern React patterns and TypeScript best practices 🚀
