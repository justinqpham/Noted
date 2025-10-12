# Agent Instructions - Chrome Annotation Extension

You are building a Chrome Extension for web page annotation based on the attached project specifications.

---

## Critical Rules

### 1. Project Specifications are Your Source of Truth
- Read ALL loaded specification files before writing any code
- If anything is unclear, ask for clarification - **do not improvise or assume**
- Do not deviate from the spec without explicit approval from me
- If you believe something in the spec won't work, explain why and propose an alternative, then wait for approval

### 2. Work Phase-by-Phase (No Exceptions)
- Complete ONE phase at a time as defined in the project specs
- At the end of each phase, **STOP and show me:**
  - What you built
  - Unit test results (if applicable)
  - Manual testing checklist for validation
- **Wait for my explicit approval** before moving to the next phase
- Do NOT skip ahead, combine phases, or work on multiple phases simultaneously

### 3. Before Writing Any Code
- State which phase you're working on
- List exactly what you're about to build
- Confirm it matches the project specifications
- Wait for my go-ahead

### 4. When You Encounter Problems
- Tell me immediately - don't try to "fix" it by changing the architecture
- Reference the specific section of project specs that's problematic
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
- Follow the architecture defined in project specifications

---

## Loading Project Specifications

### Always Load These Files

**Required for every session:**
1. `agent_instructions.md` (this file)
2. `project_spec_1_foundation.md` (architecture + completed phases)

**Load based on current phase:**
- **Working on Phases 5-7:** Load `project_spec_2_phases5-7.md`
- **Working on Phases 8-12:** Load `project_spec_3_phases8-12.md`

### Do NOT Load

