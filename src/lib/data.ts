import {
  BuildRequestWithRelations,
  Category,
  Profile,
  PromptWithRelations,
  SourceRunSubmissionStatus,
  SourceRunSubmissionWithRelations,
  SuggestionPublicStatus,
  SuggestionResponseVisibility,
  SuggestionWithRelations,
} from './types'
import {
  mockBuildRequests,
  mockCategories,
  mockPrompts,
  mockProfiles,
  mockSteps,
  mockSuggestions,
} from './mock-data'
import { isPersistableProjectId } from './project-engagement'
import {
  BAKE_SALE_MARGIN_PROJECT_ID,
  BREAKROOM_SNACK_RESTOCK_PROJECT_ID,
  DECISION_MATRIX_PROJECT_ID,
  FLASHCARD_CRAM_PROJECT_ID,
  FOLLOW_UP_CRM_PROJECT_ID,
  GARAGE_SALE_TAGS_PROJECT_ID,
  HP_10BII_PROJECT_ID,
  LANE_DEFENSE_PROJECT_ID,
  LEFTOVER_DINNER_BOARD_PROJECT_ID,
  LUNCHBOX_CONVEYOR_SORTER_PROJECT_ID,
  MEETING_COST_PROJECT_ID,
  MICRO_DUNGEON_ROUTE_PROJECT_ID,
  MINI_GOLF_WINDMILL_PROJECT_ID,
  MINI_HARBOR_TUGBOAT_PROJECT_ID,
  NEON_BLOCK_PATROL_PROJECT_ID,
  PANTRY_SHELF_LIFE_RESCUE_PROJECT_ID,
  POCKET_PIRATE_MAP_PROJECT_ID,
  POCKET_RALLY_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  PORCH_LIGHT_MOTH_MAZE_PROJECT_ID,
  PORCH_PLANT_WATERING_PROJECT_ID,
  POTLUCK_TABLE_PLANNER_PROJECT_ID,
  PUZZLE_BOX_ESCAPE_PROJECT_ID,
  RAINY_WINDOW_CAFE_RUSH_PROJECT_ID,
  REACTION_TRAINER_PROJECT_ID,
  SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID,
  ROOMMATE_CHORE_DRAFT_PROJECT_ID,
  SHARED_ERRAND_ROUTE_PROJECT_ID,
  SNAKE_PROJECT_ID,
  SNAKE_PROJECT_LEGACY_ID,
  STAR_MAP_SCAVENGER_PROJECT_ID,
  SWISH_CITY_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
  TINY_FARMERS_MARKET_PROJECT_ID,
  TINY_LOOP_SEQUENCER_PROJECT_ID,
  TINY_TRAIN_DISPATCHER_PROJECT_ID,
  TRIP_PACKING_PROJECT_ID,
  WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID,
  WEEKEND_CHECKLIST_PROJECT_ID,
  WORD_LADDER_SPRINT_PROJECT_ID,
  NEIGHBORHOOD_LOST_AND_FOUND_PROJECT_ID,
  TINY_DINER_TICKET_PROJECT_ID,
  SMALL_CLINIC_CALLBACK_PROJECT_ID,
  TINY_BIRTHDAY_RSVP_PROJECT_ID,
  TINY_AIRPORT_GATE_PROJECT_ID,
  TINY_FERRY_LOADING_PROJECT_ID,
  AFTER_SCHOOL_PICKUP_PROJECT_ID,
  FRIDGE_LEFTOVER_LABEL_PROJECT_ID,
  TINY_PARKING_LOT_PROJECT_ID,
  TINY_WINDOW_HERB_PROJECT_ID,
  POPUP_DINNER_SEATING_PROJECT_ID,
  TINY_CROSSWALK_TIMING_PROJECT_ID,
  TINY_INVOICE_NUDGE_PROJECT_ID,
  MAILROOM_CART_ROUTE_PROJECT_ID,
  NEIGHBORHOOD_POTLUCK_BALANCER_PROJECT_ID,
  LAUNDROMAT_SOCK_SORTER_PROJECT_ID,
  CORNER_STORE_CHANGE_PROJECT_ID,
  WEEKEND_YARD_SALE_PROJECT_ID,
  MINI_METRO_SIGNAL_PROJECT_ID,
  MOVING_DAY_BOX_LABELER_PROJECT_ID,
  ROOFTOP_COURIER_SWITCHBACKS_PROJECT_ID,
  NEIGHBORHOOD_SNOW_ROUTE_PROJECT_ID,
  ROOMMATE_FREEZER_BOARD_PROJECT_ID,
  UTILITY_BILL_BALANCE_PROJECT_ID,
  BLOCK_BIKE_COURIER_PROJECT_ID,
  STICKER_SHEET_STYLE_DRIFT_MIXER_CLAUDE_PROJECT_ID,
  YOUTUBE_SCENE_BUDGET_BEAT_SORTER_GEMINI_PROJECT_ID,
  READER_PROMISE_EVIDENCE_LADDER_CHATGPT_PROJECT_ID,
  FOUR_WEEK_CONTENT_GAP_HEATMAP_GEMINI_PROJECT_ID,
  YOUTUBE_TITLE_TAG_SAFE_ZONE_BOARD_CLAUDE_PROJECT_ID,
  META_TAG_CTR_CARD_DUEL_CHATGPT_PROJECT_ID,
  CAMPAIGN_CAPTION_INGREDIENT_MIXER_GEMINI_PROJECT_ID,
  ICON_SET_STYLE_CONSISTENCY_TILES_CLAUDE_PROJECT_ID,
  FORUM_REPLY_HELPFULNESS_DIAL_CHATGPT_PROJECT_ID,
  YOUTUBE_BROLL_COVERAGE_CARD_DEALER_CHATGPT_PROJECT_ID,
  CONTENT_CALENDAR_COLLISION_RESOLVER_GEMINI_PROJECT_ID,
  THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_PROJECT_ID,
  RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_PROJECT_ID,
  DRAFT_VOICE_CONSISTENCY_METER_CHATGPT_PROJECT_ID,
  RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_A4FD2166_PROJECT_ID,
  VISUAL_PROMPT_INGREDIENT_BALANCE_STUDIO_CHATGPT_PROJECT_ID,
  SEARCH_RESULT_PROMISE_PROOF_BOARD_CHATGPT_PROJECT_ID,
  VISUAL_BRIEF_CONSISTENCY_BOARD_CLAUDE_PROJECT_ID,
  PRODUCT_CLAIM_SHELF_AUDIT_CARDS_GEMINI_PROJECT_ID,
  HEADLINE_PROMISE_BRACKET_CHATGPT_PROJECT_ID,
  PANTRY_SUBSTITUTION_CONFIDENCE_STACK_GEMINI_PROJECT_ID,
  FAQ_ANSWER_FRESHNESS_FLASHCARDS_CHATGPT_PROJECT_ID,
  RECIPE_LEFTOVER_CAPTION_PACK_SORTER_GEMINI_PROJECT_ID,
  ARTICLE_FRESHNESS_REWRITE_TRIAGE_WHEEL_CHATGPT_PROJECT_ID,
  INSTAGRAM_CAPTION_CTA_MIX_BOARD_GEMINI_PROJECT_ID,
  BACK_COVER_BLURB_BEAT_MAPPER_CLAUDE_PROJECT_ID,
  PRODUCT_OBJECTION_QA_SHELF_CHATGPT_PROJECT_ID,
  LONG_THREAD_TLDR_FACT_DECK_OPENROUTER_NEX_PROJECT_ID,
  COMMUNITY_ANSWER_EVIDENCE_BALANCE_OPENROUTER_NEMOTRON_PROJECT_ID,
  PRODUCT_PHOTO_PROMPT_CARD_STUDIO_GEMINI_PROJECT_ID,
  PROPOSAL_RED_FLAG_HEATMAP_CLAUDE_PROJECT_ID,
  YOUTUBE_COLD_OPEN_BEAT_BOARD_CHATGPT_PROJECT_ID,
  CAROUSEL_HOOK_CONTINUITY_CHECKER_CLAUDE_PROJECT_ID,
  FOUR_WEEK_CONTENT_CALENDAR_CAPACITY_GRID_GEMINI_PROJECT_ID,
  CLIENT_EMAIL_REPLY_RISK_METER_CHATGPT_PROJECT_ID,
  LOGO_BRIEF_CONSTRAINT_MIXER_CLAUDE_PROJECT_ID,
  KEYWORD_INTENT_CLUSTER_SPRINT_GEMINI_PROJECT_ID,
  ARTICLE_CLAIM_EVIDENCE_LADDER_CHATGPT_PROJECT_ID,
  COOKBOOK_PROMO_READINESS_CARDS_GEMINI_PROJECT_ID,
  CHAPTER_SCOPE_MAP_TINY_BOOKS_CLAUDE_PROJECT_ID,
  SHORT_VIDEO_HOOK_BEAT_SHEET_TIMER_GEMINI_PROJECT_ID,
  PRODUCT_DESCRIPTION_SHELF_CARD_STRESS_TESTER_CHATGPT_PROJECT_ID,
  RECIPE_PROMO_BATCH_QA_BOARD_GEMINI_PROJECT_ID,
  POCKET_ZINE_COLLAGE_LAYOUT_STUDIO_CLAUDE_PROJECT_ID,
  OFFER_SALVAGE_TRIAGE_DESK_CHATGPT_PROJECT_ID,
  ALBUM_COVER_COMPOSITION_PLANNER_CLAUDE_PROJECT_ID,
  BUG_REPORT_EVIDENCE_TRIAGE_BOARD_CHATGPT_PROJECT_ID,
  SCOPE_CREEP_CHANGE_ORDER_CALCULATOR_GEMINI_PROJECT_ID,
  LEFTOVER_INGREDIENT_SWAP_CARDS_GEMINI_PROJECT_ID,
  INTERNAL_LINK_RESCUE_MAP_CHATGPT_PROJECT_ID,
  VOICEOVER_EMOTION_TAG_TIMING_BOARD_CLAUDE_PROJECT_ID,
  BLOG_REFRESH_BRIEF_SORTER_CHATGPT_PROJECT_ID,
  SHORT_VIDEO_HOOK_CONTINUITY_BOARD_CLAUDE_PROJECT_ID,
  MOODBOARD_CONTACT_SHEET_PLANNER_CLAUDE_PROJECT_ID,
  RECIPE_YIELD_CARD_PACKAGER_GEMINI_PROJECT_ID,
  COMPETITOR_CONTENT_GAP_SPRINT_BOARD_CHATGPT_PROJECT_ID,
  POTLUCK_ALLERGEN_LABEL_MIXER_GEMINI_PROJECT_ID,
  FAQ_GAP_SPRINT_BOARD_CHATGPT_PROJECT_ID,
  COLLECTIBLE_CARD_SHOT_PLANNER_CLAUDE_PROJECT_ID,
  HOMEPAGE_CLAIM_EVIDENCE_SORTER_CHATGPT_PROJECT_ID,
  COOKOUT_BATCH_CARD_SORTER_GEMINI_PROJECT_ID,
  LEFTOVER_LUNCHBOX_ROTATION_BUILDER_GEMINI_PROJECT_ID,
  VISUAL_PROMPT_DRIFT_INSPECTOR_CLAUDE_PROJECT_ID,
  FRIDGE_TETRIS_MEAL_PREP_PLANNER_GEMINI_PROJECT_ID,
  KEYWORD_GARDEN_SPRINT_CHATGPT_PROJECT_ID,
  THUMBNAIL_CROP_PROOF_STUDIO_CLAUDE_PROJECT_ID,
  PANTRY_REEL_SHOT_LIST_CARDS_GEMINI_PROJECT_ID,
  ARTICLE_ANGLE_TRIAGE_SPRINT_CHATGPT_PROJECT_ID,
  POCKET_AD_SHOT_STORYBOARDER_GEMINI_PROJECT_ID,
  SERP_SNIPPET_RACE_BOARD_CHATGPT_PROJECT_ID,
  RECIPE_LAUNCH_CARD_STUDIO_GEMINI_PROJECT_ID,
  POSTER_SHOT_STACK_PLANNER_CLAUDE_PROJECT_ID,
  SEARCH_BRIEF_GAP_MAPPER_CHATGPT_PROJECT_ID,
  BACKWARDS_WEEK_CAPACITY_PLANNER_CHATGPT_PROJECT_ID,
  POCKET_COVER_PROMPT_BOARD_CHATGPT_PROJECT_ID,
  TINY_PIXEL_STAMP_CARD_MAKER_CHATGPT_RECOVERED_PROJECT_ID,
  THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_D2D6B9D3_PROJECT_ID,
  SEARCH_RESULT_PROMISE_PROOF_BOARD_CHATGPT_FD2902BE_PROJECT_ID,
  ACCIDENTAL_SNAPSHOT_SHOT_LIST_LAB_GEMINI_PROJECT_ID,
  REFERENCE_IMAGE_CHANGE_RECEIPT_BOARD_OPENROUTER_PROJECT_ID,
  PRODUCT_PHOTO_SHOT_LIST_TILE_SORTER_CHATGPT_PROJECT_ID,
  CHARACTER_SCENE_BEAT_CONTINUITY_BOARD_CLAUDE_PROJECT_ID,
  SEARCH_RESULT_SNIPPET_PROOF_LAB_OPENROUTER_PROJECT_ID,
  INTERVIEW_ANSWER_PROOF_DRILL_CARDS_CHATGPT_PROJECT_ID,
  PROMPT_REMIX_RECIPE_CARD_GAME_GEMINI_PROJECT_ID,
  PHONE_CHAT_SCREENSHOT_STORYBOARD_STUDIO_OPENROUTER_KIMI_PROJECT_ID,
  LOCAL_MICRO_ADVENTURE_ROUTE_MIXER_GEMINI_PROJECT_ID,
  PORTFOLIO_CASE_STUDY_PROOF_CARDS_CHATGPT_PROJECT_ID,
  SOURCE_CITATION_FRESHNESS_FLIPBOOK_OPENROUTER_QWEN_PROJECT_ID,
  TRAVEL_POSTER_LAYOUT_STAMP_GAME_GEMINI_PROJECT_ID,
  REFERENCE_PHOTO_FIDELITY_TILE_BOARD_OPENROUTER_DEEPSEEK_PROJECT_ID,
  LANDING_PAGE_PROOF_RECEIPT_CHATGPT_PROJECT_ID,
  PROMPT_PATTERN_SWAP_WORKSHOP_OPENROUTER_CLAUDE_HAIKU_PROJECT_ID,
  MICRO_IMAGE_BRIEF_CONSISTENCY_TILES_CHATGPT_PROJECT_ID,
  TRAVEL_POSTER_LANDMARK_LAYER_GAME_CLAUDE_PROJECT_ID,
  SEO_CONTENT_PROMISE_COVERAGE_BOARD_CHATGPT_PROJECT_ID,
  TINY_TRAVEL_STICKER_ROUTE_PUZZLE_OPENROUTER_GLM_PROJECT_ID,
  REFERENCE_IMAGE_CHANGE_CHECKLIST_DECK_GEMINI_PROJECT_ID,
  MICRO_LAUNCH_PROMISE_SORTER_CHATGPT_PROJECT_ID,
} from './featured-projects'
import { getPreparedShowcaseProjectById } from './prepared-showcase-projects'
import type { PreparedShowcaseProject, PreparedShowcaseStep } from './prepared-showcase-projects'
import {
  PROJECT_FORK_MAX_WIDTH,
  projectForkSourceFromSubmissionFields,
  projectForkSourceToSubmissionFields,
  type ProjectForkNetworkItem,
  type ProjectForkSource,
} from './project-forks'
import { composeSourceRunReviewNotes, detectSourceRunProvider } from './source-run-review'

