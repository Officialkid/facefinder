# FaceFinder Animation System

## 🎬 Animation Philosophy

**Premium, Purposeful, Performant**

Every animation serves a purpose:
- **Feedback** - Confirm user actions
- **Guidance** - Direct attention
- **Delight** - Create memorable moments
- **Context** - Show relationships and state changes

---

## 🎨 Animation Principles

### 1. **Smooth & Fast**
- Duration: 200-500ms for most interactions
- Easing: Natural curves (cubic-bezier)
- No janky animations

### 2. **Not Excessive**
- Subtle by default
- Enhance, don't distract
- Respect user preferences (prefers-reduced-motion)

### 3. **Premium Feel**
- Spring physics for organic motion
- Layered animations (stagger, sequence)
- Attention to micro-interactions

---

## 🔧 Technical Implementation

### **CSS Animations** (`globals-enhanced.css`)

#### Keyframes
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

@keyframes pulseScale {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}
```

#### Utility Classes
```css
.animate-fade-in-up { animation: fadeInUp 0.6s ease-out; }
.animate-shimmer { animation: shimmer 2s linear infinite; }
.hover-lift:hover { transform: translateY(-4px); }
.press-scale { transition: transform 0.2s; }
.press-scale:active { transform: scale(0.95); }
```

---

### **Framer Motion** (`lib/animations.ts`)

#### Easing Curves
```typescript
export const easings = {
  smooth: [0.4, 0, 0.2, 1],      // Default smooth
  bounce: [0.68, -0.55, 0.265, 1.55],  // Bouncy
  spring: [0.175, 0.885, 0.32, 1.275], // Spring-like
}
```

#### Transitions
```typescript
export const transitions = {
  fast: { duration: 0.2, ease: easings.smooth },
  medium: { duration: 0.3, ease: easings.smooth },
  spring: { type: 'spring', stiffness: 300, damping: 30 },
}
```

#### Variants
```typescript
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: transitions.medium }
}

export const buttonPress: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, y: -2 },
  tap: { scale: 0.98 }
}
```

---

## 🎯 Component Animations

### **1. Upload Preview Transition**

**Effect**: 3D rotate + scale + fade

```typescript
export const uploadPreview: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    rotateX: -15,  // 3D tilt
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    rotateX: 0,
    transition: { type: 'spring', duration: 0.6 }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -20,
  }
}
```

**Usage**:
```tsx
<motion.div
  variants={uploadPreview}
  initial="hidden"
  animate="visible"
  exit="exit"
>
  {/* Preview content */}
</motion.div>
```

**Features**:
- ✅ 3D perspective on entry
- ✅ Spring physics for natural feel
- ✅ Smooth exit animation
- ✅ Image thumbnail zoom on hover

---

### **2. Button Press Feedback**

**Effect**: Scale + lift + ripple

```typescript
export const buttonPress: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, y: -2, transition: { duration: 0.2 } },
  tap: { scale: 0.98, y: 0, transition: { duration: 0.1 } }
}
```

**Ripple Effect**:
```tsx
const [ripples, setRipples] = useState<Ripple[]>([])

const handleClick = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  setRipples(prev => [...prev, { x, y, id: Date.now() }])
  
  setTimeout(() => {
    setRipples(prev => prev.filter(r => r.id !== newRipple.id))
  }, 600)
}
```

**Features**:
- ✅ Hover lift (-2px)
- ✅ Press scale (0.98)
- ✅ Ripple on click
- ✅ Icon scale animation

---

### **3. Loading Animation**

**Progress Bar**:
```tsx
const springProgress = useSpring(0, {
  stiffness: 100,
  damping: 30
})

useEffect(() => {
  springProgress.set(progress)
}, [progress])

const width = useTransform(springProgress, (value) => `${value}%`)
```

**Features**:
- ✅ Smooth spring animation
- ✅ Shimmer effect overlay
- ✅ Glow at progress end
- ✅ Milestone indicators (25%, 50%, 75%, 100%)
- ✅ Phase-based messages

**States**:
```typescript
0-25%:   📤 "Uploading and validating..."
25-50%:  🧠 "Analyzing facial features..."
50-75%:  🔎 "Searching dataset..."
75-95%:  ✨ "Finalizing results..."
95-100%: ✅ "Complete!"
```

---

### **4. Results Staggered Reveal**

**Container**:
```typescript
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,  // 100ms between children
      delayChildren: 0.05,   // 50ms initial delay
    }
  }
}
```

**Item**:
```typescript
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}
```

**Usage**:
```tsx
<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  {results.map((result, i) => (
    <motion.div key={i} variants={staggerItem}>
      <ResultCard result={result} index={i} />
    </motion.div>
  ))}
