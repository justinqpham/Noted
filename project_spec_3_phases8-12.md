# Noted - Phases 8-12 Specification

**⚠️ PLACEHOLDER - To be written after Phase 7 completion**

**Load this file when working on Phases 8, 9, 10, 11, or 12**

**Prerequisites:** Read `project_spec_1_foundation.md` first

---

## Status

This specification will be written in detail once Phases 5-7 are complete. 

The content will be based on:
- Lessons learned from Phases 5-7 implementation
- User feedback and actual usage patterns
- Decision on whether to pursue cloud features or keep local-first
- Market validation for monetization features

---

## High-Level Phase Overview (Subject to Change)

### Phase 8: Authentication & Cloud Sync (Optional)
**Decision Point:** Only implement if user wants cross-device sync

Potential features:
- Supabase Authentication (Google/Apple OAuth)
- Cloud storage for annotations
- Cross-device synchronization
- Conflict resolution

### Phase 9: Browser Integration
**Goal:** Enhanced UI/UX

Potential features:
- Sidebar panel (persistent view)
- Context menu integration (right-click to annotate)
- Global annotation search
- Keyboard shortcuts for power users

### Phase 10: Templates + Layers + Monitoring
**Goal:** Power user features

Potential features:
- Annotation templates (Bug Report, Design Feedback, Research Note)
- Layer system (toggle visibility)
- Anchor health monitoring (background checks)
- Bulk operations

### Phase 11: Monetization (Optional)
**Decision Point:** Only implement if pursuing paid model

Potential features:
- Free tier (local annotations only)
- Pro tier ($5/month) (cloud sync, unlimited sharing)
- Stripe integration
- VIP codes for friends
- Billing portal

### Phase 12: Testing & Launch Prep
**Goal:** Production readiness

Activities:
- Comprehensive cross-site testing
- Performance optimization
- Security audit
- Documentation
- Chrome Web Store submission
- Marketing site

---

## Future Enhancements (Post-Launch)

Ideas to consider:
- Figma plugin (direct integration)
- AI-powered features (auto-summarize, smart categorization)
- Mobile browser extensions
- Team collaboration features
- Conversation threads on annotations
- Webhook integrations (Slack, Jira, etc.)

---

## Instructions for Agent

**Do not load this file until:**
1. Phases 5-7 are complete and tested
2. User has provided feedback on next priorities
3. Decision made on cloud vs. local-first approach
4. Decision made on monetization strategy

**When ready to build Phases 8-12:**
1. User will provide detailed specification
2. This file will be updated with full implementation details
3. Load this file alongside `project_spec_1_foundation.md`

---

## Note to User

After completing Phase 7, review:
- What worked well in Phases 5-7
- What was harder than expected
- User feedback (if any)
- Whether sharing feature got traction
- Whether you want authentication/cloud features
- Whether monetization makes sense

Then we'll write detailed specs for Phases 8-12 based on actual priorities.