const APPROVED_PROJECT_IDS = new Set([
  // Generated current pending source-run public ids.
  STICKER_SHEET_STYLE_DRIFT_MIXER_CLAUDE_PROJECT_ID,
  YOUTUBE_SCENE_BUDGET_BEAT_SORTER_GEMINI_PROJECT_ID,
  READER_PROMISE_EVIDENCE_LADDER_CHATGPT_PROJECT_ID,
  FOUR_WEEK_CONTENT_GAP_HEATMAP_GEMINI_PROJECT_ID,
  YOUTUBE_TITLE_TAG_SAFE_ZONE_BOARD_CLAUDE_PROJECT_ID,
  META_TAG_CTR_CARD_DUEL_CHATGPT_PROJECT_ID,
  CAMPAIGN_CAPTION_INGREDIENT_MIXER_GEMINI_PROJECT_ID,
  ICON_SET_STYLE_CONSISTENCY_TILES_CLAUDE_PROJECT_ID,
  FORUM_REPLY_HELPFULNESS_DIAL_CHATGPT_PROJECT_ID,
  YOUTUBE_BROLL_COVERAGE_CARD_DEALER_CHATGPT_PROJECT_ID,
  CONTENT_CALENDAR_COLLISION_RESOLVER_GEMINI_PROJECT_ID,
  THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_PROJECT_ID,
  RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_PROJECT_ID,
  DRAFT_VOICE_CONSISTENCY_METER_CHATGPT_PROJECT_ID,
  RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_A4FD2166_PROJECT_ID,
  VISUAL_PROMPT_INGREDIENT_BALANCE_STUDIO_CHATGPT_PROJECT_ID,
  SEARCH_RESULT_PROMISE_PROOF_BOARD_CHATGPT_PROJECT_ID,
  VISUAL_BRIEF_CONSISTENCY_BOARD_CLAUDE_PROJECT_ID,
  PRODUCT_CLAIM_SHELF_AUDIT_CARDS_GEMINI_PROJECT_ID,
  HEADLINE_PROMISE_BRACKET_CHATGPT_PROJECT_ID,
  PANTRY_SUBSTITUTION_CONFIDENCE_STACK_GEMINI_PROJECT_ID,
  FAQ_ANSWER_FRESHNESS_FLASHCARDS_CHATGPT_PROJECT_ID,
  RECIPE_LEFTOVER_CAPTION_PACK_SORTER_GEMINI_PROJECT_ID,
  ARTICLE_FRESHNESS_REWRITE_TRIAGE_WHEEL_CHATGPT_PROJECT_ID,
  INSTAGRAM_CAPTION_CTA_MIX_BOARD_GEMINI_PROJECT_ID,
  BACK_COVER_BLURB_BEAT_MAPPER_CLAUDE_PROJECT_ID,
  PRODUCT_OBJECTION_QA_SHELF_CHATGPT_PROJECT_ID,
  LONG_THREAD_TLDR_FACT_DECK_OPENROUTER_NEX_PROJECT_ID,
  COMMUNITY_ANSWER_EVIDENCE_BALANCE_OPENROUTER_NEMOTRON_PROJECT_ID,
  PRODUCT_PHOTO_PROMPT_CARD_STUDIO_GEMINI_PROJECT_ID,
  PROPOSAL_RED_FLAG_HEATMAP_CLAUDE_PROJECT_ID,
  YOUTUBE_COLD_OPEN_BEAT_BOARD_CHATGPT_PROJECT_ID,
  CAROUSEL_HOOK_CONTINUITY_CHECKER_CLAUDE_PROJECT_ID,
  FOUR_WEEK_CONTENT_CALENDAR_CAPACITY_GRID_GEMINI_PROJECT_ID,
  CLIENT_EMAIL_REPLY_RISK_METER_CHATGPT_PROJECT_ID,
  LOGO_BRIEF_CONSTRAINT_MIXER_CLAUDE_PROJECT_ID,
  KEYWORD_INTENT_CLUSTER_SPRINT_GEMINI_PROJECT_ID,
  ARTICLE_CLAIM_EVIDENCE_LADDER_CHATGPT_PROJECT_ID,
  COOKBOOK_PROMO_READINESS_CARDS_GEMINI_PROJECT_ID,
  CHAPTER_SCOPE_MAP_TINY_BOOKS_CLAUDE_PROJECT_ID,
  SHORT_VIDEO_HOOK_BEAT_SHEET_TIMER_GEMINI_PROJECT_ID,
  PRODUCT_DESCRIPTION_SHELF_CARD_STRESS_TESTER_CHATGPT_PROJECT_ID,
  RECIPE_PROMO_BATCH_QA_BOARD_GEMINI_PROJECT_ID,
  POCKET_ZINE_COLLAGE_LAYOUT_STUDIO_CLAUDE_PROJECT_ID,
  OFFER_SALVAGE_TRIAGE_DESK_CHATGPT_PROJECT_ID,
  ALBUM_COVER_COMPOSITION_PLANNER_CLAUDE_PROJECT_ID,
  BUG_REPORT_EVIDENCE_TRIAGE_BOARD_CHATGPT_PROJECT_ID,
  SCOPE_CREEP_CHANGE_ORDER_CALCULATOR_GEMINI_PROJECT_ID,
  LEFTOVER_INGREDIENT_SWAP_CARDS_GEMINI_PROJECT_ID,
  INTERNAL_LINK_RESCUE_MAP_CHATGPT_PROJECT_ID,
  VOICEOVER_EMOTION_TAG_TIMING_BOARD_CLAUDE_PROJECT_ID,
  BLOG_REFRESH_BRIEF_SORTER_CHATGPT_PROJECT_ID,
  SHORT_VIDEO_HOOK_CONTINUITY_BOARD_CLAUDE_PROJECT_ID,
  MOODBOARD_CONTACT_SHEET_PLANNER_CLAUDE_PROJECT_ID,
  RECIPE_YIELD_CARD_PACKAGER_GEMINI_PROJECT_ID,
  COMPETITOR_CONTENT_GAP_SPRINT_BOARD_CHATGPT_PROJECT_ID,
  THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_D2D6B9D3_PROJECT_ID,
  POTLUCK_ALLERGEN_LABEL_MIXER_GEMINI_PROJECT_ID,
  FAQ_GAP_SPRINT_BOARD_CHATGPT_PROJECT_ID,
  COLLECTIBLE_CARD_SHOT_PLANNER_CLAUDE_PROJECT_ID,
  HOMEPAGE_CLAIM_EVIDENCE_SORTER_CHATGPT_PROJECT_ID,
  COOKOUT_BATCH_CARD_SORTER_GEMINI_PROJECT_ID,
  LEFTOVER_LUNCHBOX_ROTATION_BUILDER_GEMINI_PROJECT_ID,
  SEARCH_RESULT_PROMISE_PROOF_BOARD_CHATGPT_FD2902BE_PROJECT_ID,
  VISUAL_PROMPT_DRIFT_INSPECTOR_CLAUDE_PROJECT_ID,
  FRIDGE_TETRIS_MEAL_PREP_PLANNER_GEMINI_PROJECT_ID,
  KEYWORD_GARDEN_SPRINT_CHATGPT_PROJECT_ID,
  THUMBNAIL_CROP_PROOF_STUDIO_CLAUDE_PROJECT_ID,
  PANTRY_REEL_SHOT_LIST_CARDS_GEMINI_PROJECT_ID,
  ARTICLE_ANGLE_TRIAGE_SPRINT_CHATGPT_PROJECT_ID,
  POCKET_AD_SHOT_STORYBOARDER_GEMINI_PROJECT_ID,
  SERP_SNIPPET_RACE_BOARD_CHATGPT_PROJECT_ID,
  RECIPE_LAUNCH_CARD_STUDIO_GEMINI_PROJECT_ID,
  POSTER_SHOT_STACK_PLANNER_CLAUDE_PROJECT_ID,
  SEARCH_BRIEF_GAP_MAPPER_CHATGPT_PROJECT_ID,
  BACKWARDS_WEEK_CAPACITY_PLANNER_CHATGPT_PROJECT_ID,
  POCKET_COVER_PROMPT_BOARD_CHATGPT_PROJECT_ID,
  TINY_PIXEL_STAMP_CARD_MAKER_CHATGPT_RECOVERED_PROJECT_ID,
  TINY_TRAVEL_STICKER_ROUTE_PUZZLE_OPENROUTER_GLM_PROJECT_ID,
  REFERENCE_IMAGE_CHANGE_CHECKLIST_DECK_GEMINI_PROJECT_ID,
  MICRO_LAUNCH_PROMISE_SORTER_CHATGPT_PROJECT_ID,
  // End generated current pending source-run public ids.
  TINY_TRAIN_DISPATCHER_PROJECT_ID,
  BREAKROOM_SNACK_RESTOCK_PROJECT_ID,
  PORCH_LIGHT_MOTH_MAZE_PROJECT_ID,
  PANTRY_SHELF_LIFE_RESCUE_PROJECT_ID,
  MINI_HARBOR_TUGBOAT_PROJECT_ID,
  TINY_FARMERS_MARKET_PROJECT_ID,
  ROOMMATE_CHORE_DRAFT_PROJECT_ID,
  POCKET_PIRATE_MAP_PROJECT_ID,
  POTLUCK_TABLE_PLANNER_PROJECT_ID,
  RAINY_WINDOW_CAFE_RUSH_PROJECT_ID,
  LUNCHBOX_CONVEYOR_SORTER_PROJECT_ID,
  PORCH_PLANT_WATERING_PROJECT_ID,
  SHARED_ERRAND_ROUTE_PROJECT_ID,
  MINI_GOLF_WINDMILL_PROJECT_ID,
  LEFTOVER_DINNER_BOARD_PROJECT_ID,
  TINY_LOOP_SEQUENCER_PROJECT_ID,
  GARAGE_SALE_TAGS_PROJECT_ID,
  MICRO_DUNGEON_ROUTE_PROJECT_ID,
  BAKE_SALE_MARGIN_PROJECT_ID,
  STAR_MAP_SCAVENGER_PROJECT_ID,
  DECISION_MATRIX_PROJECT_ID,
  SNAKE_PROJECT_ID,
  HP_10BII_PROJECT_ID,
  SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  WEEKEND_CHECKLIST_PROJECT_ID,
  WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID,
  NEON_BLOCK_PATROL_PROJECT_ID,
  SWISH_CITY_PROJECT_ID,
  MEETING_COST_PROJECT_ID,
  WORD_LADDER_SPRINT_PROJECT_ID,
  PUZZLE_BOX_ESCAPE_PROJECT_ID,
  POCKET_RALLY_PROJECT_ID,
  TRIP_PACKING_PROJECT_ID,
  FLASHCARD_CRAM_PROJECT_ID,
  FOLLOW_UP_CRM_PROJECT_ID,
  REACTION_TRAINER_PROJECT_ID,
  LANE_DEFENSE_PROJECT_ID,
  NEIGHBORHOOD_LOST_AND_FOUND_PROJECT_ID,
  TINY_DINER_TICKET_PROJECT_ID,
  SMALL_CLINIC_CALLBACK_PROJECT_ID,
  TINY_BIRTHDAY_RSVP_PROJECT_ID,
  TINY_AIRPORT_GATE_PROJECT_ID,
  TINY_FERRY_LOADING_PROJECT_ID,
  AFTER_SCHOOL_PICKUP_PROJECT_ID,
  FRIDGE_LEFTOVER_LABEL_PROJECT_ID,
  TINY_PARKING_LOT_PROJECT_ID,
  TINY_WINDOW_HERB_PROJECT_ID,
  POPUP_DINNER_SEATING_PROJECT_ID,
  TINY_CROSSWALK_TIMING_PROJECT_ID,
  TINY_INVOICE_NUDGE_PROJECT_ID,
  MAILROOM_CART_ROUTE_PROJECT_ID,
  NEIGHBORHOOD_POTLUCK_BALANCER_PROJECT_ID,
  LAUNDROMAT_SOCK_SORTER_PROJECT_ID,
  CORNER_STORE_CHANGE_PROJECT_ID,
  WEEKEND_YARD_SALE_PROJECT_ID,
  MINI_METRO_SIGNAL_PROJECT_ID,
  MOVING_DAY_BOX_LABELER_PROJECT_ID,
  ROOFTOP_COURIER_SWITCHBACKS_PROJECT_ID,
  NEIGHBORHOOD_SNOW_ROUTE_PROJECT_ID,
  ROOMMATE_FREEZER_BOARD_PROJECT_ID,
  UTILITY_BILL_BALANCE_PROJECT_ID,
  BLOCK_BIKE_COURIER_PROJECT_ID,
])
const PUBLIC_LIBRARY_START_AT = '2026-05-28T00:00:00.000Z'
const publicMockPrompts = mockPrompts.filter((prompt) => APPROVED_PROJECT_IDS.has(prompt.id))
const publicMockSteps = mockSteps.filter((step) => APPROVED_PROJECT_IDS.has(step.prompt_id))
const publicMockCategories = mockCategories.map((category) => ({
  ...category,
  prompt_count: publicMockPrompts.filter((prompt) => (
    prompt.status === 'approved' && prompt.category_id === category.id
  )).length,
}))

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
const SUPABASE_PUBLIC_READS_ENABLED = SUPABASE_CONFIGURED && process.env.PATHFORGE_ENABLE_SUPABASE_READS !== 'false'
const SUPABASE_READ_TIMEOUT_MS = 3000
export const SUGGESTION_PUBLIC_DELAY_HOURS = 24
const SUGGESTION_PUBLIC_DELAY_MS = SUGGESTION_PUBLIC_DELAY_HOURS * 60 * 60 * 1000

