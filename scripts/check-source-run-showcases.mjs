#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const failures = []

const sourceRunProjects = [
  // Generated current pending source-run check entries.
  {
    name: "Sticker Sheet Style Drift Mixer",
    route: "src/app/sticker-sheet-style-drift-mixer-claude-demo/page.tsx",
    projectId: "STICKER_SHEET_STYLE_DRIFT_MIXER_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/sticker-sheet-style-drift-mixer-claude-demo",
    packagePath: "seed-runs/sticker-sheet-style-drift-mixer-claude-source-run.json",
  },
  {
    name: "YouTube Scene Budget Beat Sorter",
    route: "src/app/youtube-scene-budget-beat-sorter-gemini-demo/page.tsx",
    projectId: "YOUTUBE_SCENE_BUDGET_BEAT_SORTER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/youtube-scene-budget-beat-sorter-gemini-demo",
    packagePath: "seed-runs/youtube-scene-budget-beat-sorter-gemini-source-run.json",
  },
  {
    name: "Reader Promise Evidence Ladder",
    route: "src/app/reader-promise-evidence-ladder-chatgpt-demo/page.tsx",
    projectId: "READER_PROMISE_EVIDENCE_LADDER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/reader-promise-evidence-ladder-chatgpt-demo",
    packagePath: "seed-runs/reader-promise-evidence-ladder-chatgpt-source-run.json",
  },
  {
    name: "Four-Week Content Gap Heatmap",
    route: "src/app/four-week-content-gap-heatmap-gemini-demo/page.tsx",
    projectId: "FOUR_WEEK_CONTENT_GAP_HEATMAP_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/four-week-content-gap-heatmap-gemini-demo",
    packagePath: "seed-runs/four-week-content-gap-heatmap-gemini-source-run.json",
  },
  {
    name: "YouTube Title Tag Safe-Zone Board",
    route: "src/app/youtube-title-tag-safe-zone-board-claude-demo/page.tsx",
    projectId: "YOUTUBE_TITLE_TAG_SAFE_ZONE_BOARD_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/youtube-title-tag-safe-zone-board-claude-demo",
    packagePath: "seed-runs/youtube-title-tag-safe-zone-board-claude-source-run.json",
  },
  {
    name: "Meta Tag CTR Card Duel",
    route: "src/app/meta-tag-ctr-card-duel-chatgpt-demo/page.tsx",
    projectId: "META_TAG_CTR_CARD_DUEL_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/meta-tag-ctr-card-duel-chatgpt-demo",
    packagePath: "seed-runs/meta-tag-ctr-card-duel-chatgpt-source-run.json",
  },
  {
    name: "Campaign Caption Ingredient Mixer",
    route: "src/app/campaign-caption-ingredient-mixer-gemini-demo/page.tsx",
    projectId: "CAMPAIGN_CAPTION_INGREDIENT_MIXER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/campaign-caption-ingredient-mixer-gemini-demo",
    packagePath: "seed-runs/campaign-caption-ingredient-mixer-gemini-source-run.json",
  },
  {
    name: "Icon Set Style Consistency Tiles",
    route: "src/app/icon-set-style-consistency-tiles-claude-demo/page.tsx",
    projectId: "ICON_SET_STYLE_CONSISTENCY_TILES_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/icon-set-style-consistency-tiles-claude-demo",
    packagePath: "seed-runs/icon-set-style-consistency-tiles-claude-source-run.json",
  },
  {
    name: "Forum Reply Helpfulness Dial",
    route: "src/app/forum-reply-helpfulness-dial-chatgpt-demo/page.tsx",
    projectId: "FORUM_REPLY_HELPFULNESS_DIAL_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/forum-reply-helpfulness-dial-chatgpt-demo",
    packagePath: "seed-runs/forum-reply-helpfulness-dial-chatgpt-source-run.json",
  },
  {
    name: "YouTube B-roll Coverage Card Dealer",
    route: "src/app/youtube-broll-coverage-card-dealer-chatgpt-demo/page.tsx",
    projectId: "YOUTUBE_BROLL_COVERAGE_CARD_DEALER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/youtube-broll-coverage-card-dealer-chatgpt-demo",
    packagePath: "seed-runs/youtube-broll-coverage-card-dealer-chatgpt-source-run.json",
  },
  {
    name: "Content Calendar Collision Resolver",
    route: "src/app/content-calendar-collision-resolver-gemini-demo/page.tsx",
    projectId: "CONTENT_CALENDAR_COLLISION_RESOLVER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/content-calendar-collision-resolver-gemini-demo",
    packagePath: "seed-runs/content-calendar-collision-resolver-gemini-source-run.json",
  },
  {
    name: "Thumbnail Safe-Zone Storyboard",
    route: "src/app/thumbnail-safe-zone-storyboard-claude-demo/page.tsx",
    projectId: "THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/thumbnail-safe-zone-storyboard-claude-demo",
    packagePath: "seed-runs/thumbnail-safe-zone-storyboard-claude-source-run.json",
  },
  {
    name: "Recipe Pop-Up Menu Profit Cards",
    route: "src/app/recipe-pop-up-menu-profit-cards-gemini-demo/page.tsx",
    projectId: "RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/recipe-pop-up-menu-profit-cards-gemini-demo",
    packagePath: "seed-runs/recipe-pop-up-menu-profit-cards-gemini-source-run.json",
  },
  {
    name: "Draft Voice Consistency Meter",
    route: "src/app/draft-voice-consistency-meter-chatgpt-demo/page.tsx",
    projectId: "DRAFT_VOICE_CONSISTENCY_METER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/draft-voice-consistency-meter-chatgpt-demo",
    packagePath: "seed-runs/draft-voice-consistency-meter-chatgpt-source-run.json",
  },
  {
    name: "Recipe Pop-Up Menu Profit Cards",
    route: "src/app/recipe-pop-up-menu-profit-cards-gemini-a4fd2166-demo/page.tsx",
    projectId: "RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_A4FD2166_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/recipe-pop-up-menu-profit-cards-gemini-a4fd2166-demo",
    packagePath: "seed-runs/recipe-pop-up-menu-profit-cards-gemini-a4fd2166-source-run.json",
  },
  {
    name: "Visual Prompt Ingredient Balance Studio",
    route: "src/app/visual-prompt-ingredient-balance-studio-chatgpt-demo/page.tsx",
    projectId: "VISUAL_PROMPT_INGREDIENT_BALANCE_STUDIO_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/visual-prompt-ingredient-balance-studio-chatgpt-demo",
    packagePath: "seed-runs/visual-prompt-ingredient-balance-studio-chatgpt-source-run.json",
  },
  {
    name: "Search Result Promise Proof Board",
    route: "src/app/search-result-promise-proof-board-chatgpt-demo/page.tsx",
    projectId: "SEARCH_RESULT_PROMISE_PROOF_BOARD_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/search-result-promise-proof-board-chatgpt-demo",
    packagePath: "seed-runs/search-result-promise-proof-board-chatgpt-source-run.json",
  },
  {
    name: "Visual Brief Consistency Board",
    route: "src/app/visual-brief-consistency-board-claude-demo/page.tsx",
    projectId: "VISUAL_BRIEF_CONSISTENCY_BOARD_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/visual-brief-consistency-board-claude-demo",
    packagePath: "seed-runs/visual-brief-consistency-board-claude-source-run.json",
  },
  {
    name: "Product Claim Shelf Audit Cards",
    route: "src/app/product-claim-shelf-audit-cards-gemini-demo/page.tsx",
    projectId: "PRODUCT_CLAIM_SHELF_AUDIT_CARDS_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/product-claim-shelf-audit-cards-gemini-demo",
    packagePath: "seed-runs/product-claim-shelf-audit-cards-gemini-source-run.json",
  },
  {
    name: "Headline Promise Bracket",
    route: "src/app/headline-promise-bracket-chatgpt-demo/page.tsx",
    projectId: "HEADLINE_PROMISE_BRACKET_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/headline-promise-bracket-chatgpt-demo",
    packagePath: "seed-runs/headline-promise-bracket-chatgpt-source-run.json",
  },
  {
    name: "Pantry Substitution Confidence Stack",
    route: "src/app/pantry-substitution-confidence-stack-gemini-demo/page.tsx",
    projectId: "PANTRY_SUBSTITUTION_CONFIDENCE_STACK_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/pantry-substitution-confidence-stack-gemini-demo",
    packagePath: "seed-runs/pantry-substitution-confidence-stack-gemini-source-run.json",
  },
  {
    name: "FAQ Answer Freshness Flashcards",
    route: "src/app/faq-answer-freshness-flashcards-chatgpt-demo/page.tsx",
    projectId: "FAQ_ANSWER_FRESHNESS_FLASHCARDS_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/faq-answer-freshness-flashcards-chatgpt-demo",
    packagePath: "seed-runs/faq-answer-freshness-flashcards-chatgpt-source-run.json",
  },
  {
    name: "Recipe Leftover Caption Pack Sorter",
    route: "src/app/recipe-leftover-caption-pack-sorter-gemini-demo/page.tsx",
    projectId: "RECIPE_LEFTOVER_CAPTION_PACK_SORTER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/recipe-leftover-caption-pack-sorter-gemini-demo",
    packagePath: "seed-runs/recipe-leftover-caption-pack-sorter-gemini-source-run.json",
  },
  {
    name: "Article Freshness Rewrite Triage Wheel",
    route: "src/app/article-freshness-rewrite-triage-wheel-chatgpt-demo/page.tsx",
    projectId: "ARTICLE_FRESHNESS_REWRITE_TRIAGE_WHEEL_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/article-freshness-rewrite-triage-wheel-chatgpt-demo",
    packagePath: "seed-runs/article-freshness-rewrite-triage-wheel-chatgpt-source-run.json",
  },
  {
    name: "Instagram Caption CTA Mix Board",
    route: "src/app/instagram-caption-cta-mix-board-gemini-demo/page.tsx",
    projectId: "INSTAGRAM_CAPTION_CTA_MIX_BOARD_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/instagram-caption-cta-mix-board-gemini-demo",
    packagePath: "seed-runs/instagram-caption-cta-mix-board-gemini-source-run.json",
  },
  {
    name: "Back-Cover Blurb Beat Mapper",
    route: "src/app/back-cover-blurb-beat-mapper-claude-demo/page.tsx",
    projectId: "BACK_COVER_BLURB_BEAT_MAPPER_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/back-cover-blurb-beat-mapper-claude-demo",
    packagePath: "seed-runs/back-cover-blurb-beat-mapper-claude-source-run.json",
  },
  {
    name: "Product Objection Q&A Shelf",
    route: "src/app/product-objection-qa-shelf-chatgpt-demo/page.tsx",
    projectId: "PRODUCT_OBJECTION_QA_SHELF_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/product-objection-qa-shelf-chatgpt-demo",
    packagePath: "seed-runs/product-objection-qa-shelf-chatgpt-source-run.json",
  },
  {
    name: "Long Thread TLDR Fact Deck",
    route: "src/app/long-thread-tldr-fact-deck-openrouter-nex-demo/page.tsx",
    projectId: "LONG_THREAD_TLDR_FACT_DECK_OPENROUTER_NEX_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/long-thread-tldr-fact-deck-openrouter-nex-demo",
    packagePath: "seed-runs/long-thread-tldr-fact-deck-openrouter-nex-source-run.json",
  },
  {
    name: "Community Answer Evidence Balance Board",
    route: "src/app/community-answer-evidence-balance-openrouter-nemotron-demo/page.tsx",
    projectId: "COMMUNITY_ANSWER_EVIDENCE_BALANCE_OPENROUTER_NEMOTRON_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/community-answer-evidence-balance-openrouter-nemotron-demo",
    packagePath: "seed-runs/community-answer-evidence-balance-openrouter-nemotron-source-run.json",
  },
  {
    name: "Product Photo Prompt Card Studio",
    route: "src/app/product-photo-prompt-card-studio-gemini-demo/page.tsx",
    projectId: "PRODUCT_PHOTO_PROMPT_CARD_STUDIO_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/product-photo-prompt-card-studio-gemini-demo",
    packagePath: "seed-runs/product-photo-prompt-card-studio-gemini-source-run.json",
  },
  {
    name: "Proposal Red Flag Heatmap",
    route: "src/app/proposal-red-flag-heatmap-claude-demo/page.tsx",
    projectId: "PROPOSAL_RED_FLAG_HEATMAP_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/proposal-red-flag-heatmap-claude-demo",
    packagePath: "seed-runs/proposal-red-flag-heatmap-claude-source-run.json",
  },
  {
    name: "YouTube Cold Open Beat Board",
    route: "src/app/youtube-cold-open-beat-board-chatgpt-demo/page.tsx",
    projectId: "YOUTUBE_COLD_OPEN_BEAT_BOARD_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/youtube-cold-open-beat-board-chatgpt-demo",
    packagePath: "seed-runs/youtube-cold-open-beat-board-chatgpt-source-run.json",
  },
  {
    name: "Carousel Hook Continuity Checker",
    route: "src/app/carousel-hook-continuity-checker-claude-demo/page.tsx",
    projectId: "CAROUSEL_HOOK_CONTINUITY_CHECKER_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/carousel-hook-continuity-checker-claude-demo",
    packagePath: "seed-runs/carousel-hook-continuity-checker-claude-source-run.json",
  },
  {
    name: "Four-Week Content Calendar Capacity Grid",
    route: "src/app/four-week-content-calendar-capacity-grid-gemini-demo/page.tsx",
    projectId: "FOUR_WEEK_CONTENT_CALENDAR_CAPACITY_GRID_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/four-week-content-calendar-capacity-grid-gemini-demo",
    packagePath: "seed-runs/four-week-content-calendar-capacity-grid-gemini-source-run.json",
  },
  {
    name: "Client Email Reply Risk Meter",
    route: "src/app/client-email-reply-risk-meter-chatgpt-demo/page.tsx",
    projectId: "CLIENT_EMAIL_REPLY_RISK_METER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/client-email-reply-risk-meter-chatgpt-demo",
    packagePath: "seed-runs/client-email-reply-risk-meter-chatgpt-source-run.json",
  },
  {
    name: "Logo Brief Constraint Mixer",
    route: "src/app/logo-brief-constraint-mixer-claude-demo/page.tsx",
    projectId: "LOGO_BRIEF_CONSTRAINT_MIXER_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/logo-brief-constraint-mixer-claude-demo",
    packagePath: "seed-runs/logo-brief-constraint-mixer-claude-source-run.json",
  },
  {
    name: "Keyword Intent Cluster Sprint",
    route: "src/app/keyword-intent-cluster-sprint-gemini-demo/page.tsx",
    projectId: "KEYWORD_INTENT_CLUSTER_SPRINT_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/keyword-intent-cluster-sprint-gemini-demo",
    packagePath: "seed-runs/keyword-intent-cluster-sprint-gemini-source-run.json",
  },
  {
    name: "Article Claim Evidence Ladder",
    route: "src/app/article-claim-evidence-ladder-chatgpt-demo/page.tsx",
    projectId: "ARTICLE_CLAIM_EVIDENCE_LADDER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/article-claim-evidence-ladder-chatgpt-demo",
    packagePath: "seed-runs/article-claim-evidence-ladder-chatgpt-source-run.json",
  },
  {
    name: "Cookbook Promo Readiness Cards",
    route: "src/app/cookbook-promo-readiness-cards-gemini-demo/page.tsx",
    projectId: "COOKBOOK_PROMO_READINESS_CARDS_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/cookbook-promo-readiness-cards-gemini-demo",
    packagePath: "seed-runs/cookbook-promo-readiness-cards-gemini-source-run.json",
  },
  {
    name: "Chapter Scope Map for Tiny Books",
    route: "src/app/chapter-scope-map-tiny-books-claude-demo/page.tsx",
    projectId: "CHAPTER_SCOPE_MAP_TINY_BOOKS_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/chapter-scope-map-tiny-books-claude-demo",
    packagePath: "seed-runs/chapter-scope-map-tiny-books-claude-source-run.json",
  },
  {
    name: "Short Video Hook Beat Sheet Timer",
    route: "src/app/short-video-hook-beat-sheet-timer-gemini-demo/page.tsx",
    projectId: "SHORT_VIDEO_HOOK_BEAT_SHEET_TIMER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/short-video-hook-beat-sheet-timer-gemini-demo",
    packagePath: "seed-runs/short-video-hook-beat-sheet-timer-gemini-source-run.json",
  },
  {
    name: "Product Description Shelf Card Stress Tester",
    route: "src/app/product-description-shelf-card-stress-tester-chatgpt-demo/page.tsx",
    projectId: "PRODUCT_DESCRIPTION_SHELF_CARD_STRESS_TESTER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/product-description-shelf-card-stress-tester-chatgpt-demo",
    packagePath: "seed-runs/product-description-shelf-card-stress-tester-chatgpt-source-run.json",
  },
  {
    name: "Recipe Promo Batch QA Board",
    route: "src/app/recipe-promo-batch-qa-board-gemini-demo/page.tsx",
    projectId: "RECIPE_PROMO_BATCH_QA_BOARD_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/recipe-promo-batch-qa-board-gemini-demo",
    packagePath: "seed-runs/recipe-promo-batch-qa-board-gemini-source-run.json",
  },
  {
    name: "Pocket Zine Collage Layout Studio",
    route: "src/app/pocket-zine-collage-layout-studio-claude-demo/page.tsx",
    projectId: "POCKET_ZINE_COLLAGE_LAYOUT_STUDIO_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/pocket-zine-collage-layout-studio-claude-demo",
    packagePath: "seed-runs/pocket-zine-collage-layout-studio-claude-source-run.json",
  },
  {
    name: "Offer Salvage Triage Desk",
    route: "src/app/offer-salvage-triage-desk-chatgpt-demo/page.tsx",
    projectId: "OFFER_SALVAGE_TRIAGE_DESK_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/offer-salvage-triage-desk-chatgpt-demo",
    packagePath: "seed-runs/offer-salvage-triage-desk-chatgpt-source-run.json",
  },
  {
    name: "Album Cover Composition Planner",
    route: "src/app/album-cover-composition-planner-claude-demo/page.tsx",
    projectId: "ALBUM_COVER_COMPOSITION_PLANNER_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/album-cover-composition-planner-claude-demo",
    packagePath: "seed-runs/album-cover-composition-planner-claude-source-run.json",
  },
  {
    name: "Bug Report Evidence Triage Board",
    route: "src/app/bug-report-evidence-triage-board-chatgpt-demo/page.tsx",
    projectId: "BUG_REPORT_EVIDENCE_TRIAGE_BOARD_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/bug-report-evidence-triage-board-chatgpt-demo",
    packagePath: "seed-runs/bug-report-evidence-triage-board-chatgpt-source-run.json",
  },
  {
    name: "Scope Creep Change Order Calculator",
    route: "src/app/scope-creep-change-order-calculator-gemini-demo/page.tsx",
    projectId: "SCOPE_CREEP_CHANGE_ORDER_CALCULATOR_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/scope-creep-change-order-calculator-gemini-demo",
    packagePath: "seed-runs/scope-creep-change-order-calculator-gemini-source-run.json",
  },
  {
    name: "Leftover Ingredient Swap Cards",
    route: "src/app/leftover-ingredient-swap-cards-gemini-demo/page.tsx",
    projectId: "LEFTOVER_INGREDIENT_SWAP_CARDS_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/leftover-ingredient-swap-cards-gemini-demo",
    packagePath: "seed-runs/leftover-ingredient-swap-cards-gemini-source-run.json",
  },
  {
    name: "Internal Link Rescue Map",
    route: "src/app/internal-link-rescue-map-chatgpt-demo/page.tsx",
    projectId: "INTERNAL_LINK_RESCUE_MAP_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/internal-link-rescue-map-chatgpt-demo",
    packagePath: "seed-runs/internal-link-rescue-map-chatgpt-source-run.json",
  },
  {
    name: "Voiceover Emotion Tag Timing Board",
    route: "src/app/voiceover-emotion-tag-timing-board-claude-demo/page.tsx",
    projectId: "VOICEOVER_EMOTION_TAG_TIMING_BOARD_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/voiceover-emotion-tag-timing-board-claude-demo",
    packagePath: "seed-runs/voiceover-emotion-tag-timing-board-claude-source-run.json",
  },
  {
    name: "Blog Refresh Brief Sorter",
    route: "src/app/blog-refresh-brief-sorter-chatgpt-demo/page.tsx",
    projectId: "BLOG_REFRESH_BRIEF_SORTER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/blog-refresh-brief-sorter-chatgpt-demo",
    packagePath: "seed-runs/blog-refresh-brief-sorter-chatgpt-source-run.json",
  },
  {
    name: "Short Video Hook Continuity Board",
    route: "src/app/short-video-hook-continuity-board-claude-demo/page.tsx",
    projectId: "SHORT_VIDEO_HOOK_CONTINUITY_BOARD_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/short-video-hook-continuity-board-claude-demo",
    packagePath: "seed-runs/short-video-hook-continuity-board-claude-source-run.json",
  },
  {
    name: "Moodboard Contact Sheet Planner",
    route: "src/app/moodboard-contact-sheet-planner-claude-demo/page.tsx",
    projectId: "MOODBOARD_CONTACT_SHEET_PLANNER_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/moodboard-contact-sheet-planner-claude-demo",
    packagePath: "seed-runs/moodboard-contact-sheet-planner-claude-source-run.json",
  },
  {
    name: "Recipe Yield Card Packager",
    route: "src/app/recipe-yield-card-packager-gemini-demo/page.tsx",
    projectId: "RECIPE_YIELD_CARD_PACKAGER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/recipe-yield-card-packager-gemini-demo",
    packagePath: "seed-runs/recipe-yield-card-packager-gemini-source-run.json",
  },
  {
    name: "Competitor Content Gap Sprint Board",
    route: "src/app/competitor-content-gap-sprint-board-chatgpt-demo/page.tsx",
    projectId: "COMPETITOR_CONTENT_GAP_SPRINT_BOARD_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/competitor-content-gap-sprint-board-chatgpt-demo",
    packagePath: "seed-runs/competitor-content-gap-sprint-board-chatgpt-source-run.json",
  },
  {
    name: "Thumbnail Safe-Zone Storyboard",
    route: "src/app/thumbnail-safe-zone-storyboard-claude-d2d6b9d3-demo/page.tsx",
    projectId: "THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_D2D6B9D3_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/thumbnail-safe-zone-storyboard-claude-d2d6b9d3-demo",
    packagePath: "seed-runs/thumbnail-safe-zone-storyboard-claude-20260612-source-run.json",
  },
  {
    name: "Potluck Allergen Label Mixer",
    route: "src/app/potluck-allergen-label-mixer-gemini-demo/page.tsx",
    projectId: "POTLUCK_ALLERGEN_LABEL_MIXER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/potluck-allergen-label-mixer-gemini-demo",
    packagePath: "seed-runs/potluck-allergen-label-mixer-gemini-source-run.json",
  },
  {
    name: "FAQ Gap Sprint Board",
    route: "src/app/faq-gap-sprint-board-chatgpt-demo/page.tsx",
    projectId: "FAQ_GAP_SPRINT_BOARD_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/faq-gap-sprint-board-chatgpt-demo",
    packagePath: "seed-runs/faq-gap-sprint-board-chatgpt-source-run.json",
  },
  {
    name: "Collectible Card Shot Planner",
    route: "src/app/collectible-card-shot-planner-claude-demo/page.tsx",
    projectId: "COLLECTIBLE_CARD_SHOT_PLANNER_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/collectible-card-shot-planner-claude-demo",
    packagePath: "seed-runs/collectible-card-shot-planner-claude-source-run.json",
  },
  {
    name: "Homepage Claim Evidence Sorter",
    route: "src/app/homepage-claim-evidence-sorter-chatgpt-demo/page.tsx",
    projectId: "HOMEPAGE_CLAIM_EVIDENCE_SORTER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/homepage-claim-evidence-sorter-chatgpt-demo",
    packagePath: "seed-runs/homepage-claim-evidence-sorter-chatgpt-source-run.json",
  },
  {
    name: "Cookout Batch Card Sorter",
    route: "src/app/cookout-batch-card-sorter-gemini-demo/page.tsx",
    projectId: "COOKOUT_BATCH_CARD_SORTER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/cookout-batch-card-sorter-gemini-demo",
    packagePath: "seed-runs/cookout-batch-card-sorter-gemini-source-run.json",
  },
  {
    name: "Leftover Lunchbox Rotation Builder",
    route: "src/app/leftover-lunchbox-rotation-builder-gemini-demo/page.tsx",
    projectId: "LEFTOVER_LUNCHBOX_ROTATION_BUILDER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/leftover-lunchbox-rotation-builder-gemini-demo",
    packagePath: "seed-runs/leftover-lunchbox-rotation-builder-gemini-source-run.json",
  },
  {
    name: "Search Result Promise Proof Board",
    route: "src/app/search-result-promise-proof-board-chatgpt-fd2902be-demo/page.tsx",
    projectId: "SEARCH_RESULT_PROMISE_PROOF_BOARD_CHATGPT_FD2902BE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/search-result-promise-proof-board-chatgpt-fd2902be-demo",
    packagePath: "seed-runs/search-result-promise-proof-board-chatgpt-source-run.preexisting-20260613.json",
  },
  {
    name: "Visual Prompt Drift Inspector",
    route: "src/app/visual-prompt-drift-inspector-claude-demo/page.tsx",
    projectId: "VISUAL_PROMPT_DRIFT_INSPECTOR_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/visual-prompt-drift-inspector-claude-demo",
    packagePath: "seed-runs/visual-prompt-drift-inspector-claude-source-run.json",
  },
  {
    name: "Fridge Tetris Meal Prep Planner",
    route: "src/app/fridge-tetris-meal-prep-planner-gemini-demo/page.tsx",
    projectId: "FRIDGE_TETRIS_MEAL_PREP_PLANNER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/fridge-tetris-meal-prep-planner-gemini-demo",
    packagePath: "seed-runs/fridge-tetris-meal-prep-planner-gemini-source-run.json",
  },
  {
    name: "Keyword Garden Sprint",
    route: "src/app/keyword-garden-sprint-chatgpt-demo/page.tsx",
    projectId: "KEYWORD_GARDEN_SPRINT_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/keyword-garden-sprint-chatgpt-demo",
    packagePath: "seed-runs/keyword-garden-sprint-chatgpt-source-run.json",
  },
  {
    name: "Thumbnail Crop Proof Studio",
    route: "src/app/thumbnail-crop-proof-studio-claude-demo/page.tsx",
    projectId: "THUMBNAIL_CROP_PROOF_STUDIO_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/thumbnail-crop-proof-studio-claude-demo",
    packagePath: "seed-runs/thumbnail-crop-proof-studio-claude-source-run.json",
  },
  {
    name: "Pantry Reel Shot List Cards",
    route: "src/app/pantry-reel-shot-list-cards-gemini-demo/page.tsx",
    projectId: "PANTRY_REEL_SHOT_LIST_CARDS_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/pantry-reel-shot-list-cards-gemini-demo",
    packagePath: "seed-runs/pantry-reel-shot-list-cards-gemini-source-run.json",
  },
  {
    name: "Article Angle Triage Sprint",
    route: "src/app/article-angle-triage-sprint-chatgpt-demo/page.tsx",
    projectId: "ARTICLE_ANGLE_TRIAGE_SPRINT_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/article-angle-triage-sprint-chatgpt-demo",
    packagePath: "seed-runs/article-angle-triage-sprint-chatgpt-source-run.json",
  },
  {
    name: "Pocket Ad Shot Storyboarder",
    route: "src/app/pocket-ad-shot-storyboarder-gemini-demo/page.tsx",
    projectId: "POCKET_AD_SHOT_STORYBOARDER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/pocket-ad-shot-storyboarder-gemini-demo",
    packagePath: "seed-runs/pocket-ad-shot-storyboarder-gemini-source-run.json",
  },
  {
    name: "SERP Snippet Race Board",
    route: "src/app/serp-snippet-race-board-chatgpt-demo/page.tsx",
    projectId: "SERP_SNIPPET_RACE_BOARD_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/serp-snippet-race-board-chatgpt-demo",
    packagePath: "seed-runs/serp-snippet-race-board-chatgpt-source-run.json",
  },
  {
    name: "Recipe Launch Card Studio",
    route: "src/app/recipe-launch-card-studio-gemini-demo/page.tsx",
    projectId: "RECIPE_LAUNCH_CARD_STUDIO_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/recipe-launch-card-studio-gemini-demo",
    packagePath: "seed-runs/recipe-launch-card-studio-gemini-source-run.json",
  },
  {
    name: "Poster Shot Stack Planner",
    route: "src/app/poster-shot-stack-planner-claude-demo/page.tsx",
    projectId: "POSTER_SHOT_STACK_PLANNER_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/poster-shot-stack-planner-claude-demo",
    packagePath: "seed-runs/poster-shot-stack-planner-claude-source-run.json",
  },
  {
    name: "Search Brief Gap Mapper",
    route: "src/app/search-brief-gap-mapper-chatgpt-demo/page.tsx",
    projectId: "SEARCH_BRIEF_GAP_MAPPER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/search-brief-gap-mapper-chatgpt-demo",
    packagePath: "seed-runs/search-brief-gap-mapper-chatgpt-source-run.json",
  },
  {
    name: "Backwards Week Capacity Planner",
    route: "src/app/backwards-week-capacity-planner-chatgpt-demo/page.tsx",
    projectId: "BACKWARDS_WEEK_CAPACITY_PLANNER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/backwards-week-capacity-planner-chatgpt-demo",
    packagePath: "seed-runs/backwards-week-capacity-planner-chatgpt-source-run.json",
  },
  {
    name: "Pocket Cover Prompt Board",
    route: "src/app/pocket-cover-prompt-board-chatgpt-demo/page.tsx",
    projectId: "POCKET_COVER_PROMPT_BOARD_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/pocket-cover-prompt-board-chatgpt-demo",
    packagePath: "seed-runs/pocket-cover-prompt-board-chatgpt-source-run.json",
  },
  {
    name: "Tiny Pixel Stamp Card Maker",
    route: "src/app/tiny-pixel-stamp-card-maker-chatgpt-recovered-demo/page.tsx",
    projectId: "TINY_PIXEL_STAMP_CARD_MAKER_CHATGPT_RECOVERED_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/tiny-pixel-stamp-card-maker-chatgpt-recovered-demo",
    packagePath: "seed-runs/tiny-pixel-stamp-card-maker-chatgpt-recovered-source-run.json",
  },
  {
    name: "Accidental Snapshot Shot List Lab",
    route: "src/app/accidental-snapshot-shot-list-lab-gemini-demo/page.tsx",
    projectId: "ACCIDENTAL_SNAPSHOT_SHOT_LIST_LAB_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/accidental-snapshot-shot-list-lab-gemini-demo",
    packagePath: "seed-runs/accidental-snapshot-shot-list-lab-gemini-source-run.json",
    artifactPaths: ["public/artifacts/accidental-snapshot-shot-list-lab-gemini.html","public/artifacts/accidental-snapshot-shot-list-lab-gemini-v1.html","public/artifacts/accidental-snapshot-shot-list-lab-gemini-v2.html"],
  },
  {
    name: "Reference Image Change Receipt Board",
    route: "src/app/reference-image-change-receipt-board-openrouter-demo/page.tsx",
    projectId: "REFERENCE_IMAGE_CHANGE_RECEIPT_BOARD_OPENROUTER_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/reference-image-change-receipt-board-openrouter-demo",
    packagePath: "seed-runs/reference-image-change-receipt-board-openrouter-source-run.json",
    artifactPaths: ["public/artifacts/reference-image-change-receipt-board-openrouter.html","public/artifacts/reference-image-change-receipt-board-openrouter-v1.html","public/artifacts/reference-image-change-receipt-board-openrouter-v2.html"],
  },
  {
    name: "Product Photo Shot-List Tile Sorter",
    route: "src/app/product-photo-shot-list-tile-sorter-chatgpt-demo/page.tsx",
    projectId: "PRODUCT_PHOTO_SHOT_LIST_TILE_SORTER_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/product-photo-shot-list-tile-sorter-chatgpt-demo",
    packagePath: "seed-runs/product-photo-shot-list-tile-sorter-chatgpt-source-run.json",
    artifactPaths: ["public/artifacts/product-photo-shot-list-tile-sorter-chatgpt.html"],
  },
  {
    name: "Character Scene Beat Continuity Board",
    route: "src/app/character-scene-beat-continuity-board-claude-demo/page.tsx",
    projectId: "CHARACTER_SCENE_BEAT_CONTINUITY_BOARD_CLAUDE_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/character-scene-beat-continuity-board-claude-demo",
    packagePath: "seed-runs/character-scene-beat-continuity-board-claude-source-run.json",
    artifactPaths: ["public/artifacts/character-scene-beat-continuity-board-claude.html","public/artifacts/character-scene-beat-continuity-board-claude-v1.html","public/artifacts/character-scene-beat-continuity-board-claude-v2.html"],
  },
  {
    name: "Search Result Snippet Proof Lab",
    route: "src/app/search-result-snippet-proof-lab-openrouter-demo/page.tsx",
    projectId: "SEARCH_RESULT_SNIPPET_PROOF_LAB_OPENROUTER_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/search-result-snippet-proof-lab-openrouter-demo",
    packagePath: "seed-runs/search-result-snippet-proof-lab-openrouter-source-run.json",
    artifactPaths: ["public/artifacts/search-result-snippet-proof-lab-openrouter.html","public/artifacts/search-result-snippet-proof-lab-openrouter-v1.html","public/artifacts/search-result-snippet-proof-lab-openrouter-v2.html","public/artifacts/search-result-snippet-proof-lab-openrouter-v3.html"],
  },
  {
    name: "Interview Answer Proof Drill Cards",
    route: "src/app/interview-answer-proof-drill-cards-chatgpt-demo/page.tsx",
    projectId: "INTERVIEW_ANSWER_PROOF_DRILL_CARDS_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/interview-answer-proof-drill-cards-chatgpt-demo",
    packagePath: "seed-runs/interview-answer-proof-drill-cards-chatgpt-source-run.json",
    artifactPaths: ["public/artifacts/interview-answer-proof-drill-cards-chatgpt.html","public/artifacts/interview-answer-proof-drill-cards-chatgpt-v1.html"],
  },
  {
    name: "Prompt Remix Recipe Card Game",
    route: "src/app/prompt-remix-recipe-card-game-gemini-demo/page.tsx",
    projectId: "PROMPT_REMIX_RECIPE_CARD_GAME_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/prompt-remix-recipe-card-game-gemini-demo",
    packagePath: "seed-runs/prompt-remix-recipe-card-game-gemini-source-run.json",
    artifactPaths: ["public/artifacts/prompt-remix-recipe-card-game-gemini.html","public/artifacts/prompt-remix-recipe-card-game-gemini-v1.html","public/artifacts/prompt-remix-recipe-card-game-gemini-v2.html"],
  },
  {
    name: "Phone Chat Screenshot Storyboard Studio",
    route: "src/app/phone-chat-screenshot-storyboard-studio-openrouter-kimi-demo/page.tsx",
    projectId: "PHONE_CHAT_SCREENSHOT_STORYBOARD_STUDIO_OPENROUTER_KIMI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/phone-chat-screenshot-storyboard-studio-openrouter-kimi-demo",
    packagePath: "seed-runs/phone-chat-screenshot-storyboard-studio-openrouter-kimi-source-run.json",
    artifactPaths: ["public/artifacts/phone-chat-screenshot-storyboard-studio-openrouter-kimi.html","public/artifacts/phone-chat-screenshot-storyboard-studio-openrouter-kimi-v1.html","public/artifacts/phone-chat-screenshot-storyboard-studio-openrouter-kimi-v2.html"],
  },
  {
    name: "Local Micro-Adventure Route Mixer",
    route: "src/app/local-micro-adventure-route-mixer-gemini-demo/page.tsx",
    projectId: "LOCAL_MICRO_ADVENTURE_ROUTE_MIXER_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/local-micro-adventure-route-mixer-gemini-demo",
    packagePath: "seed-runs/local-micro-adventure-route-mixer-gemini-source-run.json",
    artifactPaths: ["public/artifacts/local-micro-adventure-route-mixer-gemini.html","public/artifacts/local-micro-adventure-route-mixer-gemini-v1.html","public/artifacts/local-micro-adventure-route-mixer-gemini-v2.html","public/artifacts/local-micro-adventure-route-mixer-gemini-v3.html"],
  },
  {
    name: "Portfolio Case Study Proof Cards",
    route: "src/app/portfolio-case-study-proof-cards-chatgpt-demo/page.tsx",
    projectId: "PORTFOLIO_CASE_STUDY_PROOF_CARDS_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/portfolio-case-study-proof-cards-chatgpt-demo",
    packagePath: "seed-runs/portfolio-case-study-proof-cards-chatgpt-source-run.json",
    artifactPaths: ["public/artifacts/portfolio-case-study-proof-cards-chatgpt.html"],
  },
  {
    name: "Source Citation Freshness Flipbook",
    route: "src/app/source-citation-freshness-flipbook-openrouter-qwen-demo/page.tsx",
    projectId: "SOURCE_CITATION_FRESHNESS_FLIPBOOK_OPENROUTER_QWEN_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/source-citation-freshness-flipbook-openrouter-qwen-demo",
    packagePath: "seed-runs/source-citation-freshness-flipbook-openrouter-qwen-source-run.json",
    artifactPaths: ["public/artifacts/source-citation-freshness-flipbook-openrouter-qwen.html","public/artifacts/source-citation-freshness-flipbook-openrouter-qwen-v1.html","public/artifacts/source-citation-freshness-flipbook-openrouter-qwen-v2.html"],
  },
  {
    name: "Travel Poster Layout Stamp Game",
    route: "src/app/travel-poster-layout-stamp-game-gemini-demo/page.tsx",
    projectId: "TRAVEL_POSTER_LAYOUT_STAMP_GAME_GEMINI_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/travel-poster-layout-stamp-game-gemini-demo",
    packagePath: "seed-runs/travel-poster-layout-stamp-game-gemini-source-run.json",
    artifactPaths: ["public/artifacts/travel-poster-layout-stamp-game-gemini.html","public/artifacts/travel-poster-layout-stamp-game-gemini-v1.html","public/artifacts/travel-poster-layout-stamp-game-gemini-v2.html","public/artifacts/travel-poster-layout-stamp-game-gemini-v3.html"],
  },
  {
    name: "Reference Photo Fidelity Tile Board",
    route: "src/app/reference-photo-fidelity-tile-board-openrouter-deepseek-demo/page.tsx",
    projectId: "REFERENCE_PHOTO_FIDELITY_TILE_BOARD_OPENROUTER_DEEPSEEK_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/reference-photo-fidelity-tile-board-openrouter-deepseek-demo",
    packagePath: "seed-runs/reference-photo-fidelity-tile-board-openrouter-deepseek-source-run.json",
    artifactPaths: ["public/artifacts/reference-photo-fidelity-tile-board-openrouter-deepseek.html","public/artifacts/reference-photo-fidelity-tile-board-openrouter-deepseek-v1.html"],
  },
  {
    name: "Landing Page Proof Receipt",
    route: "src/app/landing-page-proof-receipt-chatgpt-demo/page.tsx",
    projectId: "LANDING_PAGE_PROOF_RECEIPT_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/landing-page-proof-receipt-chatgpt-demo",
    packagePath: "seed-runs/landing-page-proof-receipt-chatgpt-source-run.json",
    artifactPaths: ["public/artifacts/landing-page-proof-receipt-chatgpt.html"],
  },
  {
    name: "Prompt Pattern Swap Workshop",
    route: "src/app/prompt-pattern-swap-workshop-openrouter-claude-haiku-demo/page.tsx",
    projectId: "PROMPT_PATTERN_SWAP_WORKSHOP_OPENROUTER_CLAUDE_HAIKU_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/prompt-pattern-swap-workshop-openrouter-claude-haiku-demo",
    packagePath: "seed-runs/prompt-pattern-swap-workshop-openrouter-claude-haiku-source-run.json",
    artifactPaths: ["public/artifacts/prompt-pattern-swap-workshop-openrouter-claude-haiku.html","public/artifacts/prompt-pattern-swap-workshop-openrouter-claude-haiku-v1.html"],
  },
  {
    name: "Micro Image Brief Consistency Tiles",
    route: "src/app/micro-image-brief-consistency-tiles-chatgpt-demo/page.tsx",
    projectId: "MICRO_IMAGE_BRIEF_CONSISTENCY_TILES_CHATGPT_PROJECT_ID",
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: "/micro-image-brief-consistency-tiles-chatgpt-demo",
    packagePath: "seed-runs/micro-image-brief-consistency-tiles-chatgpt-source-run.json",
    artifactPaths: ["public/artifacts/micro-image-brief-consistency-tiles-chatgpt.html","public/artifacts/micro-image-brief-consistency-tiles-chatgpt-v1.html"],
  },
  // End generated current pending source-run check entries.
  {
    name: "Tiny Train Platform Dispatcher",
    route: 'src/app/tiny-train-platform-dispatcher-demo/page.tsx',
    projectId: 'TINY_TRAIN_DISPATCHER_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-train-platform-dispatcher-demo',
    packagePath: 'seed-runs/tiny-train-platform-dispatcher-claude-source-run.json',
  },
  {
    name: "Breakroom Snack Restock Planner",
    route: 'src/app/breakroom-snack-restock-planner-demo/page.tsx',
    projectId: 'BREAKROOM_SNACK_RESTOCK_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/breakroom-snack-restock-planner-demo',
    packagePath: 'seed-runs/breakroom-snack-restock-planner-gemini-source-run.json',
  },
  {
    name: "Porch Light Moth Maze",
    route: 'src/app/porch-light-moth-maze-demo/page.tsx',
    projectId: 'PORCH_LIGHT_MOTH_MAZE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/porch-light-moth-maze-demo',
    packagePath: 'seed-runs/porch-light-moth-maze-chatgpt-source-run.json',
  },
  {
    name: "Pantry Shelf-Life Rescue Planner",
    route: 'src/app/pantry-shelf-life-rescue-planner-demo/page.tsx',
    projectId: 'PANTRY_SHELF_LIFE_RESCUE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/pantry-shelf-life-rescue-planner-demo',
    packagePath: 'seed-runs/pantry-shelf-life-rescue-gemini-source-run.json',
  },
  {
    name: "Mini Harbor Tugboat Switcher",
    route: 'src/app/mini-harbor-tugboat-switcher-demo/page.tsx',
    projectId: 'MINI_HARBOR_TUGBOAT_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/mini-harbor-tugboat-switcher-demo',
    packagePath: 'seed-runs/mini-harbor-tugboat-switcher-chatgpt-source-run.json',
  },
  {
    name: "Tiny Farmers Market Booth Simulator",
    route: 'src/app/tiny-farmers-market-booth-simulator-demo/page.tsx',
    projectId: 'TINY_FARMERS_MARKET_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-farmers-market-booth-simulator-demo',
    packagePath: 'seed-runs/tiny-farmers-market-booth-claude-source-run.json',
  },
  {
    name: "Roommate Chore Draft Board",
    route: 'src/app/roommate-chore-draft-board-demo/page.tsx',
    projectId: 'ROOMMATE_CHORE_DRAFT_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/roommate-chore-draft-board-demo',
    packagePath: 'seed-runs/roommate-chore-draft-board-gemini-source-run.json',
  },
  {
    name: "Pocket Pirate Map Decoder",
    route: 'src/app/pocket-pirate-map-decoder-demo/page.tsx',
    projectId: 'POCKET_PIRATE_MAP_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/pocket-pirate-map-decoder-demo',
    packagePath: 'seed-runs/pocket-pirate-map-decoder-chatgpt-source-run.json',
  },
  {
    name: "Potluck Table Planner",
    route: 'src/app/potluck-table-planner-demo/page.tsx',
    projectId: 'POTLUCK_TABLE_PLANNER_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/potluck-table-planner-demo',
    packagePath: 'seed-runs/potluck-table-planner-gemini-source-run.json',
  },
  {
    name: "Rainy Window Cafe Rush",
    route: 'src/app/rainy-window-cafe-rush-demo/page.tsx',
    projectId: 'RAINY_WINDOW_CAFE_RUSH_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/rainy-window-cafe-rush-demo',
    packagePath: 'seed-runs/rainy-window-cafe-rush-chatgpt-source-run.json',
  },
  {
    name: "Lunchbox Conveyor Sorter",
    route: 'src/app/lunchbox-conveyor-sorter-demo/page.tsx',
    projectId: 'LUNCHBOX_CONVEYOR_SORTER_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/lunchbox-conveyor-sorter-demo',
    packagePath: 'seed-runs/lunchbox-conveyor-sorter-chatgpt-source-run.json',
  },
  {
    name: "Porch Plant Watering Planner",
    route: 'src/app/porch-plant-watering-planner-demo/page.tsx',
    projectId: 'PORCH_PLANT_WATERING_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/porch-plant-watering-planner-demo',
    packagePath: 'seed-runs/porch-plant-watering-planner-claude-source-run.json',
  },
  {
    name: "Shared Errand Route Board",
    route: 'src/app/shared-errand-route-board-demo/page.tsx',
    projectId: 'SHARED_ERRAND_ROUTE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/shared-errand-route-board-demo',
    packagePath: 'seed-runs/shared-errand-route-board-gemini-source-run.json',
  },
  {
    name: "Mini Golf Windmill Putt",
    route: 'src/app/mini-golf-windmill-putt-demo/page.tsx',
    projectId: 'MINI_GOLF_WINDMILL_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/mini-golf-windmill-putt-demo',
    packagePath: 'seed-runs/mini-golf-windmill-putt-chatgpt-source-run.json',
  },
  {
    name: "Leftover Dinner Decision Board",
    route: 'src/app/leftover-dinner-decision-board-demo/page.tsx',
    projectId: 'LEFTOVER_DINNER_BOARD_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/leftover-dinner-decision-board-demo',
    packagePath: 'seed-runs/leftover-dinner-board-gemini-source-run.json',
  },
  {
    name: "Tiny Loop Sequencer",
    route: 'src/app/tiny-loop-sequencer-demo/page.tsx',
    projectId: 'TINY_LOOP_SEQUENCER_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-loop-sequencer-demo',
    packagePath: 'seed-runs/tiny-loop-sequencer-claude-source-run.json',
  },
  {
    name: "Garage Sale Price Tag Maker",
    route: 'src/app/garage-sale-price-tag-maker-demo/page.tsx',
    projectId: 'GARAGE_SALE_TAGS_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/garage-sale-price-tag-maker-demo',
    packagePath: 'seed-runs/garage-sale-tags-gemini-source-run.json',
  },
  {
    name: "Micro Dungeon Route Puzzle",
    route: 'src/app/micro-dungeon-route-puzzle-demo/page.tsx',
    projectId: 'MICRO_DUNGEON_ROUTE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/micro-dungeon-route-puzzle-demo',
    packagePath: 'seed-runs/micro-dungeon-route-chatgpt-source-run.json',
  },
  {
    name: "Pocket Bake-Sale Margin Calculator",
    route: 'src/app/pocket-bake-sale-margin-calculator-demo/page.tsx',
    projectId: 'BAKE_SALE_MARGIN_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/pocket-bake-sale-margin-calculator-demo',
    packagePath: 'seed-runs/bake-sale-margin-gemini-source-run.json',
  },
  {
    name: "Backyard Star-Map Scavenger Hunt Builder",
    route: 'src/app/backyard-star-map-scavenger-hunt-builder-demo/page.tsx',
    projectId: 'STAR_MAP_SCAVENGER_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/backyard-star-map-scavenger-hunt-builder-demo',
    packagePath: 'seed-runs/star-map-scavenger-chatgpt-source-run.json',
  },
  {
    name: "Neighborhood Lost-and-Found Claim Board",
    route: 'src/app/neighborhood-lost-and-found-claim-board-demo/page.tsx',
    projectId: 'NEIGHBORHOOD_LOST_AND_FOUND_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/neighborhood-lost-and-found-claim-board-demo',
    packagePath: 'seed-runs/neighborhood-lost-and-found-claim-board-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Tiny Diner Ticket Time Trial",
    route: 'src/app/tiny-diner-ticket-time-trial-demo/page.tsx',
    projectId: 'TINY_DINER_TICKET_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-diner-ticket-time-trial-demo',
    packagePath: 'seed-runs/tiny-diner-ticket-time-trial-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Small Clinic Callback Queue Board",
    route: 'src/app/small-clinic-callback-queue-board-demo/page.tsx',
    projectId: 'SMALL_CLINIC_CALLBACK_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/small-clinic-callback-queue-board-demo',
    packagePath: 'seed-runs/small-clinic-callback-queue-board-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Tiny Birthday RSVP Table Planner",
    route: 'src/app/tiny-birthday-rsvp-table-planner-demo/page.tsx',
    projectId: 'TINY_BIRTHDAY_RSVP_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-birthday-rsvp-table-planner-demo',
    packagePath: 'seed-runs/tiny-birthday-rsvp-table-planner-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Tiny Airport Gate Boarding Sorter",
    route: 'src/app/tiny-airport-gate-boarding-sorter-demo/page.tsx',
    projectId: 'TINY_AIRPORT_GATE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-airport-gate-boarding-sorter-demo',
    packagePath: 'seed-runs/tiny-airport-gate-boarding-sorter-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Tiny Ferry Loading Puzzle",
    route: 'src/app/tiny-ferry-loading-puzzle-demo/page.tsx',
    projectId: 'TINY_FERRY_LOADING_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-ferry-loading-puzzle-demo',
    packagePath: 'seed-runs/tiny-ferry-loading-puzzle-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "After-School Pickup Roster",
    route: 'src/app/after-school-pickup-roster-demo/page.tsx',
    projectId: 'AFTER_SCHOOL_PICKUP_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/after-school-pickup-roster-demo',
    packagePath: 'seed-runs/after-school-pickup-roster-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Fridge Leftover Label Printer from Gemini Flash",
    route: 'src/app/fridge-leftover-label-printer-demo/page.tsx',
    projectId: 'FRIDGE_LEFTOVER_LABEL_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/fridge-leftover-label-printer-demo',
    packagePath: 'seed-runs/fridge-leftover-label-printer-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Tiny Parking Lot Cone Course",
    route: 'src/app/tiny-parking-lot-cone-course-demo/page.tsx',
    projectId: 'TINY_PARKING_LOT_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-parking-lot-cone-course-demo',
    packagePath: 'seed-runs/tiny-parking-lot-cone-course-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Tiny Window Herb Light Planner",
    route: 'src/app/tiny-window-herb-light-planner-demo/page.tsx',
    projectId: 'TINY_WINDOW_HERB_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-window-herb-light-planner-demo',
    packagePath: 'seed-runs/tiny-window-herb-light-planner-claude-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Pop-Up Dinner Seating Mixer from Gemini Flash",
    route: 'src/app/pop-up-dinner-seating-mixer-demo/page.tsx',
    projectId: 'POPUP_DINNER_SEATING_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/pop-up-dinner-seating-mixer-demo',
    packagePath: 'seed-runs/popup-dinner-seating-mixer-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Tiny Crosswalk Timing Trainer",
    route: 'src/app/tiny-crosswalk-timing-trainer-demo/page.tsx',
    projectId: 'TINY_CROSSWALK_TIMING_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-crosswalk-timing-trainer-demo',
    packagePath: 'seed-runs/tiny-crosswalk-timing-trainer-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Tiny Invoice Nudge Board from Gemini Flash",
    route: 'src/app/tiny-invoice-nudge-board-demo/page.tsx',
    projectId: 'TINY_INVOICE_NUDGE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/tiny-invoice-nudge-board-demo',
    packagePath: 'seed-runs/tiny-invoice-nudge-board-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Mailroom Cart Route Puzzle",
    route: 'src/app/mailroom-cart-route-puzzle-demo/page.tsx',
    projectId: 'MAILROOM_CART_ROUTE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/mailroom-cart-route-puzzle-demo',
    packagePath: 'seed-runs/mailroom-cart-route-puzzle-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Neighborhood Potluck Balancer",
    route: 'src/app/neighborhood-potluck-balancer-demo/page.tsx',
    projectId: 'NEIGHBORHOOD_POTLUCK_BALANCER_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/neighborhood-potluck-balancer-demo',
    packagePath: 'seed-runs/neighborhood-potluck-balancer-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Laundromat Sock Sorter",
    route: 'src/app/laundromat-sock-sorter-demo/page.tsx',
    projectId: 'LAUNDROMAT_SOCK_SORTER_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/laundromat-sock-sorter-demo',
    packagePath: 'seed-runs/laundromat-sock-sorter-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Corner Store Change Rush",
    route: 'src/app/corner-store-change-rush-demo/page.tsx',
    projectId: 'CORNER_STORE_CHANGE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/corner-store-change-rush-demo',
    packagePath: 'seed-runs/corner-store-change-rush-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Weekend Yard Sale Table Mapper",
    route: 'src/app/weekend-yard-sale-table-mapper-demo/page.tsx',
    projectId: 'WEEKEND_YARD_SALE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/weekend-yard-sale-table-mapper-demo',
    packagePath: 'seed-runs/weekend-yard-sale-table-mapper-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Mini Metro Signal Desk",
    route: 'src/app/mini-metro-signal-desk-demo/page.tsx',
    projectId: 'MINI_METRO_SIGNAL_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/mini-metro-signal-desk-demo',
    packagePath: 'seed-runs/mini-metro-signal-desk-claude-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Moving Day Box Labeler",
    route: 'src/app/moving-day-box-labeler-demo/page.tsx',
    projectId: 'MOVING_DAY_BOX_LABELER_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/moving-day-box-labeler-demo',
    packagePath: 'seed-runs/moving-day-box-labeler-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Rooftop Courier Switchbacks",
    route: 'src/app/rooftop-courier-switchbacks-demo/page.tsx',
    projectId: 'ROOFTOP_COURIER_SWITCHBACKS_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/rooftop-courier-switchbacks-demo',
    packagePath: 'seed-runs/rooftop-courier-switchbacks-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Neighborhood Snow Route Plow Puzzle",
    route: 'src/app/neighborhood-snow-route-plow-puzzle-demo/page.tsx',
    projectId: 'NEIGHBORHOOD_SNOW_ROUTE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/neighborhood-snow-route-plow-puzzle-demo',
    packagePath: 'seed-runs/neighborhood-snow-route-plow-puzzle-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Roommate Freezer Board",
    route: 'src/app/roommate-freezer-board-demo/page.tsx',
    projectId: 'ROOMMATE_FREEZER_BOARD_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/roommate-freezer-board-demo',
    packagePath: 'seed-runs/roommate-freezer-board-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Utility Bill Balance Board",
    route: 'src/app/utility-bill-balance-board-demo/page.tsx',
    projectId: 'UTILITY_BILL_BALANCE_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/utility-bill-balance-board-demo',
    packagePath: 'seed-runs/utility-bill-balance-board-gemini-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: "Block Bike Courier Light Run",
    route: 'src/app/block-bike-courier-light-run-demo/page.tsx',
    projectId: 'BLOCK_BIKE_COURIER_PROJECT_ID',
    showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
    href: '/block-bike-courier-light-run-demo',
    packagePath: 'seed-runs/bike-courier-light-run-chatgpt-source-run.json',
    expectPersistableAfterPublish: true,
  },
  {
    name: 'Playable Snake Game',
    route: 'src/app/snake-demo/page.tsx',
    projectId: 'SNAKE_PROJECT_ID',
    showcaseExport: 'SNAKE_SHOWCASE_PROJECT',
    href: '/snake-demo',
    packagePath: 'seed-runs/snake-gpt55-pro-oneshot-source-run.json',
    artifactPaths: ['public/artifacts/snake-gpt55-pro-oneshot.html'],
    expectPersistableAfterPublish: true,
  },
  {
    name: 'Interactive Decision Matrix',
    route: 'src/app/decision-matrix-demo/page.tsx',
    projectId: 'DECISION_MATRIX_PROJECT_ID',
    showcaseExport: 'DECISION_MATRIX_SHOWCASE_PROJECT',
    href: '/decision-matrix-demo',
    packagePath: 'seed-runs/decision-matrix-gemini-flash-oneshot.json',
    artifactPaths: ['public/artifacts/decision-matrix-gemini-flash-oneshot.html'],
  },
  {
    name: 'Playable Tic-Tac-Toe',
    route: 'src/app/tic-tac-toe-demo/page.tsx',
    projectId: 'TIC_TAC_TOE_PROJECT_ID',
    showcaseExport: 'TIC_TAC_TOE_SHOWCASE_PROJECT',
    href: '/tic-tac-toe-demo',
    packagePath: 'seed-runs/tic-tac-toe-gemini-flash-basic.json',
    artifactPaths: ['public/artifacts/tic-tac-toe-gemini-flash-basic.html'],
  },
  {
    name: 'HP 10Bii+',
    route: 'src/app/hp-10bii-calculator-demo/page.tsx',
    projectId: 'HP_10BII_PROJECT_ID',
    showcaseExport: 'HP_10BII_SHOWCASE_PROJECT',
    href: '/hp-10bii-calculator-demo',
    packagePath: 'seed-runs/hp-10bii-financial-calculator-claude-opus-48.json',
  },
  {
    name: 'School Desk HP 10Bii+ Calculator Fork',
    route: 'src/app/school-desk-hp-calculator-fork-demo/page.tsx',
    projectId: 'SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID',
    showcaseExport: 'SCHOOL_DESK_HP_CALCULATOR_FORK_SHOWCASE_PROJECT',
    href: '/school-desk-hp-calculator-fork-demo',
    packagePath: 'seed-runs/school-desk-hp-10bii-calculator-claude-5-fable-max-fork.json',
    artifactPaths: [
      'public/artifacts/school-desk-hp-10bii-calculator-claude-5-fable-max-fork.html',
    ],
  },
  {
    name: 'Pomodoro Focus Timer',
    route: 'src/app/pomodoro-timer-demo/page.tsx',
    projectId: 'POMODORO_TIMER_PROJECT_ID',
    showcaseExport: 'POMODORO_TIMER_SHOWCASE_PROJECT',
    href: '/pomodoro-timer-demo',
    artifactPaths: [
      'public/artifacts/pomodoro-step-1.html',
      'public/artifacts/pomodoro-step-2.html',
      'public/artifacts/pomodoro-step-3.html',
      'public/artifacts/pomodoro-step-4.html',
      'public/artifacts/pomodoro-focus-timer-gpt55-instant.html',
    ],
  },
  {
    name: 'Weekend Plan Checklist',
    route: 'src/app/weekend-plan-checklist-demo/page.tsx',
    projectId: 'WEEKEND_CHECKLIST_PROJECT_ID',
    showcaseExport: 'WEEKEND_CHECKLIST_SHOWCASE_PROJECT',
    href: '/weekend-plan-checklist-demo',
    packagePath: 'seed-runs/weekend-plan-checklist-chatgpt-6prompt-fixed.json',
  },
  {
    name: 'Family Road-Trip Readiness Board',
    route: 'src/app/weekend-family-road-trip-readiness-fork-demo/page.tsx',
    projectId: 'WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID',
    showcaseExport: 'WEEKEND_CHECKLIST_REAL_FORK_SHOWCASE_PROJECT',
    href: '/weekend-family-road-trip-readiness-fork-demo',
    packagePath: 'seed-runs/weekend-plan-checklist-chatgpt-family-road-trip-fork.json',
    artifactPaths: [
      'public/artifacts/weekend-plan-checklist-chatgpt-family-road-trip-fork-step-4.html',
    ],
  },
  {
    name: 'Neon Block Patrol',
    route: 'src/app/neon-block-patrol-demo/page.tsx',
    projectId: 'NEON_BLOCK_PATROL_PROJECT_ID',
    showcaseExport: 'NEON_BLOCK_PATROL_SHOWCASE_PROJECT',
    href: '/neon-block-patrol-demo',
    packagePath: 'seed-runs/gta-style-fps-chatgpt-gpt55-heavy-five-prompt.json',
  },
  {
    name: 'Swish City',
    route: 'src/app/swish-city-timing-hoops-demo/page.tsx',
    projectId: 'SWISH_CITY_PROJECT_ID',
    showcaseExport: 'SWISH_CITY_SHOWCASE_PROJECT',
    href: '/swish-city-timing-hoops-demo',
    packagePath: 'seed-runs/swish-city-claude-opus-4-8-source-run.json',
  },
  {
    name: 'Meeting Cost',
    route: 'src/app/meeting-cost-calculator-demo/page.tsx',
    projectId: 'MEETING_COST_PROJECT_ID',
    showcaseExport: 'MEETING_COST_SHOWCASE_PROJECT',
    href: '/meeting-cost-calculator-demo',
    packagePath: 'seed-runs/meeting-cost-calculator-chatgpt-source-run.json',
  },
  {
    name: 'Word Ladder Sprint',
    route: 'src/app/word-ladder-sprint-demo/page.tsx',
    projectId: 'WORD_LADDER_SPRINT_PROJECT_ID',
    showcaseExport: 'WORD_LADDER_SPRINT_SHOWCASE_PROJECT',
    href: '/word-ladder-sprint-demo',
    packagePath: 'seed-runs/word-ladder-sprint-chatgpt-source-run.json',
  },
  {
    name: 'Puzzle Box Escape',
    route: 'src/app/puzzle-box-escape-demo/page.tsx',
    projectId: 'PUZZLE_BOX_ESCAPE_PROJECT_ID',
    showcaseExport: 'PUZZLE_BOX_ESCAPE_SHOWCASE_PROJECT',
    href: '/puzzle-box-escape-demo',
    packagePath: 'seed-runs/puzzle-box-escape-claude-sonnet-46-max-source-run.json',
  },
  {
    name: 'Pocket Rally',
    route: 'src/app/pocket-rally-time-trial-demo/page.tsx',
    projectId: 'POCKET_RALLY_PROJECT_ID',
    showcaseExport: 'POCKET_RALLY_SHOWCASE_PROJECT',
    href: '/pocket-rally-time-trial-demo',
    packagePath: 'seed-runs/pocket-rally-chatgpt-source-run.json',
  },
  {
    name: 'Trip Packing',
    route: 'src/app/trip-packing-planner-demo/page.tsx',
    projectId: 'TRIP_PACKING_PROJECT_ID',
    showcaseExport: 'TRIP_PACKING_SHOWCASE_PROJECT',
    href: '/trip-packing-planner-demo',
    packagePath: 'seed-runs/trip-packing-gemini-pro-source-run.json',
  },
  {
    name: 'Flashcard Cram',
    route: 'src/app/flashcard-cram-drill-demo/page.tsx',
    projectId: 'FLASHCARD_CRAM_PROJECT_ID',
    showcaseExport: 'FLASHCARD_CRAM_SHOWCASE_PROJECT',
    href: '/flashcard-cram-drill-demo',
    packagePath: 'seed-runs/flashcard-cram-gemini-31-pro-source-run.json',
  },
  {
    name: 'Follow-Up CRM',
    route: 'src/app/follow-up-crm-tracker-demo/page.tsx',
    projectId: 'FOLLOW_UP_CRM_PROJECT_ID',
    showcaseExport: 'FOLLOW_UP_CRM_SHOWCASE_PROJECT',
    href: '/follow-up-crm-tracker-demo',
    packagePath: 'seed-runs/follow-up-crm-chatgpt-gpt55-instant-source-run.json',
  },
  {
    name: 'Reaction-Time Trainer',
    route: 'src/app/reaction-time-trainer-demo/page.tsx',
    projectId: 'REACTION_TRAINER_PROJECT_ID',
    showcaseExport: 'REACTION_TRAINER_SHOWCASE_PROJECT',
    href: '/reaction-time-trainer-demo',
    packagePath: 'seed-runs/reaction-trainer-gemini-pro-source-run.json',
  },
  {
    name: 'Tiny Lane Defense',
    route: 'src/app/tiny-lane-defense-demo/page.tsx',
    projectId: 'LANE_DEFENSE_PROJECT_ID',
    showcaseExport: 'LANE_DEFENSE_SHOWCASE_PROJECT',
    href: '/tiny-lane-defense-demo',
    packagePath: 'seed-runs/lane-defense-chatgpt-gpt55-heavy-oneshot.json',
  },
]

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing required file`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function parseJson(path) {
  try {
    return JSON.parse(read(path))
  } catch (error) {
    failures.push(`${path}: invalid JSON: ${error.message}`)
    return null
  }
}

function mustInclude(path, content, text, message) {
  if (!content.includes(text)) failures.push(`${path}: ${message}`)
}

function mustNotInclude(path, content, text, message) {
  if (content.includes(text)) failures.push(`${path}: ${message}`)
}

function mustComeBefore(path, content, beforeText, afterText, message) {
  const beforeIndex = content.indexOf(beforeText)
  const afterIndex = content.indexOf(afterText)

  if (beforeIndex === -1 || afterIndex === -1 || beforeIndex > afterIndex) {
    failures.push(`${path}: ${message}`)
  }
}

function routeDefaultStepNumber(routeContent) {
  const match = routeContent.match(/defaultStepNumber=\{(\d+)\}/)
  return match ? Number(match[1]) : null
}

function generatedArtifactFilesForStep(step) {
  const files = new Set()

  if (typeof step.artifact_version_path === 'string' && step.artifact_version_path.startsWith('public/artifacts/')) {
    files.add(step.artifact_version_path)
  }

  if (Array.isArray(step.generated_files)) {
    for (const filePath of step.generated_files) {
      if (typeof filePath === 'string' && filePath.startsWith('public/artifacts/')) files.add(filePath)
    }
  }

  return [...files]
}

function stepNumberForArtifactPath(steps, artifactPath) {
  if (!artifactPath) return null

  const step = steps.find((item) => generatedArtifactFilesForStep(item).includes(artifactPath))
  return step ? Number(step.step_number) : null
}

function finalArtifactStepNumber(pkg) {
  const steps = Array.isArray(pkg.steps) ? pkg.steps : []
  const explicitFinalStep = stepNumberForArtifactPath(steps, pkg.final_artifact_path)
  if (explicitFinalStep) return explicitFinalStep

  const artifactStepNumbers = steps
    .filter((step) => generatedArtifactFilesForStep(step).length > 0)
    .map((step) => Number(step.step_number))
    .filter((stepNumber) => Number.isFinite(stepNumber))

  return artifactStepNumbers.length > 0 ? Math.max(...artifactStepNumbers) : null
}

function sharedShowcaseRoutes() {
  return readdirSync('src/app', { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `src/app/${entry.name}/page.tsx`)
    .filter((routePath) => existsSync(routePath))
    .filter((routePath) => {
      const routeContent = readFileSync(routePath, 'utf8')
      return (
        routeContent.includes("from '@/components/SourceRunShowcase'") ||
        routeContent.includes("from '@/components/PreparedSourceRunPage'")
      )
    })
}

function demoRoutes() {
  return readdirSync('src/app', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('-demo'))
    .map((entry) => `src/app/${entry.name}/page.tsx`)
    .filter((routePath) => existsSync(routePath))
}

function usesSharedSourceRunRenderer(routeContent) {
  return (
    routeContent.includes("from '@/components/SourceRunShowcase'") ||
    routeContent.includes("from '@/components/PreparedSourceRunPage'")
  )
}

function sourceRunIdForPackage(pkg) {
  return (
    pkg.pathforge_pending_id ??
    pkg.source_run_submission_id ??
    pkg.pathforge_import_result?.source_run_submission_id ??
    null
  )
}

function mapRowsBySourceRunId(rows, label) {
  const map = new Map()

  for (const row of rows) {
    const id = row.sourceRunId ?? row.id
    if (!id) {
      failures.push(`${label}: row is missing sourceRunId/id`)
      continue
    }
    if (map.has(id)) failures.push(`${label}: duplicate source-run id ${id}`)
    map.set(id, row)
  }

  return map
}

function verifyPendingBatchSnapshot() {
  const queueSnapshotPath = process.env.PATHFORGE_PENDING_QUEUE_SNAPSHOT
  const batchSummaryPath = process.env.PATHFORGE_PENDING_BATCH_SUMMARY
  if (!queueSnapshotPath && !batchSummaryPath) return

  if (!queueSnapshotPath || !batchSummaryPath) {
    failures.push(
      'pending batch audit requires both PATHFORGE_PENDING_QUEUE_SNAPSHOT and PATHFORGE_PENDING_BATCH_SUMMARY',
    )
    return
  }

  const liveRows = parseJson(queueSnapshotPath)
  const batchSummary = parseJson(batchSummaryPath)
  if (!Array.isArray(liveRows) || !batchSummary) {
    failures.push('pending batch audit inputs must be a live row array and generated batch summary object')
    return
  }

  const generatedRows = Array.isArray(batchSummary.generated) ? batchSummary.generated : []
  const blockedRows = Array.isArray(batchSummary.blocked) ? batchSummary.blocked : []
  const liveById = mapRowsBySourceRunId(liveRows, queueSnapshotPath)
  const generatedById = mapRowsBySourceRunId(generatedRows, batchSummaryPath)
  const blockedById = mapRowsBySourceRunId(blockedRows, batchSummaryPath)
  const generatedRoutes = new Set()
  const generatedPackages = new Set()

  if (generatedRows.length + blockedRows.length !== liveRows.length) {
    failures.push(
      `${batchSummaryPath}: generated + blocked rows (${generatedRows.length + blockedRows.length}) must equal live pending rows (${liveRows.length})`,
    )
  }

  for (const liveRow of liveRows) {
    const id = liveRow.id ?? liveRow.sourceRunId
    if (!id) continue
    if (generatedById.has(id) && blockedById.has(id)) {
      failures.push(`${id}: pending row appears in both generated and blocked batch lists`)
    }
    if (!generatedById.has(id) && !blockedById.has(id)) {
      failures.push(`${id}: pending row is neither generated nor explicitly blocked`)
    }
    if (!liveRow.noPrepared && !liveRow.preparedReady && !liveRow.publishButton) {
      failures.push(`${id}: pending row status is not recognizable as unprepared or prepared-ready`)
    }
  }

  for (const generated of generatedRows) {
    const id = generated.sourceRunId ?? generated.id
    const liveRow = liveById.get(id)
    if (!id || !liveRow) continue

    const routePath = generated.route
      ? join('src/app', generated.route.replace(/^\//, ''), 'page.tsx')
      : null
    if (!routePath || !existsSync(routePath)) {
      failures.push(`${id}: generated route file is missing at ${routePath ?? '(missing route)'}`)
    } else {
      const routeContent = readFileSync(routePath, 'utf8')
      if (!routeContent.includes("from '@/components/PreparedSourceRunPage'")) {
        failures.push(`${routePath}: generated pending route must use PreparedSourceRunPage`)
      }
      if (!routeContent.includes('buildPreparedSourceRunDetailMetadata')) {
        failures.push(`${routePath}: generated pending route must use standardized metadata helper`)
      }
      if (!routeContent.includes('loadSourceRunPackage')) {
        failures.push(`${routePath}: generated pending route must load its source-run package`)
      }
    }

    if (generated.route) {
      if (generatedRoutes.has(generated.route)) failures.push(`${generated.route}: duplicate generated route`)
      generatedRoutes.add(generated.route)
    }

    if (!generated.package || !existsSync(generated.package)) {
      failures.push(`${id}: generated batch package is missing at ${generated.package ?? '(missing package)'}`)
      continue
    }
    if (generatedPackages.has(generated.package)) failures.push(`${generated.package}: duplicate generated package`)
    generatedPackages.add(generated.package)

    const pkg = parseJson(generated.package)
    if (!pkg) continue
    const pkgId = sourceRunIdForPackage(pkg)
    if (pkgId !== id) failures.push(`${generated.package}: package id ${pkgId} must match generated id ${id}`)
    if (liveRow.sourceUrl && pkg.source_url !== liveRow.sourceUrl) {
      failures.push(`${generated.package}: package source_url must match the live admin row`)
    }
  }

  for (const blocked of blockedRows) {
    const id = blocked.sourceRunId ?? blocked.id
    if (!id) continue
    if (!liveById.has(id)) failures.push(`${id}: blocked row is not present in the live pending queue snapshot`)
    if (generatedById.has(id)) failures.push(`${id}: blocked row must not also have a generated page`)
    if (!blocked.reason) failures.push(`${id}: blocked row must include an integrity reason`)
  }
}

const sharedComponent = 'src/components/SourceRunShowcase.tsx'
const sharedComponentContent = read(sharedComponent)
mustInclude(sharedComponent, sharedComponentContent, 'aria-pressed={selected}', 'shared showcase must render a selected state on response artifact controls')
mustInclude(sharedComponent, sharedComponentContent, 'onClick={() => onSelect?.(detailPackage.id)}', 'shared showcase must let each response mount its artifact above')
mustInclude(sharedComponent, sharedComponentContent, 'setSelectedPackageId', 'shared showcase must keep artifact package selection state')
mustInclude(sharedComponent, sharedComponentContent, 'defaultStepNumber', 'shared showcase must support final-artifact default selection')
mustInclude(sharedComponent, sharedComponentContent, 'artifactVersions?: SourceRunShowcaseArtifactVersion[]', 'shared showcase must allow multiple artifact versions per response package')
mustInclude(sharedComponent, sharedComponentContent, 'isDefaultArtifact', 'shared showcase must support an explicit default artifact version')
mustInclude(sharedComponent, sharedComponentContent, '<ExactResponseBlock', 'shared showcase must render verbatim response text for each response package')
mustInclude(sharedComponent, sharedComponentContent, 'setSelectedPackageId', 'shared showcase must let response cards mount their artifact above')
mustInclude(sharedComponent, sharedComponentContent, 'Source run', 'shared showcase must expose one provider source-run link at the bottom')
mustNotInclude(sharedComponent, sharedComponentContent, '<ArtifactCodeBlock', 'shared showcase must not dump generated HTML into the public response path')
mustNotInclude(sharedComponent, sharedComponentContent, '<SourceLink', 'shared showcase must not repeat provider links inside every response package')
mustNotInclude(sharedComponent, sharedComponentContent, 'pathforgeSourceRunUrl', 'shared showcase must not expose admin source-run record links publicly')
mustNotInclude(sharedComponent, sharedComponentContent, 'sourceRunId', 'shared showcase must not expose internal source-run ids publicly')
mustNotInclude(sharedComponent, sharedComponentContent, 'verificationNotes', 'shared showcase must not expose internal verification notes publicly')
mustNotInclude(sharedComponent, sharedComponentContent, 'Verbatim artifact', 'shared showcase must not label generated code as public page content')
mustNotInclude(sharedComponent, sharedComponentContent, 'sourceFilePath', 'shared showcase must not serialize local artifact file paths into public page payloads')
mustNotInclude(sharedComponent, sharedComponentContent, 'artifactVersionNotes', 'shared showcase must not serialize internal artifact notes into public page payloads')
mustNotInclude(sharedComponent, sharedComponentContent, 'version.code', 'shared showcase must not serialize generated artifact HTML into public page payloads')
mustInclude(sharedComponent, sharedComponentContent, 'data-source-run-node={variant}', 'shared showcase must label prompt and response nodes for layout verification')
mustInclude(sharedComponent, sharedComponentContent, 'variant="prompt"', 'shared showcase must render prompts as their own pipe nodes')
mustInclude(sharedComponent, sharedComponentContent, 'variant="response"', 'shared showcase must render response packages as their own pipe nodes')
mustNotInclude(sharedComponent, sharedComponentContent, 'ProjectEngagementBar', 'shared showcase should not own page-shell engagement controls')
mustComeBefore(sharedComponent, sharedComponentContent, '<ArtifactFrame', 'Build path', 'shared showcase must mount the artifact before the prompt/response path')
mustComeBefore(sharedComponent, sharedComponentContent, '<PromptText text={step.prompt}', '<ResponsePackageCard', 'shared showcase must render each prompt before its response package')
mustComeBefore(sharedComponent, sharedComponentContent, 'variant="prompt"', 'variant="response"', 'shared showcase must connect prompt and response as separate sequential pipe nodes')

for (const deletedExplorer of [
  'src/app/hp-10bii-calculator-demo/Hp10BiiSourceRunExplorer.tsx',
  'src/app/weekend-plan-checklist-demo/WeekendPlanChecklistSourceRunExplorer.tsx',
  'src/app/neon-block-patrol-demo/NeonBlockPatrolSourceRunExplorer.tsx',
  'src/app/swish-city-timing-hoops-demo/SwishCitySourceRunExplorer.tsx',
  'src/app/pomodoro-timer-demo/PomodoroSourceRunExplorer.tsx',
  'src/app/snake-demo/SnakeForkWorkspace.tsx',
]) {
  if (existsSync(deletedExplorer)) failures.push(`${deletedExplorer}: old one-off source-run explorer must not come back`)
}

const featuredProjects = read('src/lib/featured-projects.ts')
const preparedShowcase = read('src/lib/prepared-showcase-projects.ts')
const projectLinks = read('src/lib/project-links.ts')
const data = read('src/lib/data.ts')
const engagement = read('src/lib/project-engagement.ts')
const mockData = read('src/lib/mock-data.ts')
const adminDashboard = read('src/app/admin/page.tsx')
const adminSourceRunDetail = read('src/app/admin/source-runs/[id]/page.tsx')
const preparedSourceRunPage = read('src/components/PreparedSourceRunPage.tsx')
const pendingSourceRunShowcases = read('src/lib/pending-source-run-showcases.ts')
const guardedRouteSet = new Set(sourceRunProjects.map((project) => project.route))

mustNotInclude('src/components/PreparedSourceRunPage.tsx', preparedSourceRunPage, 'readArtifact', 'prepared source-run wrapper must not serialize artifact HTML into public page payloads')
mustNotInclude('src/components/PreparedSourceRunPage.tsx', preparedSourceRunPage, 'notes: step.notes', 'prepared source-run wrapper must not serialize internal step notes into public page payloads')

for (const routePath of demoRoutes()) {
  const routeContent = read(routePath)
  if (!usesSharedSourceRunRenderer(routeContent)) {
    failures.push(`${routePath}: demo pages must use SourceRunShowcase or PreparedSourceRunPage so project pages stay standardized`)
  }
}

for (const routePath of sharedShowcaseRoutes()) {
  if (!guardedRouteSet.has(routePath)) {
    failures.push(`${routePath}: shared source-run showcase route must be covered by check-source-run-showcases.mjs`)
  }
}

mustInclude('src/app/admin/page.tsx', adminDashboard, 'Prepared page ready', 'admin dashboard must make prepared source-run rows obvious')
mustInclude('src/app/admin/page.tsx', adminDashboard, 'Publish prepared page', 'admin dashboard prepared source-run action must be explicit')
mustInclude('src/app/admin/page.tsx', adminDashboard, 'Source-run review', 'admin dashboard queued source runs must read as normal review items')
mustInclude('src/app/admin/page.tsx', adminDashboard, 'No prepared public page yet.', 'admin dashboard must explain the unprepared source-run next step')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', adminSourceRunDetail, 'Next action: publish this prepared page from the review item.', 'admin detail must show the prepared-page next action')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', adminSourceRunDetail, 'Next action: structure a prepared public page, then return here to publish or decline it.', 'admin detail must show the unprepared source-run next action')

for (const project of sourceRunProjects) {
  const routeContent = read(project.route)
  const usesPreparedWrapper = routeContent.includes("from '@/components/PreparedSourceRunPage'")
  const routeShellContent = usesPreparedWrapper ? `${routeContent}\n${preparedSourceRunPage}` : routeContent
  if (!routeContent.includes("from '@/components/SourceRunShowcase'") && !usesPreparedWrapper) {
    failures.push(`${project.route}: ${project.name} must use the shared source-run showcase or PreparedSourceRunPage wrapper`)
  }
  mustInclude(project.route, routeShellContent, 'defaultStepNumber', `${project.name} must explicitly default the mounted artifact`)
  mustInclude(project.route, routeShellContent, 'sourceRunUrl=', `${project.name} must pass the full provider source-run link to the shared showcase`)
  mustInclude(project.route, routeShellContent, 'ProjectEngagementBar', `${project.name} must keep the public project shell`)
  mustInclude(project.route, routeShellContent, 'ProjectCommunityPanel', `${project.name} must keep the community panel`)

  mustInclude('src/lib/featured-projects.ts', featuredProjects, project.projectId, `${project.name} must have a featured project id`)
  if (!preparedShowcase.includes(project.showcaseExport) && !pendingSourceRunShowcases.includes(project.showcaseExport)) {
    failures.push(`src/lib/prepared-showcase-projects.ts: ${project.name} must have prepared showcase metadata`)
  }
  if (!preparedShowcase.includes(project.href) && !pendingSourceRunShowcases.includes(project.href)) {
    failures.push(`src/lib/prepared-showcase-projects.ts: ${project.name} prepared showcase must point to its special route`)
  }
  mustInclude('src/lib/project-links.ts', projectLinks, project.projectId, `${project.name} must have a route override`)
  mustInclude('src/lib/project-links.ts', projectLinks, project.href, `${project.name} route override must point to the special page`)
  mustInclude('src/lib/data.ts', data, project.projectId, `${project.name} must be approved in public fallback data`)
  if (!project.expectPersistableAfterPublish) {
    mustInclude('src/lib/project-engagement.ts', engagement, project.projectId, `${project.name} must be non-persistable until a real prompts row exists`)
  }
  mustInclude('src/lib/mock-data.ts', mockData, project.showcaseExport, `${project.name} must be present in mock prompt/profile data`)

  for (const artifactPath of project.artifactPaths ?? []) {
    if (!existsSync(artifactPath)) failures.push(`${project.name}: missing artifact file ${artifactPath}`)
  }

  if (project.name === 'Pomodoro Focus Timer') {
    mustInclude(project.route, routeContent, 'artifactVersions: step.stepNumber === 4', 'Pomodoro must preserve the captured step 4 and public final artifacts as selectable versions')
    mustInclude(project.route, routeContent, 'pomodoro-focus-timer-gpt55-instant.html', 'Pomodoro must keep the current public final artifact selectable')
    mustInclude(project.route, routeContent, 'isDefault: true', 'Pomodoro must default to the current public final artifact')
    mustInclude(project.route, routeContent, 'response: code', 'Pomodoro must use the captured HTML file as the exact response text')
  }

  if (!project.packagePath) continue

  const pkg = parseJson(project.packagePath)
  if (!pkg) continue
  if (!Array.isArray(pkg.steps) || pkg.steps.length === 0) {
    failures.push(`${project.packagePath}: source-run package must have steps`)
    continue
  }

  const defaultStepNumber = routeDefaultStepNumber(routeContent)
  const finalStepNumber = finalArtifactStepNumber(pkg)
  if (usesPreparedWrapper) {
    mustInclude(
      'src/components/PreparedSourceRunPage.tsx',
      preparedSourceRunPage,
      'final_artifact_path',
      `${project.name} wrapper must derive the default mounted artifact from final_artifact_path`,
    )
  } else if (finalStepNumber && defaultStepNumber !== finalStepNumber) {
    failures.push(`${project.route}: defaultStepNumber must point to final artifact response step ${finalStepNumber}`)
  }

  mustNotInclude(project.route, routeShellContent, 'pathforgeSourceRunUrl=', `${project.name} must not expose the PathForge admin source-run record link publicly`)
  mustNotInclude(project.route, routeShellContent, 'sourceRunId=', `${project.name} must not expose internal source-run ids publicly`)
  mustNotInclude(project.route, routeShellContent, 'verificationNotes=', `${project.name} must not expose internal verification notes publicly`)
  mustNotInclude(project.route, routeShellContent, 'sourceFilePath', `${project.name} must not serialize local artifact file paths into public page payloads`)
  mustNotInclude(project.route, routeShellContent, 'notes: step.notes', `${project.name} must not serialize internal step notes into public page payloads`)
  mustNotInclude(project.route, routeShellContent, 'notes: step.description', `${project.name} must not serialize prepared step descriptions as artifact notes`)

  for (const step of pkg.steps) {
    const stepLabel = `${project.packagePath} step ${step.step_number ?? '?'}`
    if (!step.prompt_exact) failures.push(`${stepLabel}: missing prompt_exact`)
    if (!step.response_exact) failures.push(`${stepLabel}: missing response_exact`)
    const response = String(step.response_exact ?? '')
    for (const forbidden of [
      'exact response and code are preserved in the source session link',
      'exact response is preserved in the source session link',
      'captured code for this version is saved at',
      'captured final code is saved at',
      'saved verbatim at',
    ]) {
      if (response.includes(forbidden)) {
        failures.push(`${stepLabel}: response_exact must not defer exact text to a source link or artifact summary`)
      }
    }

    if (step.artifact_version_path) {
      const artifactPath = String(step.artifact_version_path)
      if (!artifactPath.startsWith('public/artifacts/')) {
        failures.push(`${stepLabel}: artifact_version_path must be production-servable under public/artifacts`)
      } else if (!existsSync(artifactPath)) {
        failures.push(`${stepLabel}: missing artifact file ${artifactPath}`)
      }
      if (!Array.isArray(step.generated_files) || !step.generated_files.includes(artifactPath)) {
        failures.push(`${stepLabel}: generated_files must include ${basename(artifactPath)} for the response package`)
      }
    }
  }

  const artifactVersions = Array.isArray(pkg.artifact_versions) ? pkg.artifact_versions : []
  const generatedArtifactPaths = new Set()
  for (const step of pkg.steps) {
    if (!Array.isArray(step.generated_files)) continue
    for (const filePath of step.generated_files) {
      if (typeof filePath === 'string' && filePath.startsWith('public/artifacts/')) {
        generatedArtifactPaths.add(filePath)
      }
    }
  }

  for (const artifactVersion of artifactVersions) {
    const artifactPath = typeof artifactVersion === 'string'
      ? artifactVersion
      : artifactVersion.path ?? artifactVersion.artifact_path
    if (typeof artifactPath !== 'string') {
      failures.push(`${project.packagePath}: artifact_versions entries must include a path`)
      continue
    }
    if (!artifactPath.startsWith('public/artifacts/')) {
      failures.push(`${project.packagePath}: artifact version ${artifactPath} is not production-servable`)
    } else if (!existsSync(join(process.cwd(), artifactPath))) {
      failures.push(`${project.packagePath}: artifact version file missing at ${artifactPath}`)
    }
  }

  if (project.name === 'HP 10Bii+') {
    mustInclude(project.route, routeContent, 'artifactVersionsForStep', 'HP must map every generated artifact file into selectable showcase versions')
    mustInclude(project.route, routeContent, 'isDefault: filePath === finalArtifactPath', 'HP must default to the verified public mounted artifact')
    if (artifactVersions.length !== generatedArtifactPaths.size) {
      failures.push(`${project.packagePath}: HP artifact_versions must match generated public artifact files so every version can mount above`)
    }
  }
}

verifyPendingBatchSnapshot()

if (failures.length > 0) {
  console.error('Source-run showcase guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Source-run showcase guard passed.')
