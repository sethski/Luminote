# DOM Manipulation & Lifecycle Audit Report

## Executive Summary
This audit identifies potential DOM manipulation issues that could cause "Cannot remove a child of a non-existent parent" errors or double-removal issues.

---

## 1. CRITICAL ISSUE: Portal Root Management
**File:** [toast.tsx](src/toast.tsx#L125-L130)

**Issue:** Portal root element is created on-demand in useEffect without proper cleanup

```typescript
useEffect(() => {
  if (!document.getElementById("toast-root")) {
    const el = document.createElement("div");
    el.id = "toast-root";
    document.body.appendChild(el);  // ⚠️ APPEND WITHOUT CLEANUP
  }
}, []);
```

**Problem:**
- Element is appended but never removed
- If ToastProvider unmounts and remounts, a new portal root is created
- If multiple ToastProviders exist, the first one stays but subsequent ones create duplicates
- No check prevents double-creation race conditions

**Risk Level:** 🔴 **HIGH**
- Causes memory leaks
- Creates duplicate portal roots
- Could cause React portal mismatches

**Recommendation:**
```typescript
useEffect(() => {
  let portalRoot = document.getElementById("toast-root");
  if (!portalRoot) {
    portalRoot = document.createElement("div");
    portalRoot.id = "toast-root";
    document.body.appendChild(portalRoot);
  }
  
  return () => {
    // Only remove if empty and no toasts
    if (toasts.length === 0 && portalRoot?.childNodes.length === 0) {
      portalRoot?.remove();
    }
  };
}, [toasts]);
```

---

## 2. DOM Tree Manipulation in Editor
**File:** [Editor.tsx](src/Editor.tsx#L110-L140)

### Pattern A: Font Size Application with Element Replacement
**Lines 106-140**

```typescript
editor.querySelectorAll('font[size="7"]').forEach(el => {
  const span = document.createElement("span");
  span.style.fontSize = `${size}px`;
  span.innerHTML = el.innerHTML;
  el.parentNode?.replaceChild(span, el);  // ⚠️ REPLACES ELEMENT
});
```

**Potential Issue:**
- Uses optional chaining `?.replaceChild()` which silently fails if parent is null
- No validation that `el` is still in DOM before replacement
- Multiple rapid calls could cause race conditions
- If parent is removed before forEach completes, replacement fails silently

**Risk Level:** 🟡 **MEDIUM**
- Silent failures (no error thrown)
- Parent validation missing

---

### Pattern B: Element Clearing in Delete Handler
**Line 2131**

```typescript
onClick={() => { 
  if (note) { 
    clearCanvasSnapshot(); 
    updateNote(note.id, { title: "", content: "" }); 
    if (editorRef.current) editorRef.current.innerHTML = "";  // ⚠️ INNERHTML ASSIGNMENT
    setTitle(""); 
    setContent(""); 
  } 
  setShowMoreMenu(false); 
}}
```

**Potential Issue:**
- Sets `innerHTML = ""` which removes all child nodes
- No cleanup of refs or event listeners on removed children
- If drawing canvas is attached, cleanup might not run
- Race condition if updateNote is async and triggers re-render during clearing

**Risk Level:** 🟡 **MEDIUM**
- Potential orphaned event listeners
- May conflict with canvas snapshot cleanup

---

### Pattern C: Span Creation and Node Insertion
**Lines 116-119, 145-148**

```typescript
const span = document.createElement("span");
span.innerHTML = "\u200B";  // Zero-width space
range.insertNode(span);
range.setStart(span.childNodes[0], 1);
```

**Potential Issue:**
- Creates orphaned spans for zero-width spacing
- No tracking of inserted nodes for cleanup
- accumulates in the DOM over time
- If editor is cleared (`innerHTML = ""`), these are removed only by assignment, not by explicit removal

**Risk Level:** 🟡 **MEDIUM**
- Memory leaks from accumulated spans
- Potential orphaned nodes

---

## 3. Cleanup Functions with Proper Implementation

### ✅ GOOD: FloatingTimer Event Listeners
**File:** [FloatingTimer.tsx](src/FloatingTimer.tsx#L51-L83)

```typescript
useEffect(() => {
  if (!isDragging) return;

  const handleMouseMove = (e: MouseEvent) => { /* ... */ };
  const handleMouseUp = () => { setIsDragging(false); };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  return () => {  // ✅ PROPER CLEANUP
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
}, [isDragging, dragOffset]);
```

**Status:** ✅ **COMPLIANT**
- Event listeners properly removed
- Dependencies are correct
- No memory leaks

---

### ✅ GOOD: Personal Component Storage Events
**File:** [Personal.tsx](src/Personal.tsx#L335-L350)

```typescript
useEffect(() => {
  const syncCountsFromStorage = () => { /* ... */ };

  window.addEventListener("storage", syncCountsFromStorage);
  window.addEventListener("focus", syncCountsFromStorage);
  
  return () => {
    window.removeEventListener("storage", syncCountsFromStorage);  // ✅ PROPER CLEANUP
    window.removeEventListener("focus", syncCountsFromStorage);
  };
}, []);
```

**Status:** ✅ **COMPLIANT**
- All listeners removed
- No memory leaks

---

### ✅ GOOD: ServerPage Channel Unsubscribe
**File:** [ServerPage.tsx](src/ServerPage.tsx#L715)

```typescript
return () => { 
  channel.unsubscribe(); 
  channelRef.current = null; 
};
```

**Status:** ✅ **COMPLIANT**
- Proper cleanup of Supabase channel
- Ref cleared to prevent double-cleanup

---

### ✅ GOOD: VoiceMemo Cleanup
**File:** [VoiceMemo.tsx](src/VoiceMemo.tsx#L184)

```typescript
useEffect(() => () => stopRecording(), [stopRecording]);
```

Inside `stopRecording()`:
```typescript
cancelAnimationFrame(waveFrameRef.current);
mediaStreamRef.current?.getTracks().forEach(t => t.stop());
if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
audioCtxRef.current?.close();
```

**Status:** ✅ **COMPLIANT**
- Animation frames cancelled
- Media streams stopped
- Intervals cleared
- Audio context closed

---

## 4. useRef Usage Analysis

### Alert Dialog / Modal Components
**File:** [StudyPlanner.tsx](src/StudyPlanner.tsx)

Uses AlertDialog from alert-dialog component which uses Radix UI primitives with portals:
```typescript
<AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
  <AlertDialogContent>
    {/* Content */}
  </AlertDialogContent>
</AlertDialog>
```

**Status:** ✅ **SAFE**
- Radix UI handles portal cleanup
- No manual DOM manipulation

---

### Editor Canvas Refs
**File:** [Editor.tsx](src/Editor.tsx#L587-591)

```typescript
const editorRef = useRef<HTMLDivElement>(null);
const editorCanvasShellRef = useRef<HTMLDivElement>(null);
const activeImageRef = useRef<HTMLImageElement | null>(null);
```

**Risk Level:** 🟡 **MEDIUM**
- Multiple refs pointing to contentEditable/canvas elements
- No explicit cleanup in useEffect
- When `innerHTML = ""` is called (line 2131), refs become stale but not nulled
- Could cause issues if refs are accessed after content is cleared

**Recommendation:**
```typescript
useEffect(() => {
  return () => {
    // Clear stale refs on unmount
    if (editorRef.current) editorRef.current = null;
    if (editorCanvasShellRef.current) editorCanvasShellRef.current = null;
    if (activeImageRef.current) activeImageRef.current = null;
  };
}, []);
```

---

## 5. Script Tag Injection
**File:** [UploadImage.tsx](src/UploadImage.tsx#L15-25)

```typescript
const script = document.createElement("script");
script.src = "https://js.puter.com/v2/";
script.async = true;
script.onload = () => resolve();
script.onerror = () => reject(new Error("Failed to load Puter SDK."));
document.head.appendChild(script);  // ⚠️ APPENDED BUT NEVER REMOVED
```

**Potential Issue:**
- Script is appended once and cached
- If component unmounts during script load, no cleanup
- Script stays in DOM forever
- Multiple UploadImage components create duplicate script checks

**Risk Level:** 🟡 **MEDIUM**
- Memory accumulation
- Script tag pollution

**Recommendation:**
- Use existing script detection to prevent re-injection
- Current code already checks for existing script: ✅
  ```typescript
  const existing = document.querySelector('script[src="https://js.puter.com/v2/"]')
  ```

---

## 6. Animation Frame Cleanup

**File:** [VoiceMemo.tsx](src/VoiceMemo.tsx#L95, L180, L182)

Animation frames are stored in `waveFrameRef` and properly cancelled in `stopRecording`:
```typescript
cancelAnimationFrame(waveFrameRef.current);
```

**Status:** ✅ **COMPLIANT**
- Animation frames properly tracked
- Cancelled on stop/cleanup

---

## Summary of Findings

| File | Issue | Severity | Status |
|------|-------|----------|--------|
| toast.tsx | Portal root created without cleanup | 🔴 HIGH | ⚠️ NEEDS FIX |
| Editor.tsx | replaceChild with optional chaining | 🟡 MEDIUM | ⚠️ NEEDS FIX |
| Editor.tsx | innerHTML clearing without ref cleanup | 🟡 MEDIUM | ⚠️ NEEDS FIX |
| Editor.tsx | Orphaned zero-width spans | 🟡 MEDIUM | ⚠️ REVIEW |
| Editor.tsx | Stale refs after content clear | 🟡 MEDIUM | ⚠️ NEEDS FIX |
| UploadImage.tsx | Script tag injection | 🟡 MEDIUM | ✅ OK (cached properly) |
| FloatingTimer.tsx | Event listener cleanup | ✅ LOW | ✅ PASS |
| Personal.tsx | Event listener cleanup | ✅ LOW | ✅ PASS |
| ServerPage.tsx | Channel cleanup | ✅ LOW | ✅ PASS |
| VoiceMemo.tsx | Animation frame cleanup | ✅ LOW | ✅ PASS |

---

## Recommended Fixes (Priority Order)

1. **[URGENT]** Fix toast.tsx portal root creation/cleanup
2. **[HIGH]** Add stale ref cleanup to Editor.tsx on unmount
3. **[HIGH]** Add error boundary around element replacement in Editor.tsx
4. **[MEDIUM]** Clear/null refs when innerHTML is set to ""
5. **[MEDIUM]** Review zero-width span accumulation strategy