function isPublicLibraryPrompt(prompt: { id: string; created_at?: string | null }) {
  if (APPROVED_PROJECT_IDS.has(prompt.id)) return true
  if (!prompt.created_at) return false
  return new Date(prompt.created_at).getTime() >= new Date(PUBLIC_LIBRARY_START_AT).getTime()
}

function normalizeProjectPresentation<T extends PromptWithRelations>(prompt: T): T {
  const preparedProject = getPreparedShowcaseProjectById(prompt.id)
  if (preparedProject) {
    return {
      ...prompt,
      title: preparedProject.title,
      description: preparedProject.description,
      content: preparedProject.content,
      result_content: preparedProject.resultContent,
      model_used: preparedProject.modelUsed,
      model_recommendation: preparedProject.modelRecommendation,
      tools_used: preparedProject.toolsUsed,
      tags: preparedProject.tags,
      steps: preparedProject.steps.map((step) => preparedStepToPromptStep(step, preparedProject)),
    }
  }

  return prompt
}

function preparedStepToPromptStep(step: PreparedShowcaseStep, project: PreparedShowcaseProject) {
  return {
    id: step.id,
    prompt_id: project.id,
    step_number: step.stepNumber,
    title: step.title,
    content: step.content,
    result_content: step.resultContent,
    description: step.description,
    created_at: project.createdAt,
  }
}