</motion.div>
```

**Features**:
- ✅ Sequential reveal (100ms stagger)
- ✅ Fade + slide up
- ✅ Index-based delay
- ✅ Smooth grid layout

---

### **5. Image Hover Effects**

**Zoom Effect**:
```typescript
export const imageZoom: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.1,
    transition: { duration: 0.5, ease: 'smooth' }
  }
}
```

**Overlay Gradient**:
```tsx
<motion.div 
  className="absolute inset-0 bg-gradient-to-t from-neutral-900/80"
  initial={{ opacity: 0 }}
  animate={{ opacity: isHovered ? 1 : 0 }}
  transition={{ duration: 0.3 }}
/>
```

**Quick Actions**:
```tsx
<AnimatePresence>
  {isHovered && (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <button>View</button>
      <button>Download</button>
    </motion.div>
  )}
</AnimatePresence>
```

**Features**:
- ✅ Image zoom (1.1x scale)
- ✅ Gradient overlay fade
- ✅ Action buttons slide up
- ✅ Button rotate on hover
- ✅ Glow effect on card

---

## 🎭 Animation Timing

### **Duration Guidelines**

| Interaction | Duration | Easing |
|------------|----------|--------|
| Hover | 200ms | smooth |
| Click/Tap | 100ms | smooth |
| Page transition | 300ms | smooth |
| Modal open | 400ms | spring |
| Toast | 300ms | spring |
| Progress | 500ms | smooth |
| Stagger delay | 50-100ms | - |

### **Spring Physics**

```typescript
// Snappy (buttons, small elements)
{ stiffness: 500, damping: 30 }

// Balanced (cards, modals)
{ stiffness: 300, damping: 30 }

// Gentle (large elements)
{ stiffness: 200, damping: 25 }
```

---

## 🎨 Visual Effects

### **Shimmer**
```css
.animate-shimmer {
  background: linear-gradient(90deg, transparent, white/30, transparent);
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
}
```

**Used in**:
- Progress bars
- Loading skeletons
- Image placeholders

### **Glow**
```css
.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.6); }
}
```

**Used in**:
- Ready state buttons
- Active cards
- Focus states

### **Pulse**
```typescript
animate={{
  scale: [1, 1.05, 1],
  opacity: [1, 0.8, 1]
}}
transition={{
  duration: 2,
  repeat: Infinity
}}
```

**Used in**:
- Loading indicators
- Attention grabbers
- Status icons

---

## ⚡ Performance Optimizations

### **GPU Acceleration**
```css
.gpu-accelerated {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
```

### **Will-Change**
```css
.will-change-transform {
  will-change: transform;
}
```

### **Reduce Motion**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🎯 Best Practices

### **DO**
✅ Use spring physics for natural motion  
✅ Stagger child animations  
✅ Provide visual feedback for all interactions  
✅ Keep animations under 500ms  
✅ Use GPU-accelerated properties (transform, opacity)  
✅ Test on low-end devices  

### **DON'T**
❌ Animate width/height (use scale)  
❌ Chain too many animations  
❌ Use ease-in for exits  
❌ Animate on scroll (performance)  
❌ Ignore prefers-reduced-motion  
❌ Overuse bounce/elastic easing  

---

## 📊 Animation Checklist

### **Upload Zone**
- [x] Drag over highlight
- [x] Drop scale animation
- [x] Preview 3D rotate entry
- [x] Image thumbnail zoom
- [x] Remove button rotate
- [x] Processing spinner

### **Buttons**
- [x] Hover lift (-2px)
- [x] Press scale (0.98)
- [x] Ripple effect
- [x] Icon animations
- [x] Loading spinner
- [x] Glow when ready

### **Progress Bar**
- [x] Smooth spring animation
- [x] Shimmer overlay
- [x] Glow at end
- [x] Milestone indicators
- [x] Phase transitions
- [x] Completion flash

### **Results Grid**
- [x] Staggered reveal (100ms)
- [x] Card hover lift
- [x] Image zoom (1.1x)
- [x] Overlay fade
- [x] Action buttons slide
- [x] Badge rotate entry

---

## 🚀 Usage Examples

### **Basic Fade In**
```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

### **Stagger Children**
```tsx
<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItem}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### **Button with Ripple**
```tsx
<ButtonEnhanced
  variant="primary"
  showRipple={true}
  onClick={handleClick}
>
  Click Me
</ButtonEnhanced>
```

### **Image with Zoom**
```tsx
<motion.img
  variants={imageZoom}
  initial="rest"
  whileHover="hover"
  src={image}
/>
```

---

## 🎬 Animation Showcase

All enhanced components are in:
- `components/ui/ButtonEnhanced.tsx`
- `components/ui/ProgressBarEnhanced.tsx`
- `components/features/UploadZoneEnhanced.tsx`
- `components/features/ResultCardEnhanced.tsx`
- `components/features/ResultsGridEnhanced.tsx`

To use enhanced animations:
1. Import from `lib/animations.ts`
2. Apply variants to motion components
3. Use spring physics for organic feel
4. Test on multiple devices

---

**Built with Framer Motion + CSS for premium, performant animations** ✨
