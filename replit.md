# Overview

This project is a pnpm workspace monorepo centered on "SmartRoot Arabic v1," a deterministic, rule-based Arabic morphology engine. It provides morphological analysis without machine learning, supporting various verb forms, classes, and derived nouns. The primary purpose is to offer robust Arabic morphology analysis via API endpoints, including JSON morphology responses, token-level analysis, student-mode responses, and detailed morphological information for given Arabic roots. The engine handles complex linguistic rules, such as weak verb recovery and conjugated form recognition, using an extensive lexicon to deliver accurate and pedagogically sound morphological insights.

# User Preferences

I want iterative development. I prefer detailed explanations. Ask before making major changes.

# System Architecture

The project is structured as a pnpm workspace monorepo, utilizing Node.js 24 and TypeScript 5.9. The backend API is built with Express 5, interacting with a PostgreSQL database via Drizzle ORM. Zod is used for validation with `drizzle-zod` for integration. API code generation is handled by Orval from an OpenAPI specification, and `esbuild` is used for CJS bundling.

**UI/UX Decisions:**
- Supports **Student Mode** and **Teacher Mode** display modes (renamed from Learning/Reference; backward-compatible localStorage migration via `normalizeMode()`).
- **Student Mode** focuses on essential information: hero card, compact 3-card conjugation (Past/Present/Imperative for 3ms), verb type badge, example sentence, and simplified verb family. Hides conjugation table, accordions, teacher info bar.
- **Teacher Mode** displays all available information plus a **Teacher Info Bar** between hero and content:
  - Grammar badges row: transitivity (متعدٍّ/لازم), frequency tier with dots, ILR teaching level, detection method
  - Verb Class teaching card: Arabic name + description, English translation (covers all 6 classes: sound, hollow, defective, assimilated, doubled, hamzated)
  - Teaching Notes (ملاحظات تعليمية): class-specific pedagogical tips in Arabic
  - Full conjugation tables, all accordions (derivations, family, prepositions, derived nouns, usage, forms I–X)
  - Insight notes (🔍) visible in hero card
- User mode preference persisted in localStorage key `rootify_mode` (values: `student` or `teacher`).
- Safety panel, trust panel messages, and insight notes are provided in Arabic with a teacher-friendly tone, using specific icons and CSS classes for visual cues.

**Technical Implementations:**
- **SmartRoot Engine:** A core deterministic rule-based engine for Arabic morphology.
  - **Morphological Analysis Pipeline:** Includes diacritic stripping, POS shortcuts, lexicon lookup, Alef-madda contraction fallback, and prefix/suffix stripping for root classification.
  - **Verb Classification:** Identifies verb classes (sound, hollow, defective, assimilated, doubled, hamzated).
  - **Conjugation Engine:** Builds past, present, and imperative forms for all supported verb forms.
  - **Weak Verb Engine:** Manages radical recovery, weak verb classification, and exception handling.
  - **Derived Noun System:** Generates and categorizes masdar, active/passive participles, exaggeration, place/time, and instrument nouns with metadata.
  - **Conjugated Form Recognition:** Resolves inflected forms to canonical roots by handling suffixes and verb specificities.
  - **Pedagogical Safety Layer:** `checkInputSafety` validates input, classifying it into modes like `exact_verb_hit`, `recovered_verb_hit`, and `no_valid_verb`, distinguishing between nouns and ambiguous words.
  - **Insight Generation:** `buildInsight()` generates context-aware Arabic insight strings.
  - **Trust Layer:** A "Trust Panel" (`trust` object in API response) provides detailed information on input interpretation, including detected form, root, verb type, confidence, and reasons in both Arabic and English.
- **Lexicon:** An expanded lexicon of 1,003 Arabic verbs with metadata (transitivity, frequency, ILR teaching levels) for lookups and API responses.
- **Form VIII Voiced Dental Assimilation:** For roots beginning with د/ذ/ز, the infixed ت of Form VIII assimilates to د (voiced dental assimilation). Applied in conjugationEngine.ts (`formVIIIInfix`), nounEngine.ts (`vIIIInfixNoun`), and normalization.ts (`detectFormVIII`). E.g., زحم → اِزْدَحَمَ (not *اِزْتَحَمَ).