async function readWithFallback<T>(fallback: T, read: () => Promise<T>): Promise<T> {
  if (!SUPABASE_PUBLIC_READS_ENABLED) return fallback

  try {
    return await Promise.race([
      read(),
      new Promise<T>((resolve) => {
        setTimeout(() => resolve(fallback), SUPABASE_READ_TIMEOUT_MS)
      }),
    ])
  } catch {
    return fallback
  }
}

// ---- Categories ----

export async function getCategories(): Promise<Category[]> {
  return readWithFallback(publicMockCategories, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.from('categories').select('*').order('name')
    return data ?? []
  })
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return readWithFallback(publicMockCategories.find(c => c.slug === slug) ?? null, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.from('categories').select('*').eq('slug', slug).single()
    return data
  })
}

// ---- Prompts ----

function attachRelations(prompt: typeof mockPrompts[0]): PromptWithRelations {
  return {
    ...prompt,
    category: publicMockCategories.find(c => c.id === prompt.category_id),
    author: mockProfiles.find(p => p.id === prompt.author_id),
    steps: publicMockSteps.filter(s => s.prompt_id === prompt.id).sort((a, b) => a.step_number - b.step_number),
  }
}

function getMockPrompts(options?: {
  categorySlug?: string
  difficulty?: string
  status?: string
  search?: string
  limit?: number
  sort?: 'newest' | 'popular'
}): PromptWithRelations[] {
  let prompts = [...publicMockPrompts]

  // Default to approved only
  const status = options?.status ?? 'approved'
  if (status !== 'all') {
    prompts = prompts.filter(p => p.status === status)
  }

  if (options?.categorySlug) {
    const cat = publicMockCategories.find(c => c.slug === options.categorySlug)
    if (cat) prompts = prompts.filter(p => p.category_id === cat.id)
  }
  if (options?.difficulty) {
    prompts = prompts.filter(p => p.difficulty === options.difficulty)
  }
  if (options?.search) {
    const q = options.search.toLowerCase()
    prompts = prompts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  // Sort
  if (options?.sort === 'popular') {
    prompts.sort((a, b) => b.vote_count - a.vote_count)
  } else {
    prompts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  if (options?.limit) prompts = prompts.slice(0, options.limit)

  return prompts.map(attachRelations)
}

function mergeWithPublicMockPrompts(prompts: PromptWithRelations[], options?: Parameters<typeof getMockPrompts>[0]) {
  const seen = new Set(prompts.map(prompt => prompt.id))
  const mockPrompts = getMockPrompts(options).filter(prompt => !seen.has(prompt.id))
  return [...prompts, ...mockPrompts]
}

function getPublicMockPromptsForProfile(profile: Pick<Profile, 'id'> & { username?: string | null }) {
  return publicMockPrompts.filter((prompt) => {
    if (prompt.author_id === profile.id) return true
    if (!profile.username) return false

    const mockAuthor = mockProfiles.find(author => author.id === prompt.author_id)
    return mockAuthor?.username === profile.username
  })
}

export async function getPrompts(options?: {
  categorySlug?: string
  difficulty?: string
  status?: string
  search?: string
  limit?: number
  sort?: 'newest' | 'popular'
}): Promise<PromptWithRelations[]> {
  return readWithFallback(getMockPrompts(options), async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    let query = supabase
      .from('prompts')
      .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')

    const status = options?.status ?? 'approved'
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Category filtering — look up category ID from slug
    if (options?.categorySlug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', options.categorySlug)
        .single()
      if (cat) query = query.eq('category_id', cat.id)
    }

    if (options?.difficulty) query = query.eq('difficulty', options.difficulty)

    // Search title, description, and tags
    if (options?.search) {
      const s = options.search
      query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,tags.cs.{${s}}`)
    }

    if (options?.sort === 'popular') {
      query = query.order('vote_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }
    const { data } = await query
    const filtered = (data ?? []).filter(isPublicLibraryPrompt).map(normalizeProjectPresentation)
    const merged = mergeWithPublicMockPrompts(filtered, options)
    return options?.limit ? merged.slice(0, options.limit) : merged
  })
}

export async function getAllPromptsForAdmin(): Promise<PromptWithRelations[]> {
  if (!SUPABASE_CONFIGURED) return []

  const { supabase } = await requireAdminAccess()
  const { data, error } = await supabase
    .from('prompts')
    .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')
    .order('created_at', { ascending: false })

  if (error) throw error
  const filtered = (data ?? [])
    .filter(prompt => prompt.status === 'pending' || isPublicLibraryPrompt(prompt))
    .map(normalizeProjectPresentation)
  return mergeWithPublicMockPrompts(filtered, { status: 'all' })
}

export async function getPromptById(id: string): Promise<PromptWithRelations | null> {
  const resolvedId = id === SNAKE_PROJECT_LEGACY_ID ? SNAKE_PROJECT_ID : id
  const mockPrompt = publicMockPrompts.find(p => p.id === resolvedId)
  const fallback = mockPrompt ? attachRelations(mockPrompt) : null
  return readWithFallback(fallback, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('prompts')
      .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')
      .eq('id', resolvedId)
      .maybeSingle()

    if (!data) return fallback
    if (data.status === 'approved' && isPublicLibraryPrompt(data)) return normalizeProjectPresentation(data)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fallback
    if (data.author_id === user.id) return normalizeProjectPresentation(data)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'admin') return normalizeProjectPresentation(data)
    return fallback
  })
}

// ---- Profiles ----

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  return readWithFallback(mockProfiles.find(p => p.username === username) ?? null, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()
    return data
  })
}

function getPublicMockProjectForks(projectId: string): ProjectForkNetworkItem[] {
  return publicMockPrompts
    .filter((prompt) => prompt.status === 'approved')
    .filter((prompt) => (
      prompt.fork_source_project_id === projectId ||
      prompt.fork_parent_submission_id === projectId
    ))
    .filter(isPublicLibraryPrompt)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, PROJECT_FORK_MAX_WIDTH)
    .reduce<ProjectForkNetworkItem[]>((forks, prompt) => {
      const forkSource = projectForkSourceFromSubmissionFields(prompt)
      if (!forkSource) return forks
      const author = mockProfiles.find((profile) => profile.id === prompt.author_id)

      forks.push({
        id: prompt.id,
        title: prompt.title,
        description: prompt.description,
        authorUsername: author?.username ?? null,
        authorDisplayName: author?.display_name ?? null,
        modelUsed: prompt.model_used,
        createdAt: prompt.created_at,
        forkSource,
      })

      return forks
    }, [])
}

export async function getApprovedProjectForks(projectId: string): Promise<ProjectForkNetworkItem[]> {
  if (!projectId) return []
  const fallbackForks = getPublicMockProjectForks(projectId)

  return readWithFallback(fallbackForks, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('prompts')
      .select('id,title,description,model_used,created_at,status,author:profiles(username,display_name),fork_source_project_id,fork_source_project_title,fork_source_step_id,fork_source_step_number,fork_parent_submission_id,prompt_family_id,fork_depth,fork_branch_index')
      .eq('status', 'approved')
      .or(`fork_source_project_id.eq.${projectId},fork_parent_submission_id.eq.${projectId}`)
      .order('created_at', { ascending: false })
      .limit(PROJECT_FORK_MAX_WIDTH)

    if (forkColumnsMissing(error)) return fallbackForks
    if (error) throw error

    const dbForks = (data ?? [])
      .filter(isPublicLibraryPrompt)
      .reduce<ProjectForkNetworkItem[]>((forks, prompt) => {
        const forkSource = projectForkSourceFromSubmissionFields(prompt)
        if (!forkSource) return forks
        const author = Array.isArray(prompt.author) ? prompt.author[0] : prompt.author

        forks.push({
          id: prompt.id,
          title: prompt.title,
          description: prompt.description,
          authorUsername: author?.username ?? null,
          authorDisplayName: author?.display_name ?? null,
          modelUsed: prompt.model_used,
          createdAt: prompt.created_at,
          forkSource,
        })
        return forks
      }, [])

    const seen = new Set(dbForks.map((fork) => fork.id))
    return [
      ...dbForks,
      ...fallbackForks.filter((fork) => !seen.has(fork.id)),
    ].slice(0, PROJECT_FORK_MAX_WIDTH)
  })
}

export async function getProjectsByAuthor(authorId: string, username?: string): Promise<PromptWithRelations[]> {
  const fallback = getPublicMockPromptsForProfile({ id: authorId, username })
    .filter(p => p.status === 'approved')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(attachRelations)

  return readWithFallback(fallback, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('prompts')
      .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')
      .eq('author_id', authorId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    const dbProjects = (data ?? []).filter(isPublicLibraryPrompt).map(normalizeProjectPresentation)
    const seen = new Set(dbProjects.map(prompt => prompt.id))
    return [...dbProjects, ...fallback.filter(prompt => !seen.has(prompt.id))]
  })
}

export async function getAuthorStats(authorId: string, username?: string) {
  const authorPrompts = getPublicMockPromptsForProfile({ id: authorId, username })
    .filter(p => p.status === 'approved')
  const fallback = {
    totalProjects: authorPrompts.length,
    totalUpvotes: authorPrompts.reduce((sum, p) => sum + p.vote_count, 0),
    totalBookmarks: authorPrompts.reduce((sum, p) => sum + p.bookmark_count, 0),
    topCategory: getTopCategory(authorPrompts),
    memberSince: mockProfiles.find(p => p.id === authorId || p.username === username)?.created_at ?? '',
  }

  return readWithFallback(fallback, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data: prompts } = await supabase
      .from('prompts')
      .select('id, created_at, vote_count, bookmark_count, category_id, categories(name, icon)')
      .eq('author_id', authorId)
      .eq('status', 'approved')

    const dbItems = (prompts ?? []).filter(isPublicLibraryPrompt)
    const seen = new Set(dbItems.map(prompt => prompt.id))
    const mockItems = authorPrompts.filter(prompt => !seen.has(prompt.id))
    const items = [...dbItems, ...mockItems]
    return {
      totalProjects: items.length,
      totalUpvotes: items.reduce((sum: number, p: { vote_count: number }) => sum + p.vote_count, 0),
      totalBookmarks: items.reduce((sum: number, p: { bookmark_count: number }) => sum + p.bookmark_count, 0),
      topCategory: getTopCategoryFromDb(items),
      memberSince: '',
    }
  })
}

function getTopCategory(prompts: typeof mockPrompts) {
  const counts: Record<string, number> = {}
  for (const p of prompts) {
    counts[p.category_id] = (counts[p.category_id] || 0) + 1
  }
  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!topId) return null
  const cat = publicMockCategories.find(c => c.id === topId)
  return cat ? { name: cat.name, icon: cat.icon } : null
}

function getTopCategoryFromDb(prompts: { category_id: string; categories?: unknown }[]) {
  const counts: Record<string, { count: number; name: string; icon: string }> = {}
  for (const p of prompts) {
    const cat = p.categories as { name: string; icon: string } | null
    const category = cat ?? publicMockCategories.find(item => item.id === p.category_id)
    if (!category) continue
    if (!counts[p.category_id]) counts[p.category_id] = { count: 0, name: category.name, icon: category.icon }
    counts[p.category_id].count++
  }
  const top = Object.values(counts).sort((a, b) => b.count - a.count)[0]
  return top ? { name: top.name, icon: top.icon } : null
}

// ---- Votes & Bookmarks ----

export async function toggleVote(promptId: string): Promise<{ voted: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { voted: false, newCount: 0 }
  if (!isPersistableProjectId(promptId)) throw new Error('This project is not connected to voting yet.')

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in')

  // Check if already voted
  const { data: existing, error: existingError } = await supabase
    .from('votes')
    .select('id')
    .eq('user_id', user.id)
    .eq('prompt_id', promptId)
    .maybeSingle()
  if (existingError) throw existingError

  if (existing) {
    // Remove vote
    const { error } = await supabase.from('votes').delete().eq('id', existing.id)
    if (error) throw error
    const { count, error: countError } = await supabase.from('votes').select('id', { count: 'exact', head: true }).eq('prompt_id', promptId)
    if (countError) throw countError
    return { voted: false, newCount: count ?? 0 }
  } else {
    // Add vote
    const { error } = await supabase.from('votes').insert({ user_id: user.id, prompt_id: promptId })
    if (error) throw error
    const { count, error: countError } = await supabase.from('votes').select('id', { count: 'exact', head: true }).eq('prompt_id', promptId)
    if (countError) throw countError
    return { voted: true, newCount: count ?? 0 }
  }
}

export async function toggleBookmark(promptId: string): Promise<{ bookmarked: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { bookmarked: false, newCount: 0 }
  if (!isPersistableProjectId(promptId)) throw new Error('This project is not connected to bookmarks yet.')

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in')

  const { data: existing, error: existingError } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('prompt_id', promptId)
    .maybeSingle()
  if (existingError) throw existingError

  if (existing) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id)
    if (error) throw error
    const { data: updated, error: countError } = await supabase.from('prompts').select('bookmark_count').eq('id', promptId).single()
    if (countError) throw countError
    return { bookmarked: false, newCount: updated?.bookmark_count ?? 0 }
  } else {
    const { error } = await supabase.from('bookmarks').insert({ user_id: user.id, prompt_id: promptId })
    if (error) throw error
    const { data: updated, error: countError } = await supabase.from('prompts').select('bookmark_count').eq('id', promptId).single()
    if (countError) throw countError
    return { bookmarked: true, newCount: updated?.bookmark_count ?? 0 }
  }
}

export async function getUserVotesAndBookmarks(promptIds: string[]): Promise<{ votes: Set<string>; bookmarks: Set<string> }> {
  if (!SUPABASE_CONFIGURED) return { votes: new Set(), bookmarks: new Set() }
  const persistablePromptIds = promptIds.filter(isPersistableProjectId)
  if (persistablePromptIds.length === 0) return { votes: new Set(), bookmarks: new Set() }

  return readWithFallback({ votes: new Set<string>(), bookmarks: new Set<string>() }, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { votes: new Set(), bookmarks: new Set() }

    const [votesRes, bookmarksRes] = await Promise.all([
      supabase.from('votes').select('prompt_id').eq('user_id', user.id).in('prompt_id', persistablePromptIds),
      supabase.from('bookmarks').select('prompt_id').eq('user_id', user.id).in('prompt_id', persistablePromptIds),
    ])

    return {
      votes: new Set((votesRes.data ?? []).map(v => v.prompt_id)),
      bookmarks: new Set((bookmarksRes.data ?? []).map(b => b.prompt_id)),
    }
  })
}

// ---- Source Run Intake ----

function throwReadableSourceRunError(error: { code?: string; message?: string } | null) {
  if (!error) return

  if (
    error.code === '42P01' ||
    error.message?.includes('source_run_submissions')
  ) {
    throw new Error('Source run intake is not connected to the database yet.')
  }

  throw error
}

function titleColumnMissing(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? ''
  return Boolean(
    error &&
    (
      error.code === '42703' ||
      error.code === 'PGRST204'
    ) &&
    message.includes('title') &&
    message.includes('source_run_submissions')
  )
}

const SOURCE_RUN_FORK_COLUMNS = [
  'fork_source_project_id',
  'fork_source_project_title',
  'fork_source_step_id',
  'fork_source_step_number',
  'fork_parent_submission_id',
  'prompt_family_id',
  'fork_depth',
  'fork_branch_index',
]

function errorMentionsAnyColumn(error: { message?: string } | null, columnNames: string[]) {
  const message = error?.message?.toLowerCase() ?? ''
  return columnNames.some((columnName) => message.includes(columnName))
}

function columnMissingError(error: { code?: string; message?: string } | null, columnNames: string[]) {
  return Boolean(
    error &&
    (
      error.code === '42703' ||
      error.code === 'PGRST204'
    ) &&
    errorMentionsAnyColumn(error, columnNames)
  )
}

function sourceRunForkColumnsMissing(error: { code?: string; message?: string } | null) {
  return columnMissingError(error, SOURCE_RUN_FORK_COLUMNS)
}

function forkColumnsMissing(error: { code?: string; message?: string } | null) {
  return sourceRunForkColumnsMissing(error)
}

function omitForkFields<T extends Record<string, unknown>>(payload: T) {
  const {
    fork_source_project_id: _forkSourceProjectId,
    fork_source_project_title: _forkSourceProjectTitle,
    fork_source_step_id: _forkSourceStepId,
    fork_source_step_number: _forkSourceStepNumber,
    fork_parent_submission_id: _forkParentSubmissionId,
    prompt_family_id: _promptFamilyId,
    fork_depth: _forkDepth,
    fork_branch_index: _forkBranchIndex,
    ...rest
  } = payload
  return rest
}

export async function createSourceRunSubmission(input: {
  title?: string
  source_url?: string
  file_name?: string
  provider?: string
  model_used?: string
  model_settings?: string
  notes?: string
  fork_source?: ProjectForkSource | null
}) {
  if (!SUPABASE_CONFIGURED) throw new Error('Source run intake requires sign in.')

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to submit a source run.')

  const title = input.title?.trim() ?? ''
  const sourceUrl = input.source_url?.trim() ?? ''
  const fileName = input.file_name?.trim() ?? ''
  const provider = input.provider?.trim() || detectSourceRunProvider(sourceUrl)
  const modelUsed = input.model_used?.trim() ?? ''
  const modelSettings = input.model_settings?.trim() ?? ''

  if (!title) {
    throw new Error('Add a title for this source run.')
  }

  if (!sourceUrl) {
    throw new Error('Paste a source run link.')
  }

  if (fileName && !/^[0-9a-f-]+\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(fileName)) {
    throw new Error('Attachment path is invalid.')
  }

  if (fileName && !fileName.startsWith(`${user.id}/`)) {
    throw new Error('Attachment path does not belong to this user.')
  }

  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
    throw new Error('Paste a full source run URL starting with http:// or https://.')
  }

  if (!provider) {
    throw new Error('Pick the AI service for this source run.')
  }

  if (!modelUsed) {
    throw new Error('Add the exact model shown for this source run, or type Not sure.')
  }

  const notes = composeSourceRunReviewNotes({
    sourceUrl,
    provider,
    modelUsed,
    modelSettings,
    notes: input.notes,
  })
  const forkFields = projectForkSourceToSubmissionFields(input.fork_source)

  const payload = {
    title,
    source_url: sourceUrl || null,
    file_name: fileName || null,
    notes,
    ...forkFields,
    author_id: user.id,
    status: 'queued',
  }

  const { data, error } = await supabase
    .from('source_run_submissions')
    .insert(payload)
    .select('id')
    .single()

  if (titleColumnMissing(error) || sourceRunForkColumnsMissing(error)) {
    const fallbackNotes = titleColumnMissing(error)
      ? [`Title: ${title}`, notes].filter(Boolean).join('\n\n') || null
      : notes
    const fallbackPayload = titleColumnMissing(error)
      ? {
        source_url: sourceUrl || null,
        file_name: fileName || null,
        notes: fallbackNotes,
        author_id: user.id,
        status: 'queued',
      }
      : {
        title,
        source_url: sourceUrl || null,
        file_name: fileName || null,
        notes: fallbackNotes,
        author_id: user.id,
        status: 'queued',
      }
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('source_run_submissions')
      .insert(fallbackPayload)
      .select('id')
      .single()

    throwReadableSourceRunError(fallbackError)
    return { id: fallbackData?.id as string }
  }

  throwReadableSourceRunError(error)
  return { id: data?.id as string }
}

export async function getSourceRunSubmissionForAdmin(id: string): Promise<SourceRunSubmissionWithRelations | null> {
  if (!SUPABASE_CONFIGURED) return null

  try {
    const { supabase } = await requireAdminAccess()
    const { data, error } = await supabase
      .from('source_run_submissions')
      .select('*, author:profiles(*), extracted_prompt:prompts(*)')
      .eq('id', id)
      .maybeSingle()

    throwReadableSourceRunError(error)
    return data as SourceRunSubmissionWithRelations | null
  } catch (error) {
    if (error instanceof Error && error.message.includes('Source run intake is not connected')) {
      return null
    }
    throw error
  }
}

export async function getSourceRunSubmissionByPromptIdForAdmin(promptId: string): Promise<SourceRunSubmissionWithRelations | null> {
  if (!SUPABASE_CONFIGURED) return null

  try {
    const { supabase } = await requireAdminAccess()
    const { data, error } = await supabase
      .from('source_run_submissions')
      .select('*, author:profiles(*), extracted_prompt:prompts(*)')
      .eq('extracted_prompt_id', promptId)
      .maybeSingle()

    throwReadableSourceRunError(error)
    return data as SourceRunSubmissionWithRelations | null
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes('Source run intake is not connected') ||
        error.message.includes('Admin access required')
      )
    ) {
      return null
    }
    throw error
  }
}

export async function updateSourceRunStatusById(
  id: string,
  status: SourceRunSubmissionStatus,
  adminNotes?: string
) {
  const { supabase } = await requireAdminAccess()
  const patch: {
    status: SourceRunSubmissionStatus
    admin_notes?: string
    updated_at: string
  } = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (adminNotes?.trim()) patch.admin_notes = adminNotes.trim()

  const { error } = await supabase
    .from('source_run_submissions')
    .update(patch)
    .eq('id', id)

  throwReadableSourceRunError(error)
}

export async function publishPreparedShowcaseProjectFromSourceRun(
  sourceRunId: string,
  project: PreparedShowcaseProject
) {
  if (sourceRunId !== project.sourceRunId) {
    throw new Error('Prepared project does not match this source run.')
  }

  const { supabase, user } = await requireAdminAccess()
  let { data: sourceRun, error: sourceRunError } = await supabase
    .from('source_run_submissions')
    .select('id, author_id, fork_source_project_id, fork_source_project_title, fork_source_step_id, fork_source_step_number, fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index')
    .eq('id', sourceRunId)
    .maybeSingle()

  if (sourceRunForkColumnsMissing(sourceRunError)) {
    const fallbackResult = await supabase
      .from('source_run_submissions')
      .select('id, author_id')
      .eq('id', sourceRunId)
      .maybeSingle()
    sourceRun = fallbackResult.data ? {
      ...fallbackResult.data,
      fork_source_project_id: null,
      fork_source_project_title: null,
      fork_source_step_id: null,
      fork_source_step_number: null,
      fork_parent_submission_id: null,
      prompt_family_id: null,
      fork_depth: null,
      fork_branch_index: null,
    } : null
    sourceRunError = fallbackResult.error
  }

  throwReadableSourceRunError(sourceRunError)
  if (!sourceRun) throw new Error('Source run not found.')
  const sourceForkFields = projectForkSourceToSubmissionFields(projectForkSourceFromSubmissionFields(sourceRun))

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', project.categorySlug)
    .maybeSingle()

  if (categoryError) throw categoryError
  if (!category) throw new Error(`Category not found: ${project.categorySlug}.`)

  const promptPatch = {
    title: project.title,
    description: project.description,
    content: project.content,
    result_content: project.resultContent,
    category_id: category.id as string,
    difficulty: project.difficulty,
    model_used: project.modelUsed,
    model_recommendation: project.modelRecommendation,
    tools_used: project.toolsUsed,
    tags: project.tags,
    status: 'approved',
    ...sourceForkFields,
    updated_at: new Date().toISOString(),
  }

  const { data: existingPrompt, error: existingPromptError } = await supabase
    .from('prompts')
    .select('id')
    .eq('id', project.id)
    .maybeSingle()

  if (existingPromptError) throw existingPromptError

  if (!existingPrompt) {
    const insertPayload = {
      id: project.id,
      ...promptPatch,
      author_id: user.id,
      vote_count: 0,
      bookmark_count: 0,
      created_at: project.createdAt,
    }
    const { error: insertError } = await supabase
      .from('prompts')
      .insert(insertPayload)

    if (insertError) {
      if (!forkColumnsMissing(insertError)) throw insertError

      const { error: fallbackInsertError } = await supabase
        .from('prompts')
        .insert(omitForkFields(insertPayload))
      if (fallbackInsertError) throw fallbackInsertError
    }
  }

  const updatePayload = {
    ...promptPatch,
    author_id: sourceRun.author_id,
  }
  const { error: updatePromptError } = await supabase
    .from('prompts')
    .update(updatePayload)
    .eq('id', project.id)

  if (updatePromptError) {
    if (!forkColumnsMissing(updatePromptError)) throw updatePromptError

    const { error: fallbackUpdateError } = await supabase
      .from('prompts')
      .update(omitForkFields(updatePayload))
      .eq('id', project.id)
    if (fallbackUpdateError) throw fallbackUpdateError
  }

  const { error: updateSourceRunError } = await supabase
    .from('source_run_submissions')
    .update({
      status: 'draft_created',
      extracted_prompt_id: project.id,
      admin_notes: `Published to ${project.href}.`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceRunId)

  throwReadableSourceRunError(updateSourceRunError)
}

export async function getAllSourceRunSubmissionsForAdmin(): Promise<SourceRunSubmissionWithRelations[]> {
  if (!SUPABASE_CONFIGURED) return []

  try {
    const { supabase } = await requireAdminAccess()
    const { data, error } = await supabase
      .from('source_run_submissions')
      .select('*, author:profiles(*), extracted_prompt:prompts(*)')
      .order('created_at', { ascending: false })

    throwReadableSourceRunError(error)
    return (data ?? []) as SourceRunSubmissionWithRelations[]
  } catch (error) {
    if (error instanceof Error && error.message.includes('Source run intake is not connected')) {
      return []
    }
    throw error
  }
}

// ---- Suggestions ----

function suggestionPublishDate(approvedAt: string) {
  return new Date(new Date(approvedAt).getTime() + SUGGESTION_PUBLIC_DELAY_MS).toISOString()
}

function isPublicSuggestion(suggestion: SuggestionWithRelations, now = new Date()) {
  if (suggestion.moderation_status !== 'approved') return false
  if (suggestion.visibility === 'public') return true
  return Boolean(
    suggestion.visibility === 'scheduled_public' &&
    suggestion.scheduled_publish_at &&
    new Date(suggestion.scheduled_publish_at).getTime() <= now.getTime()
  )
}

function sortSuggestions<T extends SuggestionWithRelations>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at).getTime()
    const bTime = new Date(b.updated_at || b.created_at).getTime()
    return bTime - aTime
  })
}

function normalizeSuggestionRows(rows: SuggestionWithRelations[] | null | undefined) {
  return sortSuggestions((rows ?? []).map((row) => ({
    ...row,
    responses: [...(row.responses ?? [])].sort((a, b) => (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )),
  })))
}

function throwReadableSuggestionError(error: { code?: string; message?: string } | null) {
  if (!error) return

  if (
    error.code === '42P01' ||
    error.message?.includes('suggestions') ||
    error.message?.includes('suggestion_responses') ||
    error.message?.includes('suggestion_votes')
  ) {
    throw new Error('Suggestion Box is not connected to the database yet.')
  }

  throw error
}

async function readSuggestionsWithFallback<T>(fallback: T, read: () => Promise<T>): Promise<T> {
  if (!SUPABASE_CONFIGURED) return fallback

  try {
    return await Promise.race([
      read(),
      new Promise<T>((resolve) => {
        setTimeout(() => resolve(fallback), SUPABASE_READ_TIMEOUT_MS)
      }),
    ])
  } catch {
    return fallback
  }
}

async function requireAdminAccess() {
  if (!SUPABASE_CONFIGURED) throw new Error('Admin access requires Supabase.')

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) throw new Error('Log in as an admin.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    throw new Error('Admin access required.')
  }

  return { supabase, user }
}

export async function getPublicSuggestions(): Promise<SuggestionWithRelations[]> {
  const fallback = normalizeSuggestionRows(mockSuggestions).filter((suggestion) => (
    isPublicSuggestion(suggestion)
  )).map((suggestion) => ({
    ...suggestion,
    responses: (suggestion.responses ?? []).filter((response) => response.visibility === 'public'),
  }))

  return readSuggestionsWithFallback(fallback, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('suggestions')
      .select('*, author:profiles(*), responses:suggestion_responses(*)')
      .eq('moderation_status', 'approved')
      .or(`visibility.eq.public,and(visibility.eq.scheduled_public,scheduled_publish_at.lte.${now})`)
      .order('updated_at', { ascending: false })

    return normalizeSuggestionRows(data as SuggestionWithRelations[]).map((suggestion) => ({
      ...suggestion,
      responses: (suggestion.responses ?? []).filter((response) => response.visibility === 'public'),
    }))
  })
}

export async function getMySuggestions(): Promise<SuggestionWithRelations[]> {
  if (!SUPABASE_CONFIGURED) return []

  return readSuggestionsWithFallback([], async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
      .from('suggestions')
      .select('*, author:profiles(*), responses:suggestion_responses(*)')
      .eq('author_id', user.id)
      .order('updated_at', { ascending: false })

    return normalizeSuggestionRows(data as SuggestionWithRelations[])
  })
}

export async function getAllSuggestionsForAdmin(): Promise<SuggestionWithRelations[]> {
  if (!SUPABASE_CONFIGURED) return []

  return readSuggestionsWithFallback([], async () => {
    const { supabase } = await requireAdminAccess()
    const { data, error } = await supabase
      .from('suggestions')
      .select('*, author:profiles(*), responses:suggestion_responses(*)')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return normalizeSuggestionRows(data as SuggestionWithRelations[])
  })
}

export async function getSuggestionStats() {
  if (!SUPABASE_CONFIGURED) {
    return { total: 0, pending: 0, approved: 0, private: 0, public: 0 }
  }

  const { supabase } = await requireAdminAccess()
  const now = new Date().toISOString()
  const [total, pending, approved, privateItems, publicItems] = await Promise.all([
    supabase.from('suggestions').select('*', { count: 'exact', head: true }),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('moderation_status', 'approved'),
    supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('visibility', 'private'),
    supabase
      .from('suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('moderation_status', 'approved')
      .or(`visibility.eq.public,and(visibility.eq.scheduled_public,scheduled_publish_at.lte.${now})`),
  ])

  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    approved: approved.count ?? 0,
    private: privateItems.count ?? 0,
    public: publicItems.count ?? 0,
  }
}

export async function createSuggestion(input: { title: string; body: string }) {
  if (!SUPABASE_CONFIGURED) throw new Error('Suggestion submission requires sign in.')

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to send a suggestion.')

  const title = input.title.trim()
  const body = input.body.trim()
  if (title.length < 4) throw new Error('Add a clearer suggestion title.')
  if (body.length < 12) throw new Error('Add a little more detail so PathForge can respond.')

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      title,
      body,
      author_id: user.id,
      moderation_status: 'pending',
      public_status: 'under_review',
      visibility: 'private',
      vote_count: 0,
    })
    .select('id')
    .single()

  throwReadableSuggestionError(error)
  if (!data) throw new Error('Suggestion could not be created.')
  return { id: data.id as string }
}

export async function approveSuggestionById(id: string) {
  if (!SUPABASE_CONFIGURED) return

  const approvedAt = new Date().toISOString()
  const { supabase } = await requireAdminAccess()
  const { error } = await supabase
    .from('suggestions')
    .update({
      moderation_status: 'approved',
      public_status: 'under_review',
      visibility: 'scheduled_public',
      approved_at: approvedAt,
      scheduled_publish_at: suggestionPublishDate(approvedAt),
      kept_private_at: null,
      updated_at: approvedAt,
    })
    .eq('id', id)

  if (error) throw error
}

export async function declineSuggestionById(id: string) {
  if (!SUPABASE_CONFIGURED) return

  const now = new Date().toISOString()
  const { supabase } = await requireAdminAccess()
  const { error } = await supabase
    .from('suggestions')
    .update({
      moderation_status: 'declined',
      public_status: 'declined',
      visibility: 'private',
      updated_at: now,
    })
    .eq('id', id)

  if (error) throw error
}

export async function keepSuggestionPrivateById(id: string) {
  if (!SUPABASE_CONFIGURED) return

  const now = new Date().toISOString()
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to update this suggestion.')

  const { error } = await supabase
    .from('suggestions')
    .update({
      visibility: 'private',
      kept_private_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('visibility', 'scheduled_public')
    .gt('scheduled_publish_at', now)

  if (error) throw error
}

export async function updateSuggestionPublicStatusById(id: string, status: SuggestionPublicStatus) {
  if (!SUPABASE_CONFIGURED) return

  const now = new Date().toISOString()
  const { supabase } = await requireAdminAccess()
  const updates: {
    public_status: SuggestionPublicStatus
    updated_at: string
    moderation_status?: 'approved' | 'declined'
    visibility?: 'private'
  } = { public_status: status, updated_at: now }

  if (status === 'declined') {
    updates.moderation_status = 'declined'
    updates.visibility = 'private'
  } else if (status === 'planned' || status === 'shipped') {
    updates.moderation_status = 'approved'
  }

  const { error } = await supabase
    .from('suggestions')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function createSuggestionResponse(input: {
  suggestionId: string
  body: string
  visibility: SuggestionResponseVisibility
}) {
  if (!SUPABASE_CONFIGURED) return

  const body = input.body.trim()
  if (!body) throw new Error('Write a response first.')

  const { supabase, user } = await requireAdminAccess()

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('suggestion_responses')
    .insert({
      suggestion_id: input.suggestionId,
      responder_id: user.id,
      body,
      visibility: input.visibility,
    })

  if (error) throw error

  await supabase
    .from('suggestions')
    .update({ updated_at: now })
    .eq('id', input.suggestionId)
}

export async function getUserSuggestionVotes(suggestionIds: string[]): Promise<Set<string>> {
  if (!SUPABASE_CONFIGURED || suggestionIds.length === 0) return new Set()

  const uniqueIds = [...new Set(suggestionIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Set()

  return readSuggestionsWithFallback(new Set<string>(), async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return new Set()

    const { data, error } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id')
      .eq('user_id', user.id)
      .in('suggestion_id', uniqueIds)

    throwReadableSuggestionError(error)
    return new Set((data ?? []).map(v => v.suggestion_id).filter(Boolean))
  })
}

export async function toggleSuggestionVote(suggestionId: string): Promise<{ voted: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { voted: false, newCount: 0 }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Log in to vote.')

  const { data: existing, error: existingError } = await supabase
    .from('suggestion_votes')
    .select('id')
    .eq('user_id', user.id)
    .eq('suggestion_id', suggestionId)
    .maybeSingle()
  throwReadableSuggestionError(existingError)

  if (existing) {
    const { error } = await supabase.from('suggestion_votes').delete().eq('id', existing.id)
    throwReadableSuggestionError(error)
    const { data: updated, error: countError } = await supabase.from('suggestions').select('vote_count').eq('id', suggestionId).single()
    throwReadableSuggestionError(countError)
    return { voted: false, newCount: updated?.vote_count ?? 0 }
  }

  const { error } = await supabase.from('suggestion_votes').insert({ user_id: user.id, suggestion_id: suggestionId })
  throwReadableSuggestionError(error)
  const { data: updated, error: countError } = await supabase.from('suggestions').select('vote_count').eq('id', suggestionId).single()
  throwReadableSuggestionError(countError)
  return { voted: true, newCount: updated?.vote_count ?? 0 }
}

// ---- Build Requests ----

function sortBuildRequests<T extends BuildRequestWithRelations>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at).getTime()
    const bTime = new Date(b.updated_at || b.created_at).getTime()
    return bTime - aTime
  })
}

function normalizeBuildRequestRows(rows: BuildRequestWithRelations[] | null | undefined) {
  return sortBuildRequests((rows ?? []).map((row) => ({
    ...row,
    responses: [...(row.responses ?? [])].sort((a, b) => (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )),
  })))
}

function throwReadableBuildRequestError(error: { code?: string; message?: string } | null) {
  if (!error) return

  if (
    error.code === '42P01' ||
    error.message?.includes('build_requests') ||
    error.message?.includes('build_request_responses') ||
    error.message?.includes('build_request_votes')
  ) {
    throw new Error('Build Requests are not connected to the database yet.')
  }

  throw error
}

async function readBuildRequestsWithFallback<T>(fallback: T, read: () => Promise<T>): Promise<T> {
  if (!SUPABASE_CONFIGURED) return fallback

  try {
    return await Promise.race([
      read(),
      new Promise<T>((resolve) => {
        setTimeout(() => resolve(fallback), SUPABASE_READ_TIMEOUT_MS)
      }),
    ])
  } catch {
    return fallback
  }
}

export async function getPublicBuildRequests(): Promise<BuildRequestWithRelations[]> {
  return readBuildRequestsWithFallback(mockBuildRequests, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('build_requests')
      .select('*, author:profiles(*), responses:build_request_responses(*)')
      .order('updated_at', { ascending: false })

    return normalizeBuildRequestRows(data as BuildRequestWithRelations[])
  })
}

export async function createBuildRequest(input: { title: string; body: string }) {
  if (!SUPABASE_CONFIGURED) throw new Error('Build Requests require sign in.')

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to request a build.')

  const title = input.title.trim()
  const body = input.body.trim()
  if (title.length < 4) throw new Error('Add a clearer request title.')
  if (body.length < 20) throw new Error('Add more detail so builders know what to make.')

  const { error } = await supabase
    .from('build_requests')
    .insert({
      title,
      body,
      author_id: user.id,
      status: 'open',
      vote_count: 0,
    })

  throwReadableBuildRequestError(error)
}

export async function createBuildRequestResponse(input: {
  requestId: string
  body: string
  url: string
}) {
  if (!SUPABASE_CONFIGURED) return

  const body = input.body.trim()
  const url = input.url.trim()
  if (!body && !url) throw new Error('Add a response or a link to a build.')

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to respond to a build request.')

  const { error } = await supabase
    .from('build_request_responses')
    .insert({
      request_id: input.requestId,
      responder_id: user.id,
      body: body || 'Shared a build link.',
      url: url || null,
    })

  throwReadableBuildRequestError(error)
}

export async function getUserBuildRequestVotes(requestIds: string[]): Promise<Set<string>> {
  if (!SUPABASE_CONFIGURED || requestIds.length === 0) return new Set()

  const uniqueIds = [...new Set(requestIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Set()

  return readBuildRequestsWithFallback(new Set<string>(), async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return new Set()

    const { data, error } = await supabase
      .from('build_request_votes')
      .select('request_id')
      .eq('user_id', user.id)
      .in('request_id', uniqueIds)

    throwReadableBuildRequestError(error)
    return new Set((data ?? []).map(v => v.request_id).filter(Boolean))
  })
}

export async function toggleBuildRequestVote(requestId: string): Promise<{ voted: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { voted: false, newCount: 0 }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Log in to vote.')

  const { data: existing, error: existingError } = await supabase
    .from('build_request_votes')
    .select('id')
    .eq('user_id', user.id)
    .eq('request_id', requestId)
    .maybeSingle()
  throwReadableBuildRequestError(existingError)

  if (existing) {
    const { error } = await supabase.from('build_request_votes').delete().eq('id', existing.id)
    throwReadableBuildRequestError(error)
    const { data: updated, error: countError } = await supabase.from('build_requests').select('vote_count').eq('id', requestId).single()
    throwReadableBuildRequestError(countError)
    return { voted: false, newCount: updated?.vote_count ?? 0 }
  }

  const { error } = await supabase.from('build_request_votes').insert({ user_id: user.id, request_id: requestId })
  throwReadableBuildRequestError(error)
  const { data: updated, error: countError } = await supabase.from('build_requests').select('vote_count').eq('id', requestId).single()
  throwReadableBuildRequestError(countError)
  return { voted: true, newCount: updated?.vote_count ?? 0 }
}

// ---- Admin ----

export async function getPromptStats() {
  if (!SUPABASE_CONFIGURED) {
    return { total: 0, pending: 0, approved: 0, rejected: 0, categories: 0 }
  }

  const { supabase } = await requireAdminAccess()
  const [total, pending, approved, rejected, categories] = await Promise.all([
    supabase.from('prompts').select('*', { count: 'exact', head: true }),
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
  ])

  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    approved: approved.count ?? 0,
    rejected: rejected.count ?? 0,
    categories: categories.count ?? 0,
  }
}

export async function createProject(project: {
  title: string
  description: string
  content: string
  result_content: string | null
  category_slug: string
  difficulty: string
  model_used: string | null
  model_recommendation: string | null
  tools_used: string[]
  tags: string[]
  steps: { title: string; content: string; result_content: string | null; description: string | null }[]
  fork_source?: ProjectForkSource | null
}) {
  if (!SUPABASE_CONFIGURED) return { id: 'mock-id' }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to submit a project')

  // Look up category ID from slug
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', project.category_slug)
    .single()
  if (!cat) throw new Error('Invalid category')

  // Insert the project
  const promptPayload = {
    title: project.title,
    description: project.description,
    content: project.content,
    result_content: project.result_content || null,
    category_id: cat.id,
    difficulty: project.difficulty,
    model_used: project.model_used || null,
    model_recommendation: project.model_recommendation || null,
    tools_used: project.tools_used,
    tags: project.tags,
    ...projectForkSourceToSubmissionFields(project.fork_source),
    status: 'pending',
    author_id: user.id,
  }
  let { data: prompt, error: promptError } = await supabase
    .from('prompts')
    .insert(promptPayload)
    .select('id')
    .single()

  if (promptError) {
    if (!forkColumnsMissing(promptError)) throw promptError

    const fallbackResult = await supabase
      .from('prompts')
      .insert(omitForkFields(promptPayload))
      .select('id')
      .single()
    prompt = fallbackResult.data
    promptError = fallbackResult.error
  }

  if (promptError) throw promptError
  if (!prompt) throw new Error('Project submission did not return an id.')

  // Insert steps if any
  if (project.steps.length > 0) {
    const stepsToInsert = project.steps.map((step, idx) => ({
      prompt_id: prompt.id,
      step_number: idx + 1,
      title: step.title,
      content: step.content,
      result_content: step.result_content || null,
      description: step.description || null,
    }))

    const { error: stepsError } = await supabase
      .from('prompt_steps')
      .insert(stepsToInsert)

    if (stepsError) throw stepsError
  }

  return { id: prompt.id }
}

export async function updatePromptStatus(id: string, status: 'approved' | 'rejected') {
  const { supabase } = await requireAdminAccess()
  const { error } = await supabase.from('prompts').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
