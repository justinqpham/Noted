# Agent Instructions - Chrome Annotation Extension

You are building a Chrome Extension for web page annotation based on the attached **PROJECT_SPEC.md**.

---

## Critical Rules

### 1. PROJECT_SPEC.md is Your Source of Truth
- Read the entire specification before writing any code
- If anything is unclear, ask for clarification - **do not improvise or assume**
- Do not deviate from the spec without explicit approval from me
- If you believe something in the spec won't work, explain why and propose an alternative, then wait for approval

### 2. Work Phase-by-Phase (No Exceptions)
- Complete ONE phase at a time as defined in PROJECT_SPEC.md
- At the end of each phase, **STOP and show me:**
  - What you built
  - Unit test results (if applicable)
  - Manual testing checklist for validation
- **Wait for my explicit approval** before moving to the next phase
- Do NOT skip ahead, combine phases, or work on multiple phases simultaneously

### 3. Before Writing Any Code
- State which phase you're working on
- List exactly what you're about to build
- Confirm it matches PROJECT_SPEC.md
- Wait for my go-ahead

### 4. When You Encounter Problems
- Tell me immediately - don't try to "fix" it by changing the architecture
- Reference the specific section of PROJECT_SPEC.md that's problematic
- Propose a solution and explain your reasoning
- Wait for my approval before implementing

### 5. Testing Requirements
- Write unit tests for algorithms and pure functions (anchoring, drawing smoothing, storage calculations)
- Provide manual testing checklists for UI and integration features
- **Do not proceed to the next phase if tests fail** - debug the current phase first

### 6. Code Quality Standards
- Write clean, commented code
- Use descriptive variable names
- Keep functions focused and modular
- Follow the architecture defined in PROJECT_SPEC.md

---

## Required Response Format

### When Starting a Phase

Use this format:

```
## Phase X: [Phase Name]

**Building:**
- [Component 1]
- [Component 2]
- [Component 3]

**Dependencies:**
- [What must be working first]

**Success Criteria:**
- [How we'll know this phase is complete]

**Estimated Complexity:** [Simple / Medium / Complex]

**Ready to proceed?** Please confirm before I start coding.
```

### When Completing a Phase

Use this format:

```
## Phase X: [Phase Name] - COMPLETE

**What Was Built:**
- [File/component 1] - [brief description]
- [File/component 2] - [brief description]

**Unit Tests:**
- ✓ [Test 1 name] - PASSED
- ✓ [Test 2 name] - PASSED
- [Or] N/A - No unit tests required for this phase

**Manual Testing Checklist:**
Please validate the following before I proceed:

- [ ] Test case 1
- [ ] Test case 2
- [ ] Test case 3

**Test Instructions:**
[Provide clear steps for how to test each item]

---

**STATUS: Ready for validation.**

Please test the above checklist and confirm before I move to Phase [X+1].
```

---

## Phase Completion Criteria

Each phase must pass these checks before moving forward:

### Phase 1: Core Infrastructure
- [ ] Unit tests for storage helper functions pass
- [ ] Extension loads without errors in chrome://extensions
- [ ] Manual test: Dashboard popup opens when clicking extension icon
- [ ] Manual test: Hotkeys log messages to console

### Phase 2: Text Annotations
- [ ] Manual test: Works on Wikipedia, Reddit, and Gmail
- [ ] Refresh test: Annotations persist after page reload
- [ ] Window resize test: Annotations scale proportionally (50% to 200% zoom)
- [ ] Manual test: Can drag and resize annotations smoothly

### Phase 3: Drawing System
- [ ] Unit test: Catmull-Rom interpolation produces smooth curves
- [ ] Unit test: SVG path conversion works correctly
- [ ] Manual test: Drawing feels smooth with no lag (60fps)
- [ ] Manual test: Can change colors and brush sizes
- [ ] Manual test: Undo/redo functionality works
- [ ] Manual test: Can move completed drawings

### Phase 4: Advanced Anchoring
- [ ] Unit test: XPath generation for various DOM structures
- [ ] Manual test: Annotation survives page refresh on dynamic site (Twitter/Reddit)
- [ ] Manual test: Content change warning appears when page content changes
- [ ] Manual test: Infinite scroll warning appears on Twitter feed (but NOT on individual tweet)
- [ ] Manual test: Proportional scaling works when resizing window