**Feature Specifications:**
- **API Endpoints:**
    - `GET /api/smartroot`: HTML teacher-facing demo page.
    - `POST /api/smartroot/generate`: JSON morphology response.
    - `POST /api/smartroot/analyze`: Token-level morphological analysis.
    - `POST /api/smartroot/student`: Student-mode response.
    - `POST /api/smartroot/morphology`: Detailed morphology response.
    - `GET /api/smartroot/english-search?q=...`: English-to-Arabic gloss search returning ranked verb results.
    - `GET /api/smartroot/suggest?q=...`: Arabic autocomplete suggestions.
- **Request Schema:** `{ "root": "أكرم", "measure": "auto" }`.
- **Supported Forms:** I, II, III, IV, V, VI, VII, VIII, X.
- **Verb Classes:** Sound, hollow, defective, assimilated, doubled, hamzated.
- **Derived Nouns:** Seven categories (Masdar, Active/Passive Participle, Exaggeration, Place/Time Noun, Instrument Noun) with attested and theoretical forms.
- **Verb Family View:** Includes `verb_family` field in API responses with `core` forms (masdar, active/passive participle) and `derived_verbs` (attested non-current forms).
- **Lexicon-First Form I Masdars:** Masdars are now primarily sourced from the lexicon for Form I verbs, with support for multiple attested masdars.
- **Autocomplete and Smart Suggestions:** `GET /api/smartroot/suggest?q=...` returns ranked suggestions (verbs, masdars, nouns) with intent-aware ranking, weak verb expansion, and contextual hints.
- **English-to-Arabic Search (Phase 11.2+11.3):** `englishSearch.ts` builds an in-memory index of ~1300 verb entries (Form I lexicon + Forms II-X glosses). Tokenizes English queries, removes stop words, applies stemming (irregular stems table + rule-based). Phase 11.3 adds: (1) SYNONYM_MAP — ~50 curated English synonym groups for search expansion (e.g., "see"→["watch","observe","look"]). (2) SEMANTIC_GROUPS — metadata mapping Arabic verbs to labeled semantic groups for ~30 common domains (e.g., "see"→"Most common: رَأَى", "Watching: شَاهَدَ", "Looking: نَظَرَ"). (3) `searchEnglishGrouped()` — returns `GroupedSearchResult` with groups sorted by priority, each containing ranked results with matchType ("exact"/"normalized"/"synonym"). (4) Frontend displays grouped results with labeled sections (red left-border accent), "Conjugate" buttons, and synonym match badges. API endpoint: `GET /api/smartroot/english-search?q=...` now returns grouped payload. Original flat `searchEnglish()` preserved for backward compatibility.
- **Teacher Sets (Verb Sets):** localStorage-backed named verb sets (`rootify_sets`) with CRUD operations. Set Manager modal accessible from home screen. "Add to Set" button in analysis view. Export from sets: Study Sheet, Worksheet, Quiz (3-part: meaning, conjugation, masdar), Review Packet.
- **Interactive Intelligence Layer (Phase 11.5):** UI-only interactivity layer:
  - **Clickable Root Panel:** Root line in hero card is clickable → opens modal showing all verbs from the same root (current form highlighted, others clickable for navigation). Empty state handled.
  - **Reusable Tooltip System:** Single tooltip component (`rf-tooltip`) used across all interactive elements. Hover on desktop, click/tap on mobile. Auto-positions to stay on-screen. Clean close via click-outside or ×.
  - **Conjugation Cell Tooltips:** Hovering conjugation cells shows tense/mood label (Arabic + English), verb class hints. Teacher mode: richer detail. Student mode: lighter.
  - **Derivation Tooltips:** Masdar, active/passive participles, derived nouns show educational tooltips explaining their grammatical role.
  - **Pattern-Aware Highlighting:** In Teacher mode, root letters highlighted muted red (#c93843), weak letters muted purple (#7c6cae), hamzated root letters amber (#b45309), doubled consonants underlined. Student mode: minimal (no color highlighting).
  - **3-Level Color Hierarchy (Phase 11.6c):** Systematic gray palette enforced across all UI: Level 1 Primary (#1a1a2e) for Arabic text and main labels (weight 600+), Level 2 Secondary (#6b7280) for transliteration and English support (weight 400-500), Level 3 Tertiary (#9ca3af) for metadata, sublabels, and helper text. No additional gray shades outside this system.
  - **Smart Instructional Notes:** Contextual notes above conjugation table based on verb class, form number, transitivity. Arabic text with English translations in Teacher mode. Student mode: 1 note max.
  - **VERB_CLASS_INFO data:** Arabic descriptions, English translations, and teaching tips for all 6 verb classes.
  - **FORM_NOTES data:** Educational notes for Forms I–X explaining semantic patterns (intensive, causative, reciprocal, etc.).
  - **postRenderInteractive():** Hook called after every render/mode-switch to attach tooltips, notes, and highlighting.
- **Explainability Layer:** Provides explain buttons for all generated noun forms, offering structured bilingual explanations covering root breakdown, pattern name, weak verb notes, and teaching rules.
- **Adaptive Practice Engine (Phase 11.6):** Five exercise types with mode-aware difficulty scaling:
  - **Conjugation Selection** (`conj`): Pick correct conjugated form for a given pronoun/tense. Teacher mode adds harder pronoun targets (1s, 2ms for past tense).
  - **Masdar Identification** (`masdar`): Identify the verbal noun from distractors (participles, verb forms).
  - **Participle Recognition** (`participle`): Active participle (both modes) + passive participle (teacher only).
  - **Verb Type Recognition** (`verbtype`): Transitive/intransitive classification. Teacher mode adds verb class identification (hollow, defective, etc.).
  - **Form Meaning Awareness** (`formmeaning`): What does Form X typically convey? Only appears for Forms II+ using `FORM_MEANING_DATA`.
  - **Difficulty scaling:** `getDifficulty(d)` scores 1–5 based on form number + verb class. Student mode = 3 exercises (easier pool); Teacher mode = up to 5 (includes passive participle, verb class, harder pronouns). Roman numeral measure parsed via `parseForm()` using `ROMAN_TO_NUM` map.
  - **Session UI:** Session header with question count, progress indicators (X / Y) on each card, type tag badges, bilingual feedback (Arabic + English), score bar with "New Session" retry button.
  - **Preserved:** `renderExCard`, `exAnswer`, `exCheckInput`, `showExScore`, event delegation, `pgRecord()` progress tracking.
- **Progress & Memory System:** localStorage-backed progress tracking (`rootify_progress`) records per-verb exercise performance (attempts, correct, status, lastSeen). Status transitions: new → practicing → learned (≥4 attempts, ≥75% correct) or needs_review (any incorrect answer). Integrated into: home screen progress bar (practiced/learned/review counts), review section (chips for needs_review verbs with one-click re-analysis), hero card status badge (New/Learned/Review), and learn mode progress indicator.
- **Teacher Export:** Three export types generating printable HTML via `window.open()` + `window.print()`:
  - Single Verb Study Sheet: verb info, core conjugation, derivations, example, common pattern/mistake, 2–3 practice items with answer key
  - Multi-Verb Worksheet: verb selector modal (recent + review verbs), compact conjugation summary, exercises, answer key on separate page
  - Review Sheet: verbs with needs_review/practicing status, lightweight practice for retention
  - All exports use Amiri font, RTL Arabic-first layout, professional classroom-friendly print CSS with page breaks and `@media print` rules

# External Dependencies

- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **API Framework:** Express 5
- **Validation:** Zod, `drizzle-zod`
- **API Codegen:** Orval (from OpenAPI spec)
- **Build Tool:** esbuild