- Specification files for completed phases (information is in Spec 1 or code)
- Multiple phase specs simultaneously (only load the spec for phases you're working on)

### Example Session Start

```
## 📋 Session Starting - Phase 5

**Loaded Files:**
- agent_instructions.md ✅
- project_spec_1_foundation.md ✅
- project_spec_2_phases5-7.md ✅

I've read all specifications. Ready to begin Phase 5: Robust Anchoring System.
```

---

## Session Limit Management

### Overview

You are working on a project that involves multiple AI coding agents across different platforms. Each platform has different context window capabilities and compression behaviors. **Understanding your platform's limits is essential for smooth handoffs.**

---

### Platform-Specific Context Windows (As of October 2025)

#### Claude Code
- **Standard Context:** 200K tokens
- **Beta Extended Context:** 1M tokens (API only, tier 4 customers)
- **Auto-Compaction:** Triggers at ~80% usage (160K tokens)
- **Manual Control:** `/compact` command for early compaction
- **Context Visualization:** `/context` command shows token usage, MCP calls, and memory files
- **Memory Files:** CLAUDE.md files count toward context window

#### Cursor
- **Normal Mode:** 128K tokens
- **Max Mode:** 200K tokens (theoretical)
- **Practical Reality:** Often 70-120K tokens due to internal truncation for performance/cost
- **Auto-Summarization:** Automatic when hitting context limit
- **Manual Control:** `/summarize` command (formerly `/compress`)
- **Compression Quality:** Users report issues with context loss during auto-compression

#### GitHub Copilot / OpenAI Codex
- **GitHub Copilot:** Model-dependent (varies by selected model)
- **OpenAI Codex (codex-1):** 192K tokens
- **Auto-Management:** Context managed automatically by platform
- **Agent Mode:** Can run tasks up to 30 minutes in isolated environments
- **No Manual Control:** No user-accessible compression commands

---

### Platform Detection and Decision Matrix

#### Step 1: Identify Your Platform

Before starting any task, state which platform you're using:

```
Platform: [Claude Code / Cursor / GitHub Copilot / OpenAI Codex]
Context Window: [Effective capacity for your platform]
Current Usage: [If visible via /context or status bar]
```

#### Step 2: Apply Platform-Specific Strategy

| Platform | Recommended Approach |
|----------|---------------------|
| **Claude Code** | Check `/context` every 10-15 interactions. Use `/compact` manually at 60-70% to control what gets preserved. |
| **Cursor** | Monitor status bar. Expect auto-summarization around 80-90%. Plan for potential context loss - document critical details frequently. |
| **GitHub Copilot/Codex** | Trust automatic management. Focus on clear task definitions. Use agent mode for long-running tasks. |

---

### Universal Decision Matrix (All Platforms)

#### Before Starting ANY Task

Check remaining capacity and estimate task complexity:

| Effective Tokens Remaining | Task Complexity | Action |
|----------------------------|-----------------|--------|
| >80K | Any | ✅ Proceed with task |
| 40K-80K | Simple | ✅ Proceed with task |
| 40K-80K | Medium/Complex | ⚠️ Break into smaller steps OR compact/summarize first |
| <40K | Any | 🛑 Document and handoff NOW |

**Complexity Guidelines:**
- **Simple:** Single file change, <50 lines of code, no dependencies
- **Medium:** Multiple file changes, 50-200 lines, some dependencies  
- **Complex:** Architectural changes, >200 lines, multiple systems affected

**Note:** These thresholds are conservative to account for Cursor's potential truncation and Claude Code's compaction overhead.

---

### Platform-Specific Monitoring

#### Claude Code Monitoring

**Use `/context` command regularly:**

```bash
# Run every 10-15 interactions
/context
```

**What to look for:**
- Total tokens used vs. available
- Which segments consume most tokens (conversation, MCP calls, memory files)
- Proximity to auto-compaction threshold (80%)

**Proactive compaction:**
```bash
# Compact when you're at a good stopping point
/compact focus: "key architectural decisions, open bugs, implementation plan"
```

**Memory file management:**
- Keep CLAUDE.md files lean and focused
- Split large documentation into multiple files by topic
- Remember: memory files are auto-loaded and count toward context

---

#### Cursor Monitoring

**Status bar indicators:**
- Install and monitor context usage extensions if available
- Watch for performance degradation as context grows

**Expect automatic compression:**
- Auto-summarization triggers around 80-90% usage
- **Warning:** Compression may lose important context
- **Workaround:** Maintain your own running summary in comments or a scratch file

**Manual summarization:**
```bash
# Use when you want to control timing
/summarize
```

**Critical for Cursor users:**
- Document more frequently due to compression issues
- Keep critical information in code comments
- Consider starting new chats more often than other platforms

---

#### GitHub Copilot / Codex Monitoring

**Trust automatic management:**
- Platform handles context automatically
- No manual intervention typically needed
- Focus on clear task descriptions

**For long-running tasks:**
- Use agent mode in GitHub Copilot
- Use Codex cloud tasks for multi-step workflows
- Provide AGENTS.md files for project-specific guidance

**Best practices:**
- Write clear, specific task descriptions
- Break very large features into multiple assigned issues
- Let the agent determine context priorities

---

### Handoff Protocol (All Platforms)

#### When to Handoff

**Claude Code:** 
- When `/context` shows <40K tokens remaining
- After auto-compaction if critical context was lost
- Before starting a complex task with <60K tokens

**Cursor:**
- When auto-summarization has triggered
- When you notice context degradation (AI "forgetting" earlier decisions)
- Before starting a complex task with <50K effective tokens

**GitHub Copilot/Codex:**
- When a multi-day task needs continuation
- When switching between significantly different codebases
- When agent mode tasks complete and new work begins

---

#### Handoff Step 1: Stop All New Work

**Do NOT start:**
- New features
- New files
- New tests  
- Refactoring

**Only finish:**
- Current file you're editing (if <50 lines remaining)
- Current test run (if already started)

---

#### Handoff Step 2: Update HANDOFF.md

Add a new section at the **TOP** of HANDOFF.md:

```markdown
---
## 🔄 HANDOFF - [Current Date/Time]

**Platform:** [Claude Code / Cursor / GitHub Copilot / OpenAI Codex]
**Context Status:** [Approaching limit / Post-compression / Agent task complete]
**Effective Tokens Remaining:** [If known]

**Phase:** [Phase number and name]
**Task:** [What you were working on]
**Status:** [In Progress / Blocked / Needs Testing]

### Context Management Notes

**Platform-Specific Info:**
- [Claude Code: Last /context output summary]
- [Cursor: Number of auto-compressions that occurred]
- [Copilot/Codex: Agent task ID if applicable]

**Critical Context to Preserve:**
[Key decisions, architectural choices, or implementation details that must survive compression]

### What Was Completed This Session

**Files Created:**
- `path/to/file.js` - [Brief description of purpose]
- `path/to/file.css` - [Brief description of purpose]

**Files Modified:**
- `path/to/file.js` - [What changed and why]
  - Lines 45-67: Added anchor resolution logic
  - Lines 120-135: Fixed error handling

**Functions/Classes Added:**
- `AnchorEngine.resolveAnchor()` - Tries multiple anchor strategies
- `AnchorLearning.recordCorrection()` - Stores user corrections

**Known Issues/Bugs:**
- [ ] XPath resolution fails on pages with iframes
- [ ] Session refresh not tested yet

### What Still Needs to Be Done

**Immediate Next Steps (Priority Order):**
1. [Specific task with file path]
   - Expected changes: [What needs to change]
   - Dependencies: [What must work first]
   
2. [Next specific task]
   - Expected changes: [What needs to change]  
   - Dependencies: [What must work first]

**Blockers:**
- [Any issues preventing progress]
- [Missing information needed]
- [Decisions that need to be made]

### Testing Status

**Tests Passing:**
- ✅ `anchor-engine.test.html` - All 12 tests passing
- ⏳ `auth-manager.test.html` - Not run yet

**Manual Testing Needed:**
- [ ] Test anchor resolution on Wikipedia
- [ ] Test session refresh after 50 minutes
- [ ] Test sign-in flow with Google

### Environment Setup

**Dependencies Installed:**
- Supabase client v2.38.0

**Configuration Needed:**
- `.env` file needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Google OAuth credentials need to be configured

**Chrome Extension Status:**
- Loaded in developer mode: [Yes/No]
- Manifest warnings: [List any warnings]

### Code Snippets for Next Agent

**Important context the next agent needs:**

```javascript
// Example: This function is called by...
// and expects these parameters...
// Known issue: Returns null when...
```

### Platform Transition Notes

**If switching platforms:**
- [Critical information about platform-specific implementations]
- [Features that work differently on different platforms]
- [Workarounds specific to current platform]

### Questions/Decisions Needed

1. [Question that needs user answer]
2. [Design decision that needs confirmation]

---
```

---

#### Handoff Step 3: Platform-Specific Handoff Actions

**Claude Code:**
```bash
# Before ending session, save current context state
/context > handoff_context.txt

# Include this output in your handoff notes
```

**Cursor:**
```bash
# Document what was lost in last compression
# Include critical information that may have been summarized away
```

**GitHub Copilot/Codex:**
```bash
# If using agent mode, save task IDs and PR numbers
# Note: AGENTS.md files for project guidance
```

---

#### Handoff Step 4: Final Message to User

```
## 🔄 [Platform Name] Session Limit Approaching - Handoff Complete

**Platform:** [Claude Code / Cursor / GitHub Copilot / OpenAI Codex]
**Context Status:** [Details]

**Current Status:**
- Phase X is [% complete]
- [Summary of what was accomplished this session]

**For Next Agent:**
- Start by reading the handoff section at top of HANDOFF.md
- Platform: Continue using [same platform / can switch to X]
- Next immediate task: [One sentence description]
- Estimated completion: [X more sessions / Y hours]

**Critical Info:**
- [Any must-know context in 1-2 sentences]
- [Platform-specific notes if relevant]

HANDOFF.md has been updated with complete details for seamless continuation.

**Platform Recommendations:**
- [Claude Code: Use /context and /compact strategically]
- [Cursor: Be aware of potential context loss during auto-compression]
- [Copilot/Codex: Use agent mode for long-running tasks]
```

---

### Starting a New Session (Reading Handoff)

#### Step 1: Read HANDOFF.md First

**Find the most recent handoff section** (should be at top)

Read in this order:
1. Platform and Context Status
2. What Was Completed This Session
3. What Still Needs to Be Done
4. Known Issues/Blockers
5. Testing Status

#### Step 2: Verify Environment

**Check that you can access:**
- [ ] All files mentioned in handoff
- [ ] Dependencies are working
- [ ] Tests can run  
- [ ] Extension loads without errors

If anything is missing or broken, STOP and ask user before proceeding.

#### Step 3: State Your Platform

**Critical:** Let the user know which platform you're using:

```
## 📋 Handoff Received - Starting Session

**Platform:** [Claude Code / Cursor / GitHub Copilot / OpenAI Codex]
**Context Capacity:** [Your effective window size]

I've read the handoff from previous agent. Here's my understanding:

**Previous Progress:**
- [Summary of what was done]

**Platform Continuity:**
- Previous agent used: [Platform]  
- I'm using: [Platform]
- [Any notes on platform switch if applicable]

**My Next Tasks:**
1. [First task I'll tackle]
2. [Second task if time permits]

**Estimated Token Usage:**
- This task will use approximately [X] tokens
- Should have [Y] tokens remaining after
- Will monitor via [/context / status bar / automatic]

**Blockers/Questions:**
- [List anything unclear or blocking]

Proceeding with: [First specific task]
```

Wait for user confirmation before starting.

---

### Platform-Specific Best Practices

#### Claude Code Best Practices

**DO:**
- ✅ Run `/context` every 10-15 interactions
- ✅ Use `/compact` proactively at 60-70% usage
- ✅ Keep CLAUDE.md files lean and focused
- ✅ Monitor MCP call token usage
- ✅ Use context awareness features (model knows its limits)

**DON'T:**
- ❌ Wait until 95% to compact (too late)
- ❌ Put everything in one giant CLAUDE.md file
- ❌ Ignore `/context` warnings
- ❌ Run expensive MCP calls repeatedly

---

#### Cursor Best Practices

**DO:**
- ✅ Document frequently (compression can lose context)
- ✅ Keep critical info in code comments
- ✅ Use `/summarize` proactively before major tasks
- ✅ Consider starting new chats more often
- ✅ Monitor status bar for context usage

**DON'T:**
- ❌ Rely on long conversation history
- ❌ Put critical implementation details only in chat
- ❌ Assume full 200K is available (often 70-120K)
- ❌ Ignore performance degradation signals

---

#### GitHub Copilot/Codex Best Practices

**DO:**
- ✅ Write clear, specific task descriptions
- ✅ Use AGENTS.md files for project guidance
- ✅ Use agent mode for multi-step workflows
- ✅ Break very large features into multiple assigned issues
- ✅ Trust automatic context management

**DON'T:**
- ❌ Try to manually manage context (no controls available)
- ❌ Provide overly vague task descriptions
- ❌ Forget to configure development environment properly
- ❌ Assign tasks that are too broad for agent mode

---

### Emergency Handoff (Unexpected Limit)

If you suddenly hit limit without warning:

```markdown
## 🚨 EMERGENCY HANDOFF - [Timestamp]

**Platform:** [Claude Code / Cursor / GitHub Copilot / OpenAI Codex]
**What Triggered:** [Auto-compaction / Sudden compression / Session end]

**Last Working File:** `path/to/file.js`
**Last Working Line:** Approximately line 150  
**What I Was Doing:** [One sentence]

**Current State:**
- Code compiles: [Yes/No/Unknown]
- Tests passing: [Yes/No/Not Run]

**Critical Next Step:**
[One sentence about what must happen next]

**Incomplete Code:**
```javascript
// Paste any half-written code here
// With comments explaining intent
```

**Platform Notes:**
[Any platform-specific context that's critical]
```

---

### Token Estimation Guide

Rough estimates for common tasks:

| Task | Estimated Tokens | Notes |
|------|------------------|-------|
| Create new file (<100 lines) | 3K-5K | Cursor may use more due to context retrieval |
| Create new file (100-300 lines) | 8K-15K | |
| Modify existing file (minor) | 2K-4K | |
| Modify existing file (major) | 6K-12K | |
| Write unit tests | 4K-8K | |
| Debug session | 5K-20K | Highly variable; Cursor may truncate history |
| Design discussion | 3K-10K | |
| Code review | 4K-8K | |
| Documentation | 2K-5K | |
| **Platform overhead:** | | |
| - Claude Code /context call | 1K-2K | Includes visualization |
| - Cursor auto-compression | 5K-10K | Compression itself uses tokens |
| - Copilot agent mode setup | 3K-5K | Initial environment setup |

---

### Cross-Platform Handoffs

**When switching between platforms:**

#### From Claude Code → Cursor
- Export key context from `/context` output
- Cursor has smaller effective window - prioritize essentials
- May need to start fresh conversation sooner

#### From Cursor → Claude Code  
- Restore any context lost to Cursor compression
- Take advantage of larger reliable context window
- Use `/context` to verify full context loaded

#### From Copilot/Codex → Claude Code/Cursor
- Extract task history from agent mode
- Document decisions made by autonomous agent
- May need to explain rationale that agent didn't surface

#### From Claude Code/Cursor → Copilot/Codex
- Write clear AGENTS.md with project conventions
- Convert conversation-style context into task descriptions
- Trust agent to rediscover context through exploration

---

### Platform Feature Matrix

| Feature | Claude Code | Cursor | Copilot/Codex |
|---------|-------------|--------|---------------|
| Context Visibility | ✅ `/context` | ⚠️ Limited | ❌ None |
| Manual Compression | ✅ `/compact` | ✅ `/summarize` | ❌ Auto only |
| Reliable Window Size | ✅ 200K | ⚠️ 70-120K | ✅ 192K |
| Memory Files | ✅ CLAUDE.md | ❌ No | ✅ AGENTS.md |
| Agent Mode | ✅ Built-in | ✅ Available | ✅ Primary mode |
| Context Awareness | ✅ Model knows limits | ⚠️ Partial | ✅ Automatic |
| Compression Quality | ✅ High | ⚠️ Issues reported | ✅ Transparent |

---

### Platform Selection Recommendations

#### Use Claude Code When:
- You need reliable, large context window
- Task requires deep codebase understanding
- You want control over context management
- Working on complex, multi-file refactoring

#### Use Cursor When:
- You want IDE-integrated experience
- Working on smaller, focused tasks
- Speed is priority over context depth
- Comfortable with more frequent handoffs

#### Use GitHub Copilot/Codex When:
- You want autonomous agent mode
- Task is well-defined and self-contained
- Prefer hands-off context management
- Working with GitHub-hosted repositories

---

### Critical Reminders

**Your primary responsibility when hitting limits is NOT to finish the task.**

**It's to ensure the NEXT agent can continue seamlessly, regardless of which platform they're using.**

A well-documented 50% complete feature is infinitely better than a 90% complete feature with no documentation about what's left, why certain decisions were made, or which platform constraints were encountered.

**Remember: Check your platform's context status before every significant task. Document frequently. Handoff proactively.**

---

## Required Response Format

[Rest of your existing agent_instructions content continues here...]

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
- ✅ [Test 1 name] - PASSED
- ✅ [Test 2 name] - PASSED
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

## Communication Guidelines

**DO:**
- Ask questions when unclear
- Explain your reasoning
- Flag potential issues early
- Reference specific sections of project specs
- Show your work (code, test results, etc.)

**DON'T:**
- Assume or improvise
- Skip ahead without approval
- Combine phases to "save time"
- Make architectural changes without discussing
- Proceed when tests fail

---

## Final Reminder

**Your job is to BUILD what's in the spec, not REDESIGN the project.**

If you think something should be done differently, that's fine - but discuss it with me first. The spec represents careful architectural decisions, not random choices.

**Question to ask yourself constantly:**
*"Does what I'm about to do match the project specifications?"*

If the answer is "no" or "I'm not sure", stop and ask me.