### Phase 5: Dashboard
- [ ] Manual test: All 4 tabs render correctly (Current Page, All Annotations, Collections, Settings)
- [ ] Manual test: Search/filter/sort works on Current Page tab
- [ ] Manual test: Clicking annotation scrolls to it on page
- [ ] Manual test: Clicking annotation on closed URL opens new tab
- [ ] Manual test: Collections can be created, edited, deleted
- [ ] Manual test: Settings toggles work

### Phase 6: Polish & Sync
- [ ] Manual test: Real-time sync between tabs (create annotation in Tab A, appears in Tab B)
- [ ] Manual test: Edit modal works for both text and drawing annotations
- [ ] Manual test: Tags can be added and used for filtering
- [ ] Manual test: Tab close behavior works (confirmation dialog or auto-save based on settings)
- [ ] Manual test: Export/import annotations works

### Phase 7: Testing & Refinement
- [ ] Cross-website testing complete (static sites, dynamic sites, complex sites)
- [ ] Performance testing: No lag with 50+ annotations on page
- [ ] Storage testing: Limits enforced correctly
- [ ] Edge case testing: Z-index conflicts, zoom levels, very long pages
- [ ] Bug fixes completed
- [ ] Final polish complete

---

## Manual Testing Protocol

Test each major phase on these websites:

**Static Sites:**
- Wikipedia
- Mozilla Developer Network (MDN)

**Dynamic Sites:**
- Twitter/X (feed and individual posts)
- Reddit (feed and individual posts)

**Complex Sites:**
- Gmail
- YouTube

**News Sites:**
- CNN
- New York Times

**Standard Test Scenarios:**
1. Create annotation → Refresh page
2. Create annotation → Resize window (50%, 100%, 150%, 200%)
3. Create annotation → Navigate away → Navigate back
4. Create annotation in Tab A → Open same URL in Tab B (test sync)

---

## When Tests Fail

If any test fails:
1. **STOP** - Do not proceed to next phase
2. Debug the specific failing test
3. Show me what's failing and your diagnosis
4. Propose a fix
5. Wait for approval
6. Implement fix
7. Re-run all tests for current phase
8. Only proceed when ALL tests pass

---

## Your First Task

Before writing any code:

1. **Read PROJECT_SPEC.md completely** from start to finish
2. **Summarize your understanding** of the project in 3-4 sentences
3. **State the scope of Phase 1** and what success looks like
4. **Ask any clarifying questions** you have
5. **Wait for my explicit "go ahead" approval** before writing code

Do not start coding until I confirm.

---

## Communication Guidelines

**DO:**
- Ask questions when unclear
- Explain your reasoning
- Flag potential issues early
- Reference specific sections of PROJECT_SPEC.md
- Show your work (code, test results, etc.)

**DON'T:**
- Assume or improvise
- Skip ahead without approval
- Combine phases to "save time"
- Make architectural changes without discussing
- Proceed when tests fail

---

## Debugging Protocol

When you encounter a bug:

```
## Bug Report

**Phase:** [Current phase]
**Issue:** [Clear description of what's not working]
**Expected Behavior:** [What should happen according to spec]
**Actual Behavior:** [What's actually happening]
**Relevant Code:** [Snippet or file reference]
**Proposed Fix:** [Your suggested solution]

Should I proceed with this fix?
```

---

## When Context is Lost

If we start a new conversation and you've lost context:

1. I will tell you which phase we're on
2. I will tell you what's been completed
3. I will re-attach PROJECT_SPEC.md
4. You will summarize your understanding of where we are
5. You will confirm the next task before proceeding

---

## Final Reminder

**Your job is to BUILD what's in the spec, not REDESIGN the project.**

If you think something should be done differently, that's fine - but discuss it with me first. The spec represents careful architectural decisions, not random choices.

**Question to ask yourself constantly:**
*"Does what I'm about to do match PROJECT_SPEC.md?"*

If the answer is "no" or "I'm not sure", stop and ask me.

---

## Ready to Begin?

Confirm you've read and understood these instructions, then:
1. Read PROJECT_SPEC.md
2. Summarize the project
3. State Phase 1 scope
4. Ask questions
5. Wait for approval

Let's build something great.