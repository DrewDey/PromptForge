import type { PreparedShowcaseProject } from './prepared-showcase-projects'
import {
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
} from './featured-projects'

type PendingSourceRunDescriptor = {
  projectId: string
  sourceRunId: string
  href: string
  title: string
  description: string
  content: string
  resultContent: string
  categorySlug: string
  mockCategoryId: string
  difficulty: 'beginner'
  modelUsed: string
  modelRecommendation: string
  promptFamilyId?: string
  toolsUsed: string[]
  tags: string[]
  artifactPath: string
  sourceUrl: string
  authorDisplayName: string
  authorUsername: string
  createdAt: string
  updatedAt: string
  prompts: string[]
}

function buildPendingSourceRunProject(input: PendingSourceRunDescriptor): PreparedShowcaseProject {
  return {
    id: input.projectId,
    sourceRunId: input.sourceRunId,
    href: input.href,
    title: input.title,
    description: input.description,
    content: input.content,
    resultContent: input.resultContent,
    categorySlug: input.categorySlug,
    mockCategoryId: input.mockCategoryId,
    difficulty: input.difficulty,
    modelUsed: input.modelUsed,
    modelRecommendation: input.modelRecommendation,
    promptFamilyId: input.promptFamilyId,
    toolsUsed: input.toolsUsed,
    tags: input.tags,
    artifactPath: input.artifactPath,
    sourceUrl: input.sourceUrl,
    authorDisplayName: input.authorDisplayName,
    authorUsername: input.authorUsername,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    steps: input.prompts.map((prompt, index) => ({
      id: `${input.projectId}-step-${index + 1}`,
      stepNumber: index + 1,
      title: index === 0 ? 'Start the build' : `Refine the build ${index + 1}`,
      content: prompt,
      resultContent: '',
      description: index === input.prompts.length - 1
        ? 'Final response package that produced the mounted public artifact.'
        : 'Captured source-run prompt preserved before its response package.',
    })),
  }
}

export const TINY_TRAIN_DISPATCHER_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: TINY_TRAIN_DISPATCHER_PROJECT_ID,
  sourceRunId: "90bf62c0-ae89-4b03-95fd-5d1ad0f29f9f",
  href: "/tiny-train-platform-dispatcher-demo",
  title: "Tiny Train Platform Dispatcher",
  description: "Single-file train platform dispatcher game where players route arriving trains to three platforms before timers expire.",
  content: "Maren Ellis used Claude to build Tiny Train Platform Dispatcher through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "A compact station-control game: incoming trains spawn with TTL bars, players route them to three timed platforms, score is awarded for fast dispatch, missed trains reduce score, level escalates after time, and five misses closes the station.",
  categorySlug: "personal",
  mockCategoryId: "cat-10",
  difficulty: 'beginner',
  modelUsed: "Sonnet 4.6 Max (visible Claude composer model label)",
  modelRecommendation: "Sonnet 4.6 Max (visible Claude composer model label)",
  toolsUsed: ["Claude in logged-in Chrome session","local static verification server","Chrome browser verification"],
  tags: ["trains","dispatcher","time-management","simulation","single-file-html","keyboard","mobile","source-run"],
  artifactPath: "/artifacts/tiny-train-platform-dispatcher-claude.html",
  sourceUrl: "https://claude.ai/chat/77f9eb29-e596-43ed-9080-baeafce15e7e",
  authorDisplayName: "Maren Ellis",
  authorUsername: "MarenEllis",
  createdAt: "2026-06-05T07:40:00-04:00",
  updatedAt: "2026-06-05T12:01:18.909Z",
  prompts: [
    "Build me a tiny train platform dispatcher as a single-file HTML game: it should be easy to understand fast, let me route arriving trains into platforms under time pressure, and run with no external assets.",
    "The preview didn’t load here; please give me the complete single-file HTML/CSS/JS in a code block instead, keeping the train selection and platform routing rules you described.",
    "This is close, but the file still loads Google Fonts. Remove every external resource so it works fully offline, keep it as one HTML file, and preserve the current dispatcher gameplay.",
    "The offline artifact looks like the right version, but I need the complete source pasted inline too. Please paste the full current offline HTML in one code block, unchanged from the artifact version.",
    "I tested the saved file and it only works by clicking; the final needs keyboard support too, and the 5-column HUD looks tight for phones. Add keyboard shortcuts for selecting arrivals and assigning platforms, keep pointer/touch clicks, and make the layout stack cleanly at 390px with no horizontal overflow. Still one offline HTML file."
  ],
})

export const BREAKROOM_SNACK_RESTOCK_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: BREAKROOM_SNACK_RESTOCK_PROJECT_ID,
  sourceRunId: "0e244880-4d58-40f7-b865-d056d9f4334f",
  href: "/breakroom-snack-restock-planner-demo",
  title: "Breakroom Snack Restock Planner",
  description: "A one-file office breakroom restock planner that starts with sample snacks and teammate preferences, ranks purchase priority, estimates spend, supports editing and handoff, and persists locally.",
  content: "Casey Luo used Gemini to build Breakroom Snack Restock Planner through a 6-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "A browser-based breakroom snack restock planner with sample inventory and preferences, restock scoring, estimated spend, add/edit/remove workflows, local persistence, and copy/export/print handoff.",
  categorySlug: "productivity",
  mockCategoryId: "cat-7",
  difficulty: 'beginner',
  modelUsed: "Flash",
  modelRecommendation: "Flash",
  toolsUsed: ["Gemini web in Chrome","local browser verification"],
  tags: ["breakroom","snack restock","inventory","team preferences","office ops","single-file HTML","localStorage","export","print","source-run"],
  artifactPath: "/artifacts/breakroom-snack-restock-planner-gemini.html",
  sourceUrl: "https://gemini.google.com/app/f23df8e88c1bb20a",
  authorDisplayName: "Casey Luo",
  authorUsername: "CaseyLuo",
  createdAt: "2026-06-05T11:48:17.438Z",
  updatedAt: "2026-06-05T11:51:22.232Z",
  prompts: [
    "Could you make a single-file HTML planner for our office breakroom snack restock that starts with a few sample items and teammate preferences, then shows what to buy first and a rough spend so I can use it quickly?",
    "The first version has the basics, but I need a clean handoff once the list is ready. Add copy, export, and print controls for the restock order, and let me edit existing rows without deleting them first.",
    "The handoff buttons help, but the teammate preference section is still just a static note. Let me add, edit, and remove teammate preferences, and have those requests influence the restock priority score.",
    "This is getting close. I want the whole board to survive reloads, including teammate preferences and edits, and I want a one-click restore of the sample inventory/preferences so someone can demo it without setup.",
    "Since that last reply was just a check, give me the final consolidated single-file HTML now: keep the edit/add/remove flows, copy/export/print handoff, persistence/restore demo data, and make the 390px mobile layout avoid page-level horizontal scrolling.",
    "I tested the final file in a 390px-wide harness and the document still has page-level horizontal overflow, with scrollWidth around 558px. Fix that without removing the table data or handoff controls; the table can scroll inside its own container, but the document and body width need to stay at 390px."
  ],
})

export const PORCH_LIGHT_MOTH_MAZE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: PORCH_LIGHT_MOTH_MAZE_PROJECT_ID,
  sourceRunId: "a858d84f-4280-4ecf-aec5-8480359abe54",
  href: "/porch-light-moth-maze-demo",
  title: "Porch Light Moth Maze",
  description: "A self-contained browser game where players steer a moth through porch-light maze corridors, collect nectar, avoid bright bulb pull, choose difficulty levels, and replay for timer bonuses.",
  content: "Blair Nolan used ChatGPT to build Porch Light Moth Maze through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Playable one-file porch-light moth maze game with difficulty selection, timer bonus, keyboard/mouse/touch controls, and replay scorecard.",
  categorySlug: "personal",
  mockCategoryId: "cat-10",
  difficulty: 'beginner',
  modelUsed: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  modelRecommendation: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  toolsUsed: ["ChatGPT web in Chrome","single-file HTML","Canvas API","localStorage"],
  tags: ["game","maze","canvas","keyboard","touch","mouse","localStorage","mobile","source-run"],
  artifactPath: "/artifacts/porch-light-moth-maze-chatgpt.html",
  sourceUrl: "https://chatgpt.com/c/6a22b5b4-3730-83ea-8df5-0fe61982046b",
  authorDisplayName: "Blair Nolan",
  authorUsername: "BlairNolan",
  createdAt: "2026-06-05T11:24:00Z",
  updatedAt: "2026-06-05T11:53:21Z",
  prompts: [
    "Can you make a one-file HTML game where I steer a moth through a porch-light maze without getting trapped by the brightest bulbs?",
    "The first version runs, but the maze feels more like an open arena. Make it feel more maze-like with clearer wall corridors, add a real mouse/touch drag steering option in addition to the buttons, and keep it one offline HTML file.",
    "This is closer. The path is readable, but once you finish it there is not much reason to replay. Add a small Easy / Porch / Storm level select, a timer bonus that makes repeat attempts matter, and keep the start and replay flow clear.",
    "On a phone-sized viewport this is likely to get cramped with the five HUD boxes and level buttons. Tighten the mobile layout for 390px screens: no horizontal scrolling, buttons stay tappable, the canvas should fit above the controls, and keep everything inline/offline.",
    "This passes the narrow layout check. For the final version, make the end and replay screen more useful: show level, time, timer bonus, nectar collected, and best score; add Enter/Space replay plus 1/2/3 level shortcuts; keep the 390px no-overflow and offline single-file constraints."
  ],
})

export const PANTRY_SHELF_LIFE_RESCUE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: PANTRY_SHELF_LIFE_RESCUE_PROJECT_ID,
  sourceRunId: "61ea4cdf-d984-4195-be6c-c21db7e2ad85",
  href: "/pantry-shelf-life-rescue-planner-demo",
  title: "Pantry Shelf-Life Rescue Planner",
  description: "A one-file pantry and fridge rescue planner that tracks expiring items, portions, locations, constraints, use-now meal combos, saved inventory, and handoff controls.",
  content: "Morgan Vale used Gemini to build Pantry Shelf-Life Rescue Planner through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Self-contained HTML planner for pantry/fridge shelf-life rescue planning. The final version lets a user load sample inventory, add items with location/days/portions/tags, save inventory locally, generate use-now meal combos, and copy/print/export/import handoff data.",
  categorySlug: "productivity",
  mockCategoryId: "cat-7",
  difficulty: 'beginner',
  modelUsed: "Flash",
  modelRecommendation: "Flash",
  toolsUsed: ["Gemini web in Chrome","Flash mode","single-file HTML","localStorage"],
  tags: ["pantry","food waste","meal planning","home planning","localStorage","single-file HTML","source-run"],
  artifactPath: "/artifacts/pantry-shelf-life-rescue-gemini.html",
  sourceUrl: "https://gemini.google.com/app/161783fc2816f660",
  authorDisplayName: "Morgan Vale",
  authorUsername: "MorganVale",
  createdAt: "2026-06-05T10:38:00Z",
  updatedAt: "2026-06-05T10:49:55Z",
  prompts: [
    "I keep discovering cans and fridge odds-and-ends right before they expire; can you make me a single HTML file that turns a pantry/fridge list into a practical use-today rescue plan?",
    "This is a good start, but I need it to handle structured entries instead of guessing from a notes box. Add fields for item, location, days until expiration, portions, and constraint tags, then save the inventory in localStorage.",
    "The saved inventory helps, but the plan still feels like priority buckets more than actual meals. Add a use-now section that groups expiring items into 2 or 3 simple meal/combo suggestions and make the suggestions respect tags like vegetarian, dairy-free, no oven, or quick.",
    "This is useful now, but I need a way to hand it off. Add buttons to copy the current rescue plan, print a clean kitchen-friendly version, export the inventory/plan as a file, and import a saved inventory JSON back in.",
    "Before I use this on my phone, tighten the layout so there is no page-level horizontal overflow around 390px wide, keep any inventory table scrolling inside its own box, make the copy/export/print controls easy to test, remove any external assets, and add a small sample-inventory button for a quick demo."
  ],
})

export const MINI_HARBOR_TUGBOAT_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: MINI_HARBOR_TUGBOAT_PROJECT_ID,
  sourceRunId: "89c291ed-41fc-4e6b-ae1a-c7da9e89427b",
  href: "/mini-harbor-tugboat-switcher-demo",
  title: "Mini Harbor Tugboat Switcher",
  description: "A self-contained canvas game where players switch harbor lanes so little colored tugboats reach matching docks, with keyboard/touch controls, a short result loop, and a locally saved best score.",
  content: "Sasha Kim used ChatGPT to build Mini Harbor Tugboat Switcher through a 6-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Playable local HTML game; route tugboats through switches into matching colored docks.",
  categorySlug: "personal",
  mockCategoryId: "cat-10",
  difficulty: 'beginner',
  modelUsed: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  modelRecommendation: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  toolsUsed: ["ChatGPT web in Chrome","single-file HTML","Canvas API","localStorage"],
  tags: ["game","puzzle","canvas","keyboard","touch","localStorage","harbor","source-run"],
  artifactPath: "/artifacts/mini-harbor-tugboat-switcher-chatgpt.html",
  sourceUrl: "https://chatgpt.com/c/6a22a894-0168-83ea-8285-0118daa7c79f",
  authorDisplayName: "Sasha Kim",
  authorUsername: "SashaKim",
  createdAt: "2026-06-05T10:52:16.583Z",
  updatedAt: "2026-06-05T11:05:16.583Z",
  prompts: [
    "My kid keeps asking about harbor boats; build me a tiny browser game where little tugboats hit switchable water lanes and have to dock at the matching pier. I'd like one HTML file I can open locally.",
    "The harbor idea is there, but I can only tap the switches. Add keyboard controls so keys 1-6 cycle the six switches, and show that control hint without making the page feel crowded.",
    "Can you give me the whole updated HTML file instead of snippets, with the 1-6 shortcuts already wired in? Also add a best score that saves locally after each harbor run.",
    "This is closer, but the ending still feels like a little canvas message. Add a clear short result panel with final score, docked count, best score, and a Play Again button so the loop feels finished.",
    "The result loop helps. For the first 15 seconds, make the board easier to read: label the switches 1-6 on the water, show the next tug color before it launches, and add a short start panel with the goal. Please send the full HTML again.",
    "One last pass before I save it for review: make the file fully offline with no external resources, avoid page-level horizontal overflow on a 390px phone, and keep touch/mouse, 1-6 keyboard controls, the result panel, and local best score working. Send the complete final HTML."
  ],
})

export const TINY_FARMERS_MARKET_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: TINY_FARMERS_MARKET_PROJECT_ID,
  sourceRunId: "8f0bf0c7-e3fa-4e0b-86f7-d9cfa4e77cef",
  href: "/tiny-farmers-market-booth-simulator-demo",
  title: "Tiny Farmers Market Booth Simulator",
  description: "A playful offline farmers market booth simulator where the user picks produce, prices stock, runs market hours, compares goals, saves history, uses presets, and copies a booth report.",
  content: "Finn Parker used Claude to build Tiny Farmers Market Booth Simulator through a 6-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "An offline farmers market booth simulator with produce presets, pricing controls, market-hour goals, saved history, and copyable booth reports.",
  categorySlug: "productivity",
  mockCategoryId: "cat-7",
  difficulty: 'beginner',
  modelUsed: "Sonnet 4.6 Max (visible Claude composer model label)",
  modelRecommendation: "Sonnet 4.6 Max (visible Claude composer model label)",
  toolsUsed: ["Claude web","Chrome","local browser verification"],
  tags: ["farmers market","simulator","pricing","localStorage","mobile","offline","playful productivity","source-run"],
  artifactPath: "/artifacts/tiny-farmers-market-booth-claude.html",
  sourceUrl: "https://claude.ai/chat/0c68b5be-8ca9-47e3-9087-04668db8e9d1",
  authorDisplayName: "Finn Parker",
  authorUsername: "FinnParker",
  createdAt: "2026-06-05T09:41:00Z",
  updatedAt: "2026-06-05T10:33:38.957Z",
  prompts: [
    "I keep thinking a tiny farmers market booth would make a nice little browser sim: pick today's produce, set prices, and see if the booth makes money before the market closes. Can you make it as one complete HTML file and paste the full code here so I can save it?",
    "This is fun, but I noticed the file still pulls Google Fonts and I want it to work completely offline. Can you remove any external resources, keep the same cozy feel with system fonts, and add one setup choice for the booth goal — profit, sell-through, or freshness — that changes the end-of-day grade? Please paste the full updated HTML.",
    "This is getting useful as a little planning toy. I want to compare a few booth attempts instead of losing each run after the results screen. Add a saved market-day history using localStorage with the goal, weather, profit, sell-through, and grade for each completed day, plus a clear-history button. Keep it offline and paste the full updated HTML.",
    "One thing I would worry about before using this on my phone: the setup table may get cramped once quantity and price inputs are visible. Can you make the setup screen phone-first with produce cards or stacked controls instead of a wide table, keep the desktop view tidy, and make sure the page itself will not horizontally overflow around 390px wide? Full updated HTML please.",
    "Last thing I would add: make it easier to replay or share a finished booth day. Add a few setup presets like balanced Saturday, rainy budget table, and premium berries/herbs, and add a copyable booth report on the results screen with the goal, weather, profit, sell-through, grade, and best/worst items. Keep it all offline with no external resources and paste the full updated HTML.",
    "I ran a 390px iframe check and found a real mobile overflow: the header history button pushes the body to about 428px wide even though html overflow is hidden. Please fix the mobile header/meta layout so both document and body stay within 390px without clipping the History button or count, keep all existing features, and paste the full corrected HTML."
  ],
})

export const ROOMMATE_CHORE_DRAFT_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: ROOMMATE_CHORE_DRAFT_PROJECT_ID,
  sourceRunId: "d224897c-0aab-4a01-88d6-a0e3bd5f47d9",
  href: "/roommate-chore-draft-board-demo",
  title: "Roommate Chore Draft Board",
  description: "A self-contained roommate chore draft board that adds roommates and chores, runs a snake-style assignment draft, balances effort-point load totals, autosaves locally, copies/shares the final plan, and prints a clean chore plan.",
  content: "Leah Brooks used Gemini to build Roommate Chore Draft Board through a 6-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Final artifact is a self-contained roommate chore draft board with editable roommates and chores, snake-style turn order, effort-point load totals, localStorage autosave, reset controls, copy/share summary, and print-friendly final plan.",
  categorySlug: "productivity",
  mockCategoryId: "cat-7",
  difficulty: 'beginner',
  modelUsed: "Flash (visible Gemini mode picker; exact backend version not exposed)",
  modelRecommendation: "Flash (visible Gemini mode picker; exact backend version not exposed)",
  toolsUsed: ["Gemini web","Chrome","HTML","CSS","JavaScript","localStorage"],
  tags: ["roommates","chores","home coordination","draft board","snake draft","local storage","printable plan","mobile tool","source-run"],
  artifactPath: "/artifacts/roommate-chore-draft-board-gemini.html",
  sourceUrl: "https://gemini.google.com/app/41ebf33c66736e90",
  authorDisplayName: "Leah Brooks",
  authorUsername: "LeahBrooks",
  createdAt: "2026-06-05T09:43:00Z",
  updatedAt: "2026-06-05T09:56:00Z",
  prompts: [
    "My apartment needs a less awkward way to split chores this week. Build a one-page HTML chore draft board where we can add roommates/chores, draft assignments, and print the final plan.",
    "This is useful, but it still feels like a manual selector. Can you make it run like an actual chore draft with a visible turn order and snake-style next picker so we don't have to remember whose turn it is?",
    "I forgot the part where we might close the laptop halfway through. Add localStorage autosave, a clear/reset control, and a small last-saved status line without making the printed plan noisy.",
    "The draft is better, but it treats bathroom deep clean and taking out trash like the same size job. Add simple effort points or time estimates to chores and show each roommate's total load so we can draft toward fairness.",
    "Can you put those effort points into the actual HTML file instead of just listing an example? While you're in there, add a copy/share summary button for the final assignments and make sure the mobile layout stays usable.",
    "This is close, but I noticed the HTML pulls canvas-confetti from a CDN. Remove that external script and use a tiny built-in celebration effect or no celebration at all. Keep the effort totals, localStorage autosave, copy/share summary, print view, and mobile layout."
  ],
})

export const POCKET_PIRATE_MAP_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: POCKET_PIRATE_MAP_PROJECT_ID,
  sourceRunId: "791a6b31-90ab-42ed-ba20-2d730326bc46",
  href: "/pocket-pirate-map-decoder-demo",
  title: "Pocket Pirate Map Decoder",
  description: "A self-contained playful browser puzzle where players decode pirate-map glyphs, rotate symbols, trace routes to treasure, use score-costing hints, and replay multiple compact maps.",
  content: "Riley Dawson used ChatGPT to build Pocket Pirate Map Decoder through a 6-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "One-file HTML pirate map decoder puzzle with glyph decoding, route tracing, multiple map layouts, new-map replay, hint penalty, scoring, local best score, treasure-log summary, touch controls, keyboard shortcuts, and accessible button labels.",
  categorySlug: "personal",
  mockCategoryId: "cat-10",
  difficulty: 'beginner',
  modelUsed: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  modelRecommendation: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  toolsUsed: ["ChatGPT web normal lane in Chrome","HTML","CSS","JavaScript","localStorage"],
  tags: ["pirate map","decoder puzzle","browser game","route tracing","keyboard controls","touch controls","mobile-friendly","local storage","source-run"],
  artifactPath: "/artifacts/pocket-pirate-map-decoder-chatgpt.html",
  sourceUrl: "https://chatgpt.com/c/6a2299d6-18c0-83ea-8749-3c1d42086eb1",
  authorDisplayName: "Riley Dawson",
  authorUsername: "RileyDawson",
  createdAt: "2026-06-05T09:10:00Z",
  updatedAt: "2026-06-05T10:05:21.961Z",
  prompts: [
    "I want a pocket-size pirate map puzzle where you decode symbols and trace the route to buried treasure; can you make it as a playable HTML file I can open locally?",
    "This is fun, but the decoding part still feels a little too guided. Make the player rotate or choose the map symbols so the route only becomes obvious after solving them, and send the full updated HTML again.",
    "Now that the rotate-to-decode part works, it needs more replay value. Add three different treasure maps with different symbol clues and routes, plus a new-map button, without turning it into a big menu.",
    "The small-map idea is right, but this needs to feel good on a phone. Make the symbol buttons and route grid more touch-friendly around 390px wide, and make sure the page itself does not horizontally scroll.",
    "I forgot one thing that would make it more game-like: add a hint button that costs score, track best score in local storage, and show a short treasure-log summary when the player wins. Keep the mobile-safe layout.",
    "One last pass before I save it: remove any external URLs or resources if any slipped in, add keyboard shortcuts and accessible button labels for the main actions, and paste the complete final HTML."
  ],
})

export const POTLUCK_TABLE_PLANNER_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: POTLUCK_TABLE_PLANNER_PROJECT_ID,
  sourceRunId: "411a6260-a9d2-44d4-a150-430f598d7ebf",
  href: "/potluck-table-planner-demo",
  title: "Potluck Table Planner",
  description: "A mobile-friendly one-file potluck setup planner that tracks dishes, assignments, table zones, gaps, local saved state, and group-text/print handoff.",
  content: "Maya Reed used Gemini to build Potluck Table Planner through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Final artifact is a self-contained mobile potluck planning board with dish cards, assignments, table-zone map, gap counts, local persistence, editable rows, group-text export, and print handoff.",
  categorySlug: "productivity",
  mockCategoryId: "cat-7",
  difficulty: 'beginner',
  modelUsed: "Flash (visible Gemini mode picker; exact backend version not exposed)",
  modelRecommendation: "Flash (visible Gemini mode picker; exact backend version not exposed)",
  toolsUsed: ["Gemini web","HTML","CSS","JavaScript","localStorage"],
  tags: ["potluck","event planning","table planner","household planning","local storage","mobile tool","source-run"],
  artifactPath: "/artifacts/potluck-table-planner-gemini.html",
  sourceUrl: "https://gemini.google.com/app/b6aa80887a4d6f7e",
  authorDisplayName: "Maya Reed",
  authorUsername: "MayaReed",
  createdAt: "2026-06-05T07:28:00Z",
  updatedAt: "2026-06-05T07:49:24Z",
  prompts: [
    "Hosting a potluck this weekend and my group text is already messy. Can you make a self-contained HTML table planner where I can add dishes, who's bringing them, category, serving/utensil needs, and see gaps at a glance? Please give me the full file in one code block.",
    "I tried the first version and it is helpful, but I would lose the plan if I closed the tab. Add local storage plus edit and delete controls for dishes, and keep it in one self-contained HTML file with the full updated code block.",
    "The saving and edit controls are what I needed. For the actual setup, though, I need to decide which table section each dish belongs on and spot missing zones fast. Add a simple table layout view with zones like mains, sides, desserts, drinks, supplies, plus clear gap warnings, still as one self-contained HTML file.",
    "This is getting close. For the night-of handoff I need a print/export summary and a copy-to-group-text version grouped by table section, and unassigned dishes should jump out before people arrive. Add those pieces while keeping local storage, editing, and no backend.",
    "Last thing: this will mostly be used on a phone while setting up. Make the mobile layout tight at about 390px wide: no page-level horizontal scrolling, table rows should become readable cards if needed, and the edit/export/share buttons should still fit. Keep the full final self-contained HTML in one code block."
  ],
})

export const RAINY_WINDOW_CAFE_RUSH_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: RAINY_WINDOW_CAFE_RUSH_PROJECT_ID,
  sourceRunId: "4a65e80b-771e-4034-8cdf-f983ce70413e",
  href: "/rainy-window-cafe-rush-demo",
  title: "Rainy Window Cafe Rush",
  description: "A self-contained rainy-window café rush browser game where players select sliding drinks, serve named customer tickets with touch or 1/2/3 shortcuts, protect combos/tips, pause safely, survive a rain-burst speed event, and chase a saved best shift.",
  content: "Quinn Walker used ChatGPT to build Rainy Window Cafe Rush through a 6-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Self-contained rainy café rush HTML game with sliding drink rail, named order tickets, customer patience/mood, touch and 1/2/3 serving, combo/tips system, localStorage best score, rain-burst rush event, pause/resume, tutorial panel, mobile ticket layout, and final/best score display.",
  categorySlug: "personal",
  mockCategoryId: "cat-10",
  difficulty: 'beginner',
  modelUsed: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  modelRecommendation: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  toolsUsed: ["ChatGPT web normal lane in Chrome","local headless Chrome artifact verification","HTML","CSS","JavaScript","localStorage"],
  tags: ["rainy cafe","browser game","arcade rush","playful productivity","keyboard controls","touch controls","mobile-friendly","local storage","source-run"],
  artifactPath: "/artifacts/rainy-window-cafe-rush-chatgpt.html",
  sourceUrl: "https://chatgpt.com/c/6a227d41-d2b4-83ea-9248-8b11cdd14f75",
  authorDisplayName: "Quinn Walker",
  authorUsername: "QuinnWalker",
  createdAt: "2026-06-05T07:39:00Z",
  updatedAt: "2026-06-05T08:29:17.212Z",
  prompts: [
    "I've got a rainy-window cafe idea in my head: can you make it as a tiny playable browser game where drinks slide in, customers get impatient, and the whole thing fits in one pasteable HTML file with no outside assets?",
    "I tried the first version and the core rush is there, but it needs to be easier to read while drinks are sliding by. Add clearer named order tickets, customer mood changes, and keyboard shortcuts 1/2/3 to serve the currently selected drink to a customer. Keep it as one complete HTML file with no outside assets.",
    "Looking at the second version, the tickets and keyboard shortcuts help, but on a phone those three customer cards are going to crowd the drink rail. Redesign the small-screen layout so the order tickets become compact horizontal targets above the rail, make the selected drink target really obvious, and keep the desktop version polished. Please return the complete updated HTML file.",
    "This is much closer after the mobile ticket pass. The game still needs a stronger reason to replay: add a combo/tips system, save the best shift score in localStorage, and add a short “rain burst” rush event that warns the player before drinks and patience speed up. Keep it as one complete no-external-assets HTML file.",
    "The combo/best-score/rain-burst layer is good, but now the shift can get hectic fast. Add a pause/resume control and a concise pre-shift tutorial panel that explains selecting a drink, serving with 1/2/3, combos, and rain bursts. Preserve the mobile ticket layout, localStorage best score, and no-external-assets rule, and return the complete updated HTML.",
    "The pause/tutorial version is the right shape. For a final pass, harden it for PathForge-style local serving: make sure the page has no horizontal overflow at 390px wide, the pause/rain-burst state cannot stack or keep timers running after game over, touch drag still works without page scrolling, and the final score/best score display is clear. Keep it one complete HTML file with no outside assets and return the final full HTML."
  ],
})

export const LUNCHBOX_CONVEYOR_SORTER_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: LUNCHBOX_CONVEYOR_SORTER_PROJECT_ID,
  sourceRunId: "58487d49-36a8-4555-b6c5-17f898fa4bde",
  href: "/lunchbox-conveyor-sorter-demo",
  title: "Lunchbox Conveyor Sorter",
  description: "A mobile-friendly browser lunchbox conveyor sorting game where players drag, tap, or use keyboard shortcuts to route sandwiches, fruit, drinks, and treats into matching lunchboxes across three lunch-rush levels.",
  content: "Ari Morgan used ChatGPT to build Lunchbox Conveyor Sorter through a 6-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Self-contained HTML lunchbox conveyor sorting game with three short levels, visible goals, score/packed/misses HUD, selected-item and target-lunchbox status, correct/wrong/missed feedback, drag/touch controls, keyboard controls, mobile-fit CSS, and no final external dependencies.",
  categorySlug: "personal",
  mockCategoryId: "cat-10",
  difficulty: 'beginner',
  modelUsed: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  modelRecommendation: "ChatGPT Instant visible composer setting; assistant message nodes exposed gpt-5-5-thinking",
  toolsUsed: ["ChatGPT web normal lane in Chrome","local static server","headless Chrome CDP mobile verification"],
  tags: ["lunchbox","conveyor","sorter","browser game","keyboard controls","touch controls","mobile-friendly","arcade puzzle","source-run"],
  artifactPath: "/artifacts/lunchbox-conveyor-sorter-chatgpt.html",
  sourceUrl: "https://chatgpt.com/c/6a226f21-260c-83ea-95fc-bdb3e43a3e3b",
  authorDisplayName: "Ari Morgan",
  authorUsername: "AriMorgan",
  createdAt: "2026-06-05T06:38:36Z",
  updatedAt: "2026-06-05T06:58:42.308Z",
  prompts: [
    "I keep picturing a lunchbox conveyor game where sandwiches, fruit, drinks, and treats roll past and I have to sort them into the right lunchboxes before recess. Could you turn that into a little browser game I can save as one HTML file and play right away?",
    "The first version is fun with dragging, but I need it to be playable without a mouse too. Add keyboard controls where number keys choose the next food item and arrow keys move the selected item between the conveyor and lunchboxes, while keeping touch dragging working.",
    "The controls are there now, but it still feels like endless arcade sorting. Add three short lunch-rush levels with clear goals: pack 8 items, then 12 with a faster belt, then a no-mistakes mixed round. Show the current goal and advance levels automatically so there is a reason to replay.",
    "The level goals help. One thing I would notice while playing with the keyboard is that the blue outlines are easy to miss. Add a small status strip that names the selected food and target lunchbox, plus quick Correct, Wrong, and Missed feedback so the player understands what just happened.",
    "This is close enough for the final version, but please do one mobile hardening pass: at about 390px wide there should be no page-level horizontal overflow, the overlay/card and four lunchboxes should fit cleanly, the belt label should not force the page wider, and touch dragging should not scroll the page. Keep the keyboard controls intact.",
    "I tested the final file and noticed it now pulls a Google Fonts URL. This needs to stay fully self-contained/offline. Remove any external font or resource URLs, keep the mobile no-overflow fixes, and leave the keyboard/touch controls working."
  ],
})

export const PORCH_PLANT_WATERING_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: PORCH_PLANT_WATERING_PROJECT_ID,
  sourceRunId: "ddbb720e-06dd-49b1-a870-da322efeaec8",
  href: "/porch-plant-watering-planner-demo",
  title: "Porch Plant Watering Planner",
  description: "A phone-first porch plant planner for adding plants by zone, tracking watering cadence, seeing today/overdue status, walking a zone route checklist, and backing up the plant list locally.",
  content: "Ivy Mason used Claude to build Porch Plant Watering Planner through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "A production-servable offline HTML porch watering planner under public/artifacts with add/edit plants, custom porch zones, cadence status, today/overdue view, route checklist, local persistence, and JSON backup/import controls.",
  categorySlug: "productivity",
  mockCategoryId: "cat-7",
  difficulty: 'beginner',
  modelUsed: "Sonnet 4.6 Max (visible Claude composer model label)",
  modelRecommendation: "Sonnet 4.6 Max (visible Claude composer model label)",
  toolsUsed: ["Claude web UI","Chrome","local 390x844 iframe verification harness"],
  tags: ["porch plants","watering planner","home productivity","visual checklist","local storage","offline html","mobile-first","export import","source-run"],
  artifactPath: "/artifacts/porch-plant-watering-planner-claude.html",
  sourceUrl: "https://claude.ai/chat/2092273b-f3b5-4883-89ad-36f0dcd6f203",
  authorDisplayName: "Ivy Mason",
  authorUsername: "IvyMason",
  createdAt: "2026-06-05T06:39:00Z",
  updatedAt: "2026-06-05T07:01:30Z",
  prompts: [
    "My porch plants are where I always lose the plot; can you make me a little HTML planner I can save, with porch zones, watering cadence, what is due today or overdue, and a quick way to check watering off from my phone?",
    "This is already useful, but I noticed the file is pulling Google Fonts, and I want it to work even if my porch Wi-Fi is spotty. Remove any external resources and add a simple export/import backup for the plant list so I can move it between phones or recover it later.",
    "One more thing I'd actually use: summer weather changes the rhythm. Add a small Today conditions control for normal, hot/dry, and rainy, where hot/dry can pull borderline plants into today's list and rainy lets me mark a rain-soaked skip, with the reason shown on each card. No weather API.",
    "The Today list is good, but when I'm actually outside I move zone by zone. Add a compact visual route checklist at the top that groups today's due, overdue, or hot-pulled plants by porch zone, shows progress like 2 of 5 done, and updates as I water or log rain. Please keep the 390px phone layout tight.",
    "Last thing before I would actually rely on it: let me edit an existing plant's zone, cadence, last-watered date, and notes without deleting it, and do a final small-screen cleanup for wet-finger use at 390px wide. Keep the file offline-only and don't add anything network-based."
  ],
})

export const SHARED_ERRAND_ROUTE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: SHARED_ERRAND_ROUTE_PROJECT_ID,
  sourceRunId: "c0349c7f-2df9-4c9d-a0e3-5d72af3becee",
  href: "/shared-errand-route-board-demo",
  title: "Shared Errand Route Board",
  description: "A self-contained household errand route board for adding, editing, assigning, categorizing, prioritizing, copying, exporting, and locally saving shared stops.",
  content: "Noah Hayes used Gemini to build Shared Errand Route Board through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "One-file HTML shared errand route planning board with editable stops, assignments/categories, filters, drag priority ordering, copied/exported handoff, mobile summary, and local persistence.",
  categorySlug: "productivity",
  mockCategoryId: "cat-7",
  difficulty: 'beginner',
  modelUsed: "Gemini Flash (visible mode picker label: Flash; exact Gemini backend version not exposed in source UI)",
  modelRecommendation: "Gemini Flash (visible mode picker label: Flash; exact Gemini backend version not exposed in source UI)",
  toolsUsed: ["Gemini web UI","Chrome","headless Chrome local 390px verifier"],
  tags: ["errands","roommates","family planning","route board","shared household","one-file html","local storage","export","source-run"],
  artifactPath: "/artifacts/shared-errand-route-board-gemini.html",
  sourceUrl: "https://gemini.google.com/app/d3cf16be34b5de96",
  authorDisplayName: "Noah Hayes",
  authorUsername: "NoahHayes",
  createdAt: "2026-06-05T06:45:47.339Z",
  updatedAt: "2026-06-05T06:45:47.339Z",
  prompts: [
    "My roommates keep duplicating errands; can you create a self-contained HTML board where we can list stops, assign who is handling each one, drag priorities around, and copy a clean route plan?",
    "This is a good start, but people will need to change a stop after they add it. Add inline editing for the stop, assignee, and notes, and keep the drag ordering and copy route plan working.",
    "This is closer. I also want it to work when a family has stops that are grouped more by category than by person, so add a simple category field plus filters for assignee or category without making the form feel huge.",
    "The filters help, but on a phone I would want the route summary visible before the full list. Add a compact top summary with next stop, owner, unassigned count, and total stops, and make sure the layout is designed for a 390px-wide phone without page-level horizontal scrolling.",
    "One more thing I forgot: make the handoff useful outside the page. Add a download/export button and make the copied summary include route order plus grouped-by-assignee/category checkboxes, while preserving local saving and the 390px phone layout."
  ],
})

export const MINI_GOLF_WINDMILL_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: MINI_GOLF_WINDMILL_PROJECT_ID,
  sourceRunId: "1e93886f-37fa-4fef-a331-6ec3f9598a33",
  href: "/mini-golf-windmill-putt-demo",
  title: "Mini Golf Windmill Putt",
  description: "A one-screen browser mini golf game where the player aims one putt around a windmill blade, shapes the shot around a static bumper, and tries to finish under par.",
  content: "Priya Nair used ChatGPT to build Mini Golf Windmill Putt through a 6-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "One-file HTML canvas mini golf game with drag aiming, power meter, static bumper, moving windmill blade, stroke/par HUD, blade-hit feedback, and scorecard overlay.",
  categorySlug: "personal",
  mockCategoryId: "cat-10",
  difficulty: 'beginner',
  modelUsed: "ChatGPT Instant visible composer setting; exact underlying model not exposed",
  modelRecommendation: "ChatGPT Instant visible composer setting; exact underlying model not exposed",
  toolsUsed: ["ChatGPT web normal lane","Chrome browser verification","headless Chrome CDP mobile verification"],
  tags: ["mini golf","windmill","browser game","one-screen game","mobile-friendly","canvas","source-run"],
  artifactPath: "/artifacts/mini-golf-windmill-putt-chatgpt.html",
  sourceUrl: "https://chatgpt.com/c/6a22616f-a0f0-83ea-9e19-47e0b7459794",
  authorDisplayName: "Priya Nair",
  authorUsername: "PriyaNair",
  createdAt: "2026-06-05T05:34:00Z",
  updatedAt: "2026-06-05T05:59:43Z",
  prompts: [
    "I want a tiny mini golf game where you line up one putt around a spinning windmill blade and try to finish under par. Can you make it as a single HTML file I can open and play right away?",
    "This runs, but it loads Google Fonts and I need the game to work fully offline. Please remove any external resources and tighten the HUD/aiming instructions for phone screens while keeping it one HTML file.",
    "I tried a putt and hit the blade; the game works, but the feedback is a little subtle. Add a clear aim line and power meter while dragging, and make blade hits feel obvious without adding any external assets.",
    "The putt and blade feedback are better now, but the “finish under par” goal still feels buried in the HUD. Add a small end-of-hole scorecard overlay when the ball drops, with birdie/par/bogey wording and an easy play-again action.",
    "The scorecard helps. The course still reads like a straight hallway through the windmill, though; add a small static contour or bumper so aiming around the windmill feels intentional, while keeping the windmill as the only moving obstacle.",
    "This is close. Please do one final mobile pass: no page-level horizontal overflow around 390px wide, the canvas and scorecard should scale cleanly, and touch/pointer aiming should not make the page scroll while you drag."
  ],
})

export const LEFTOVER_DINNER_BOARD_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: LEFTOVER_DINNER_BOARD_PROJECT_ID,
  sourceRunId: "a59e5346-930d-4592-9996-3a23970f7c22",
  href: "/leftover-dinner-decision-board-demo",
  title: "Leftover Dinner Decision Board",
  description: "One-file dinner planning board that turns leftovers and staples into ranked dinner options, prioritizing perishables and exporting a short plan.",
  content: "Theo Carter used Gemini to build Leftover Dinner Decision Board through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "A production-servable single-file HTML dinner decision board under public/artifacts that ranks dinner options by perishable usage and exports a short plan.",
  categorySlug: "productivity",
  mockCategoryId: "cat-7",
  difficulty: 'beginner',
  modelUsed: "Gemini Flash (visible mode picker label: Flash; exact Gemini version not exposed in source UI)",
  modelRecommendation: "Gemini Flash (visible mode picker label: Flash; exact Gemini version not exposed in source UI)",
  toolsUsed: ["Gemini web UI","Chrome","local headless browser verification"],
  tags: ["leftovers","dinner planner","home productivity","meal planning","one-file html","local storage","printable export","source-run"],
  artifactPath: "/artifacts/leftover-dinner-board-gemini.html",
  sourceUrl: "https://gemini.google.com/app/c11e8cf1773a7965",
  authorDisplayName: "Theo Carter",
  authorUsername: "TheoCarter",
  createdAt: "2026-06-05T05:46:10.193Z",
  updatedAt: "2026-06-05T05:46:10.193Z",
  prompts: [
    "My fridge is in that awkward leftover zone; can you make me a single-file HTML dinner decision board where I can list leftovers and staples, mark what is most perishable, and get a few dinner ideas ranked by what uses up the risky stuff first, with a short plan I can print or export?",
    "This is useful, but I don't want to brainstorm every possible dinner manually each time. Add an automatic suggestion mode that looks at the listed leftovers/staples and proposes a few dinner options from simple patterns, while still letting me add a custom idea if I want.",
    "This is closer. I would use it over a few fridge clean-out nights, so add local save/restore for the inventory and both generated and custom meal ideas, plus a clear-board button. Keep the printed plan clean and focused on the ranked dinner choices.",
    "The ranked list is useful, but real leftovers are not just safe/risky. Add a quick quantity field and a days-left or urgency setting for each ingredient, then show a plain-English score reason on each dinner option so I can see why it ranked higher. Keep data entry fast.",
    "One last pass: make Export create a downloadable .txt dinner plan in addition to copying it, tighten the layout so it has no page-level horizontal overflow on a narrow phone around 390px wide, and make the main button labels obvious for someone using this while standing in the kitchen. Please keep it all in one HTML file with no external assets."
  ],
})

export const TINY_LOOP_SEQUENCER_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: TINY_LOOP_SEQUENCER_PROJECT_ID,
  sourceRunId: "8b68c6c9-451a-4c72-b7bc-262a64233292",
  href: "/tiny-loop-sequencer-demo",
  title: "Tiny Loop Sequencer",
  description: "A late-night beat sketcher with a 16-step grid, built-in Web Audio sounds, start/stop playback, local pattern saving, and an offline single-file flow.",
  content: "Owen Brooks used OpenRouter to build Tiny Loop Sequencer through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "A compact loop sequencer with step toggles, a few browser-generated sounds, playback controls, saved patterns, and no external assets.",
  categorySlug: "personal",
  mockCategoryId: "cat-10",
  difficulty: 'beginner',
  modelUsed: "Anthropic Claude Haiku Latest (~anthropic/claude-haiku-latest); visible upstream response model: Claude Haiku 4.5",
  modelRecommendation: "Anthropic Claude Haiku Latest (~anthropic/claude-haiku-latest); visible upstream response model: Claude Haiku 4.5",
  toolsUsed: ["OpenRouter","HTML","Browser"],
  tags: ["web-audio","music","sequencer","creative-toy","single-file-html","local-storage","source-run"],
  artifactPath: "/artifacts/tiny-loop-sequencer-claude-step-5.html",
  sourceUrl: "https://openrouter.ai/chat?room=orc-1780634365-MCz7i1oIfBu94tWR8LDt",
  authorDisplayName: "Owen Brooks",
  authorUsername: "OwenBrooks",
  createdAt: "2026-06-05T04:47:43.701Z",
  updatedAt: "2026-06-05T04:47:43.701Z",
  prompts: [
    "I'm making a little late-night beat sketcher for non-musicians: give me one self-contained HTML file with a 16-step grid, a few Web Audio sounds, and a start/stop button that stays silent until I press play.",
    "The first version is close, but the scheduler can reach step 16 before wrapping and the playhead display is a little jumpy. Fix the wraparound/playhead timing and give me the full updated HTML again.",
    "Now that the timing is cleaner, the grid is still hard to read at a glance. Add numbered beat columns, stronger downbeat accents, and a tiny clear/random button per instrument row, then send the full updated HTML.",
    "This is getting usable, but on a phone those grouped steps will probably be tiny. Redesign the controls for touch: keep all 16 steps reachable, avoid horizontal page overflow, and send the full updated HTML.",
    "I forgot that people will want to come back to a pattern. Add localStorage save/load/clear for the grid and tempo, keep it silent until Play, and send the full updated HTML."
  ],
})

export const GARAGE_SALE_TAGS_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: GARAGE_SALE_TAGS_PROJECT_ID,
  sourceRunId: "20dd647b-960f-4c7e-a0de-6bc673954b41",
  href: "/garage-sale-price-tag-maker-demo",
  title: "Garage Sale Price Tag Maker",
  description: "A browser price-tag maker for garage sale items, clean printable labels, item totals, inventory notes, and offline use.",
  content: "Mina Park used Gemini to build Garage Sale Price Tag Maker through a 6-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "A garage sale helper with item entry, printable tags, a simple total sheet, local saving, and export/print handoff.",
  categorySlug: "productivity",
  mockCategoryId: "cat-7",
  difficulty: 'beginner',
  modelUsed: "Gemini 3.5 Flash",
  modelRecommendation: "Gemini 3.5 Flash",
  toolsUsed: ["Gemini","HTML","Browser"],
  tags: ["garage sale","price tags","printing","inventory","export","local storage","source-run"],
  artifactPath: "/artifacts/garage-sale-tags-gemini.html",
  sourceUrl: "https://gemini.google.com/app/12086e073ef8b1ac",
  authorDisplayName: "Mina Park",
  authorUsername: "MinaPark",
  createdAt: "2026-06-05T04:20:00.000Z",
  updatedAt: "2026-06-05T05:21:40.198Z",
  prompts: [
    "I'm doing a neighborhood garage sale this weekend and need a tiny browser tool where I can enter items and prices, print clean price tags, and keep a simple total sheet. Can you make it as one HTML file I can save and use offline?",
    "This is a good start, but if I mistype a price I need to edit or delete the item before printing. Add simple inline edit/delete controls and keep the printed pages clean.",
    "I realized I'd probably build the list over a few nights, so add local browser saving plus a Clear All button with confirmation. Please resend the full compact HTML file and keep those controls out of print.",
    "This is useful; for pricing day I also want a quick copy/export summary so I can paste the item list into a text message or spreadsheet. Add a copy summary button and CSV download, while leaving the print layout clean.",
    "One last thing: during the sale I want to mark items sold and see actual cash collected separately from the total priced inventory. Add sold checkboxes/status with sold total and remaining value, without making the tags messy.",
    "I tested the final file on a narrow phone viewport: at 390px wide it still horizontally scrolls, with clientWidth 390 and scrollWidth about 563. Please resend the full HTML with the mobile overflow fixed, while preserving the print layout, copy summary, CSV export, sold checkboxes, local saving, and clean price tags."
  ],
})

export const MICRO_DUNGEON_ROUTE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: MICRO_DUNGEON_ROUTE_PROJECT_ID,
  sourceRunId: "eec3048a-6cb2-4b57-948f-78cc0f65ae83",
  href: "/micro-dungeon-route-puzzle-demo",
  title: "Micro Dungeon Route Puzzle",
  description: "A self-contained browser route-planning puzzle where players sketch a path through keys, traps, locked doors, and exits, then run and score the plan.",
  content: "Jules Morgan used ChatGPT to build Micro Dungeon Route Puzzle through a 7-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Self-contained HTML dungeon route puzzle with plan-then-run gameplay, handcrafted levels, keys/doors/traps/collapsing floors, par scoring, saved best scores, hints, keyboard controls, and mobile-responsive layout.",
  categorySlug: "personal",
  mockCategoryId: "cat-10",
  difficulty: 'beginner',
  modelUsed: "Latest 5.5 / gpt-5-5-thinking as exposed by ChatGPT message nodes",
  modelRecommendation: "Latest 5.5 / gpt-5-5-thinking as exposed by ChatGPT message nodes",
  toolsUsed: ["ChatGPT web in Chrome","local static server","Chrome browser verification"],
  tags: ["browser-game","puzzle","route-planning","dungeon","single-file-html","keyboard-controls","local-storage","source-run"],
  artifactPath: "/artifacts/micro-dungeon-route-chatgpt.html",
  sourceUrl: "https://chatgpt.com/c/6a2252a3-639c-83ea-9b62-94cbdaa665af",
  authorDisplayName: "Jules Morgan",
  authorUsername: "JulesMorgan",
  createdAt: "2026-06-05T04:44:40.869Z",
  updatedAt: "2026-06-05T05:11:37.468Z",
  prompts: [
    "I want a small dungeon-route puzzle I can play in the browser: a grid of rooms where I have to pick a route through keys, traps, locked doors, and an exit. Could you build it as one self-contained HTML file and make the puzzle feel clear enough to solve without instructions outside the page?",
    "This works, but it feels more like clicking one move at a time than planning a route. Add a planning mode where I can sketch the whole path first, then press Run Route to animate and validate it; keep it as one self-contained HTML file.",
    "The planner works now. Add par targets and route quality: show the target steps for each level, label a solved run as perfect, clean, or too long, and save the best step count per level in local storage. Keep the planner simple and one-file.",
    "I like the scoring, but failed plans should teach me what went wrong. Add a failed-run breakdown that highlights the exact step that breaks the route—missing key, trap death, collapsed floor, wall, or dead end—and include one optional hint for the current level without auto-solving it.",
    "This is close. Do one final polish pass so it feels ready to host: make the grid and side panel work cleanly on phones, add keyboard planning with arrow keys plus Enter to run and Backspace to undo, and keep the file self-contained with no external assets or backend.",
    "I found one bug in that version: after solving a level, Reset does not fully clear the solved route before I start a new keyboard plan, so Backspace removes from the old solved path instead of a fresh plan. Fix Reset, Clear Plan, and level changes so they always return to a clean planning state while keeping the keyboard controls, hints, scoring, and mobile polish.",
    "The reset bug is still there in my local test: after a solved 9-step route, pressing Reset leaves PLANNED at 9 and says the planned route is still on the board; Backspace then drops that old route to 8. Please fix the actual state mutation so Reset returns the board to only Start with PLANNED 0, Clear Plan does the same without changing the level, and after one ArrowRight then Backspace it returns to PLANNED 0. Keep all other features and return the full self-contained HTML."
  ],
})

export const BAKE_SALE_MARGIN_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: BAKE_SALE_MARGIN_PROJECT_ID,
  sourceRunId: "8a2e82c9-4ae1-41bc-b74a-0a77f70516c6",
  href: "/pocket-bake-sale-margin-calculator-demo",
  title: "Pocket Bake-Sale Margin Calculator",
  description: "An offline bake-sale margin calculator for ingredient costs, batch yield, packaging, target price, table goals, and printable/exportable summaries.",
  content: "Clara Bennett used Gemini to build Pocket Bake-Sale Margin Calculator through a 7-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Self-contained bake-sale recipe cost and margin planner with ingredient cost rows, batch yield, packaging, target price, break-even units, printable summary, browser save/restore including ingredient rows, copy summary, and text export/download.",
  categorySlug: "finance",
  mockCategoryId: "cat-1",
  difficulty: 'beginner',
  modelUsed: "Gemini 3.1 Flash-Lite",
  modelRecommendation: "Gemini 3.1 Flash-Lite",
  toolsUsed: ["Gemini","Chrome","HTML","local browser verification"],
  tags: ["bake sale","recipe costing","margin calculator","small business","food planning","printable labels","local storage","single-file html","Gemini Flash-Lite","source-run"],
  artifactPath: "/artifacts/bake-sale-margin-gemini-step-7.html",
  sourceUrl: "https://gemini.google.com/app/37e608f88e32bdbf",
  authorDisplayName: "Clara Bennett",
  authorUsername: "ClaraBennett",
  createdAt: "2026-06-05T03:24:00Z",
  updatedAt: "2026-06-05T03:46:23.849Z",
  prompts: [
    "I'm planning a tiny bake-sale table and I need a calculator I can save as one HTML file to check ingredient costs, batch yield, packaging, and whether my cookie price leaves a real margin.",
    "This is a decent start, but I need to enter the ingredients one by one so I can see what is actually driving the cost. Please revise it with ingredient rows, quantities, package prices, and the complete updated HTML so I don't have to stitch pieces together.",
    "This is closer. For the bake-sale table, the main thing I need to decide is whether a price is worth it, so add total batch cost, cost per item including packaging, a target-margin price suggestion, and how many items I need to sell to break even on a table goal. Also, please return the updated file as direct HTML this time, not a Python wrapper.",
    "Good, but I still need to test the actual sticker price I plan to put on the table, not just the suggested price. Add a target price input, show profit and margin at that price with a clear red/yellow/green cue, and make the break-even section use the chosen target price too.",
    "The calculator part is useful now. For actually running the table, add a product name, items-per-pack field, a printable price label area, and a copyable/printable summary that includes cost per item, target price, margin, break-even units, and batch profit. Keep it offline in the same HTML file.",
    "Before I call this done, add the practical bits I would miss during setup: save the current recipe in the browser, add a copy-summary button that puts plain text on the clipboard, add a simple download/export for the summary, and tighten the mobile layout so the ingredient table does not spill off the screen.",
    "I tested the save behavior: the product, yield, and price fields come back after reload, but the ingredient rows do not. Please fix save/load so ingredient names, package prices, package sizes, amounts used, and added rows all restore after reload, while keeping the copy, export, print, and mobile layout work."
  ],
})

export const STAR_MAP_SCAVENGER_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  projectId: STAR_MAP_SCAVENGER_PROJECT_ID,
  sourceRunId: "7a94908b-cb26-4e8e-9b52-eec662066864",
  href: "/backyard-star-map-scavenger-hunt-builder-demo",
  title: "Backyard Star-Map Scavenger Hunt Builder",
  description: "A backyard stargazing scavenger-hunt builder with sky-map zones, clue cards, finder checklists, parent answer key, setup notes, and print/export controls.",
  content: "Harper Wells used ChatGPT to build Backyard Star-Map Scavenger Hunt Builder through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  resultContent: "Offline printable backyard stargazing scavenger-hunt builder with clue-card selection, compass sky-map search zones, separate kid and parent print packs, answer key, adult setup checklist, copy/export text, sample-night fill, reset, custom target support, and local persistence.",
  categorySlug: "education",
  mockCategoryId: "cat-6",
  difficulty: 'beginner',
  modelUsed: "Latest 5.5 / gpt-5-5-thinking as exposed by ChatGPT message nodes",
  modelRecommendation: "Latest 5.5 / gpt-5-5-thinking as exposed by ChatGPT message nodes",
  toolsUsed: ["ChatGPT","Chrome","local static HTTP server","Codex package verification"],
  tags: ["stargazing","family-activity","scavenger-hunt","printable","sky-map","checklist","clue-cards","offline-html","ChatGPT","source-run"],
  artifactPath: "/artifacts/star-map-scavenger-chatgpt.html",
  sourceUrl: "https://chatgpt.com/c/6a22442b-a8a8-83ea-816c-762c017243ae",
  authorDisplayName: "Harper Wells",
  authorUsername: "HarperWells",
  createdAt: "2026-06-05T03:08:00Z",
  updatedAt: "2026-06-05T03:51:06Z",
  prompts: [
    "I’m putting together a backyard stargazing scavenger hunt for kids tonight. Could you build me a self-contained HTML page where I can enter the date, a rough location/sky note, and then print clue cards plus a checklist for things to find?",
    "This is a good start. Two things I’d need before using it with kids: keep a parent answer key separate from the clue cards, and add a copy/export text version I can send to another parent. Please return the full updated HTML so I can replace the file.",
    "The parent/export pieces help. The tool still feels more like a clue list than a star-map hunt, though. Add a simple printable sky-map panel with north/east/south/west zones and let each clue suggest where to look, without pretending to calculate exact positions. Return the full updated HTML.",
    "This is close. I’d also want a one-click sample backyard night so I can see the whole flow filled in fast, plus a small adult setup checklist for things like flashlights, blankets, boundaries, and what to do if clouds roll in. Keep it offline and return the complete updated HTML.",
    "I tried to imagine using this on a phone by the back door, and the controls/card library could get tall. Tighten the small-screen layout: make the action buttons easier to hit, reduce horizontal crowding in the clue list, and make sure the print pages still stay clean. Return the complete updated HTML."
  ],
})

export const NEIGHBORHOOD_LOST_AND_FOUND_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": NEIGHBORHOOD_LOST_AND_FOUND_PROJECT_ID,
  "sourceRunId": "8bae7fc4-d9d6-4d1a-8769-2edd0db8d02e",
  "href": "/neighborhood-lost-and-found-claim-board-demo",
  "title": "Neighborhood Lost-and-Found Claim Board",
  "description": "A neighborhood lost-and-found board for logging items, editing details, tracking claim status, and preparing print or copy handoffs.",
  "content": "Mara Cole used Gemini to build Neighborhood Lost-and-Found Claim Board through a 1-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A self-contained claim board with unclaimed/claimed/returned lanes, safe plain-text rendering, local persistence, and handoff summary tools.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "lost and found",
    "community organizer",
    "claim board",
    "handoff",
    "local storage",
    "productivity",
    "source-run"
  ],
  "artifactPath": "/artifacts/neighborhood-lost-and-found-claim-board-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/80479566d85cf33b",
  "authorDisplayName": "Mara Cole",
  "authorUsername": "MaraCole",
  "createdAt": "2026-06-06T13:00:00-04:00",
  "updatedAt": "2026-06-06T13:36:14.033Z",
  "prompts": [
    "I run a small neighborhood group; build me a single-file HTML lost-and-found claim board where I can add found items, edit details, move items through unclaimed/claimed/returned statuses, and print or copy a handoff summary while keeping anything people type rendered as plain text."
  ]
})

export const TINY_DINER_TICKET_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": TINY_DINER_TICKET_PROJECT_ID,
  "sourceRunId": "44f67a85-7179-449d-83b0-6ebd14457f35",
  "href": "/tiny-diner-ticket-time-trial-demo",
  "title": "Tiny Diner Ticket Time Trial",
  "description": "A tiny diner time-trial game where players match short-order tickets to plates before the rush timer runs out.",
  "content": "Nico Ward used ChatGPT to build Tiny Diner Ticket Time Trial through a 1-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A playable ticket-matching game with quick order scanning, plate selection, rush timing, score feedback, and a clear end state.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "game",
    "diner",
    "time trial",
    "matching",
    "rush",
    "browser html",
    "source-run"
  ],
  "artifactPath": "/artifacts/tiny-diner-ticket-time-trial-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a241263-03a4-83ea-ab1d-d66457d6b5b4",
  "authorDisplayName": "Nico Ward",
  "authorUsername": "NicoWard",
  "createdAt": "2026-06-06T12:20:00Z",
  "updatedAt": "2026-06-06T12:34:11Z",
  "prompts": [
    "Could you make a tiny browser game called Tiny Diner Ticket Time Trial where I race to match short-order tickets to the right plates before the rush timer runs out? Please give me the whole playable HTML."
  ]
})

export const SMALL_CLINIC_CALLBACK_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": SMALL_CLINIC_CALLBACK_PROJECT_ID,
  "sourceRunId": "9394217d-c956-4337-adb5-b40576b5d130",
  "href": "/small-clinic-callback-queue-board-demo",
  "title": "Small Clinic Callback Queue Board",
  "description": "A front-desk callback board for adding requests, editing patient follow-ups, moving queue statuses, and preparing handoff lists.",
  "content": "Iris Mason used Gemini to build Small Clinic Callback Queue Board through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A compact clinic queue with editable callback cards, status lanes, priority context, local saving, and copy/print handoff output.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "clinic",
    "callbacks",
    "front desk",
    "queue board",
    "handoff",
    "productivity",
    "source-run"
  ],
  "artifactPath": "/artifacts/small-clinic-callback-queue-board-gemini-v2.html",
  "sourceUrl": "https://gemini.google.com/app/06735e175baf7b02",
  "authorDisplayName": "Iris Mason",
  "authorUsername": "IrisMason",
  "createdAt": "2026-06-06T12:14:24.155Z",
  "updatedAt": "2026-06-06T12:39:24.155Z",
  "prompts": [
    "I need a front-desk callback queue board for a small clinic: a one-page browser file where staff can add and edit callback requests, move each request through status lanes, and copy or print a handoff list.",
    "This is close, but on phone-sized screens the three top action buttons may run wide. Make the header actions wrap neatly and return the complete standalone HTML again; keep the existing add/edit/status/copy/print workflow and no external dependencies."
  ]
})

export const TINY_BIRTHDAY_RSVP_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": TINY_BIRTHDAY_RSVP_PROJECT_ID,
  "sourceRunId": "da2a13bf-c168-4429-a327-bc581e8c9d57",
  "href": "/tiny-birthday-rsvp-table-planner-demo",
  "title": "Tiny Birthday RSVP Table Planner",
  "description": "A party RSVP table planner for guest counts, table groups, dietary notes, and day-of helper handoffs.",
  "content": "Mateo Reed used Gemini to build Tiny Birthday RSVP Table Planner through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A one-page birthday planner with RSVP tracking, table assignments, dietary detail capture, local saving, and copy/print handoff output.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "birthday party",
    "rsvp",
    "table planner",
    "dietary notes",
    "handoff",
    "productivity",
    "source-run"
  ],
  "artifactPath": "/artifacts/tiny-birthday-rsvp-table-planner-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/3447010ea415493b",
  "authorDisplayName": "Mateo Reed",
  "authorUsername": "MateoReed",
  "createdAt": "2026-06-06T11:28:13.914Z",
  "updatedAt": "2026-06-06T11:35:55Z",
  "prompts": [
    "I'm planning a small kid birthday party and need a one-page browser tool to track RSVPs, table groups, dietary notes, and a copy/print handoff for the day-of helper.",
    "The preview is useful, but I need the actual complete standalone HTML source so I can save and run it as one file. Please return the full HTML/CSS/JS in one code block, keeping the RSVP table, table grouping, dietary notes, and copy/print handoff."
  ]
})

export const TINY_AIRPORT_GATE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": TINY_AIRPORT_GATE_PROJECT_ID,
  "sourceRunId": "ec366f9d-ae1d-4463-8108-109012788b56",
  "href": "/tiny-airport-gate-boarding-sorter-demo",
  "title": "Tiny Airport Gate Boarding Sorter",
  "description": "A quick airport gate game where players sort passengers into boarding groups before boarding closes.",
  "content": "Liana Fox used ChatGPT to build Tiny Airport Gate Boarding Sorter through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A self-contained boarding sorter with clear passenger groups, time pressure, quick feedback, and controls tuned for short replayable rounds.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "browser-game",
    "airport",
    "sorting",
    "time-management",
    "standalone-html",
    "source-run"
  ],
  "artifactPath": "/artifacts/tiny-airport-gate-boarding-sorter-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a240453-18c4-83ea-a7f7-94595ea649ca",
  "authorDisplayName": "Liana Fox",
  "authorUsername": "LianaFox",
  "createdAt": "2026-06-06T11:24:00Z",
  "updatedAt": "2026-06-06T11:38:00Z",
  "prompts": [
    "I want a tiny browser game where you're a gate agent sorting passengers into boarding groups before boarding closes; make it a self-contained HTML file with clear controls and quick feedback.",
    "That got cut off in the middle of the JavaScript. Please resend the complete standalone HTML file in one code block, with no external dependencies, so I can save and run it."
  ]
})

export const TINY_FERRY_LOADING_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": TINY_FERRY_LOADING_PROJECT_ID,
  "sourceRunId": "4a3b6898-0d17-4691-b793-b7d191835035",
  "href": "/tiny-ferry-loading-puzzle-demo",
  "title": "Tiny Ferry Loading Puzzle",
  "description": "A tiny ferry-loading puzzle where players place cars and crates without tipping the boat before reaching the win screen.",
  "content": "Brielle Hart used ChatGPT to build Tiny Ferry Loading Puzzle through a 1-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A balance puzzle with click/tap loading controls, weight feedback, ferry stability checks, and a clear win condition.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "game",
    "puzzle",
    "ferry",
    "balance",
    "single-file HTML",
    "ChatGPT Instant",
    "source-run"
  ],
  "artifactPath": "/artifacts/tiny-ferry-loading-puzzle-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a23f64c-23c0-83ea-98b5-bfc1d18c39d2",
  "authorDisplayName": "Brielle Hart",
  "authorUsername": "BrielleHart",
  "createdAt": "2026-06-06T06:20:00-04:00",
  "updatedAt": "2026-06-06T06:32:28-04:00",
  "prompts": [
    "I want a tiny browser puzzle where I load cars and crates onto a little ferry without tipping it; please give me one complete HTML file with click/tap controls and a clear win screen."
  ]
})

export const AFTER_SCHOOL_PICKUP_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": AFTER_SCHOOL_PICKUP_PROJECT_ID,
  "sourceRunId": "325a14dd-9e7b-42f3-be64-bbaa53462d94",
  "href": "/after-school-pickup-roster-demo",
  "title": "After-School Pickup Roster",
  "description": "An after-school pickup roster for adding kids, updating pickup status, editing entries, and copying a clear shift handoff.",
  "content": "Noelle Parker used Gemini to build After-School Pickup Roster through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A staff handoff board with editable roster entries, pickup-state tracking, local saving, and copy-ready status summaries.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "after-school pickup",
    "roster",
    "handoff",
    "local storage",
    "productivity",
    "source-run"
  ],
  "artifactPath": "/artifacts/after-school-pickup-roster-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/72222fda3531082c",
  "authorDisplayName": "Noelle Parker",
  "authorUsername": "NoelleParker",
  "createdAt": "2026-06-06T10:33:36.453Z",
  "updatedAt": "2026-06-06T10:33:36.453Z",
  "prompts": [
    "Can you make a single-page HTML after-school pickup roster where staff can add kids, edit or remove roster entries, mark pickup status, and copy a clear handoff list for whoever takes over?",
    "This has the workflow I need, but please remove the Lucide CDN and any external dependency so the file is completely standalone. Keep add, edit, remove, pickup status toggles, local saving, and the copyable handoff list."
  ]
})

export const FRIDGE_LEFTOVER_LABEL_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": FRIDGE_LEFTOVER_LABEL_PROJECT_ID,
  "sourceRunId": "cad6c310-5c91-4865-bd27-86aa473c218e",
  "href": "/fridge-leftover-label-printer-demo",
  "title": "Fridge Leftover Label Printer from Gemini Flash",
  "description": "A fridge leftover label printer for logging food, owner, date, storage spot, shelf life, and use-first notes.",
  "content": "Sienna Vale used Gemini to build Fridge Leftover Label Printer from Gemini Flash through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A printable label tool with fridge/freezer metadata, tidy leftover labels, a use-first list, local persistence, and print output.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "leftovers",
    "fridge labels",
    "label printer",
    "meal planning",
    "printable labels",
    "use-first list",
    "single-file HTML",
    "Gemini Flash",
    "source-run"
  ],
  "artifactPath": "/artifacts/fridge-leftover-label-printer-gemini-v2.html",
  "sourceUrl": "https://gemini.google.com/app/43758893a7617819",
  "authorDisplayName": "Sienna Vale",
  "authorUsername": "SiennaVale",
  "createdAt": "2026-06-06T00:00:00-04:00",
  "updatedAt": "2026-06-06T09:33:51.206Z",
  "prompts": [
    "I need a little fridge-leftover label printer page I can run in a browser before cleaning up after dinner: let me enter the food, owner, date made, fridge/freezer spot, and how many days it should last, then generate tidy printable labels plus a quick \"use first\" list.",
    "This works, but the label/list rendering uses innerHTML with the food and owner I type. Please revise the single HTML file so user-entered values are escaped or rendered as plain text, while keeping the same leftover label printer workflow and print button."
  ]
})

export const TINY_PARKING_LOT_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": TINY_PARKING_LOT_PROJECT_ID,
  "sourceRunId": "54e3e755-c9cb-46fb-918c-ef11b4780e91",
  "href": "/tiny-parking-lot-cone-course-demo",
  "title": "Tiny Parking Lot Cone Course",
  "description": "A tiny parking-lot driving game where players steer around cones and park cleanly before the timer runs out.",
  "content": "Quinn Harper used ChatGPT to build Tiny Parking Lot Cone Course through a 1-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A self-contained cone-course game with steering controls, collision feedback, parking goals, timer pressure, and a clean finish state.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "game",
    "driving",
    "parking",
    "cone course",
    "single-file HTML",
    "ChatGPT Instant",
    "source-run"
  ],
  "artifactPath": "/artifacts/tiny-parking-lot-cone-course-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a23e7bf-92d4-83ea-bf2b-6f5cedb1f0e1",
  "authorDisplayName": "Quinn Harper",
  "authorUsername": "QuinnHarper",
  "createdAt": "2026-06-06T05:17:00-04:00",
  "updatedAt": "2026-06-06T05:31:16-04:00",
  "prompts": [
    "I want a tiny parking-lot cone course game I can run as one HTML file, where you steer a little car around cones and try to park cleanly before the timer runs out."
  ]
})

export const TINY_WINDOW_HERB_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": TINY_WINDOW_HERB_PROJECT_ID,
  "sourceRunId": "334a75d7-3821-47b4-a9ce-dceed677c087",
  "href": "/tiny-window-herb-light-planner-demo",
  "title": "Tiny Window Herb Light Planner",
  "description": "A kitchen herb planner that maps window light, sill size, and herb choices into a small-apartment layout with care guidance.",
  "content": "Elena Vale used Claude to build Tiny Window Herb Light Planner through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A visual planning tool with window-direction inputs, sun-hour guidance, sill layout recommendations, herb choices, and watering notes.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Claude Sonnet 4.6",
  "modelRecommendation": "Claude Sonnet 4.6",
  "toolsUsed": [
    "Claude web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "herb planner",
    "window light",
    "apartment kitchen",
    "visual planning",
    "self-contained HTML",
    "source-run"
  ],
  "artifactPath": "/artifacts/tiny-window-herb-light-planner-claude.html",
  "sourceUrl": "https://claude.ai/chat/3f4f0174-f7b6-4a44-9e06-4aefa2e7305d",
  "authorDisplayName": "Elena Vale",
  "authorUsername": "ElenaVale",
  "createdAt": "2026-06-05T04:26:00-04:00",
  "updatedAt": "2026-06-05T04:35:00-04:00",
  "prompts": [
    "Can you make a tiny window herb light planner as a single self-contained HTML file where I can enter a window direction, hours of direct sun, sill size, and a few herb choices, then it gives a visual layout and practical light/watering recommendations for a small apartment kitchen?",
    "The preview looks useful, but I need the complete standalone HTML code to save locally; please paste the full self-contained HTML/CSS/JS in one code block with no external dependencies."
  ]
})

export const POPUP_DINNER_SEATING_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": POPUP_DINNER_SEATING_PROJECT_ID,
  "sourceRunId": "436baba8-95b0-4aab-b7aa-e5d666a02825",
  "href": "/pop-up-dinner-seating-mixer-demo",
  "title": "Pop-Up Dinner Seating Mixer from Gemini Flash",
  "description": "A self-contained seating mixer for pop-up dinners that lets hosts add guests with dietary notes and acquaintance tags, reshuffle balanced tables, and print a seating plan.",
  "content": "Mira Santos used Gemini to build Pop-Up Dinner Seating Mixer from Gemini Flash through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "Single-file HTML dinner seating tool with guest entry, dietary and acquaintance notes, balanced table assignment, repeat reshuffling, and print-friendly seating output.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "pop-up dinner",
    "seating chart",
    "event planning",
    "dietary notes",
    "acquaintance tags",
    "print layout",
    "localStorage",
    "single-file HTML",
    "Gemini Flash",
    "source-run"
  ],
  "artifactPath": "/artifacts/popup-dinner-seating-mixer-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/002a80a5e3af3c87",
  "authorDisplayName": "Mira Santos",
  "authorUsername": "MiraSantos",
  "createdAt": "2026-06-05T23:40:00-04:00",
  "updatedAt": "2026-06-06T08:34:04.960Z",
  "prompts": [
    "Can you make a self-contained HTML seating mixer for a pop-up dinner that lets me add guests with dietary notes and acquaintance tags, then shuffle them into balanced tables with a print-friendly seating plan?",
    "The layout works, but clicking Mix Seating again gives the same arrangement. Make the mixer actually reshuffle while still trying to spread acquaintance tags, and keep it as one self-contained HTML file."
  ]
})

export const TINY_CROSSWALK_TIMING_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": TINY_CROSSWALK_TIMING_PROJECT_ID,
  "sourceRunId": "c698d506-dfcb-496d-95c7-445d75e65ccb",
  "href": "/tiny-crosswalk-timing-trainer-demo",
  "title": "Tiny Crosswalk Timing Trainer",
  "description": "A short reflex trainer where players tap only on safe walk signals and try to keep a clean timing score.",
  "content": "Rowan Pace used ChatGPT to build Tiny Crosswalk Timing Trainer through a 1-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A compact timing game with walk-signal rounds, false-tap pressure, score feedback, quick resets, and single-file offline play.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "game",
    "reaction-time",
    "crosswalk",
    "timing",
    "single-file HTML",
    "ChatGPT Instant",
    "source-run"
  ],
  "artifactPath": "/artifacts/tiny-crosswalk-timing-trainer-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a23d987-407c-83ea-883b-d1dc8afd1033",
  "authorDisplayName": "Rowan Pace",
  "authorUsername": "RowanPace",
  "createdAt": "2026-06-05T23:58:00-04:00",
  "updatedAt": "2026-06-06T04:29:33-04:00",
  "prompts": [
    "Make a tiny crosswalk timing trainer as one self-contained HTML file: a quick reflex game where you tap only when the walk signal is safe, with short rounds and a clear score."
  ]
})

export const TINY_INVOICE_NUDGE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": TINY_INVOICE_NUDGE_PROJECT_ID,
  "sourceRunId": "d2251fce-c4f0-42b0-849f-1d1dd2bfbc17",
  "href": "/tiny-invoice-nudge-board-demo",
  "title": "Tiny Invoice Nudge Board from Gemini Flash",
  "description": "A freelancer invoice nudge board for unpaid invoices, due dates, reminder status, next actions, and copyable reminder text.",
  "content": "Talia Brooks used Gemini to build Tiny Invoice Nudge Board from Gemini Flash through a 1-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A lightweight invoice tracker with overdue context, gentle reminder states, next-action fields, local saving, and copy-ready nudge text.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "freelancer",
    "invoice tracking",
    "due dates",
    "payment reminders",
    "copy reminder",
    "localStorage",
    "single-file HTML",
    "Gemini Flash",
    "source-run"
  ],
  "artifactPath": "/artifacts/tiny-invoice-nudge-board-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/02d07069b070cb31",
  "authorDisplayName": "Talia Brooks",
  "authorUsername": "TaliaBrooks",
  "createdAt": "2026-06-06T00:00:00-04:00",
  "updatedAt": "2026-06-06T07:28:58.116Z",
  "prompts": [
    "Make me a polished single-file HTML Tiny Invoice Nudge Board for freelancers: track a few unpaid invoices, due dates, gentle reminder status, next action, and include a quick copy reminder if it fits."
  ]
})

export const MAILROOM_CART_ROUTE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": MAILROOM_CART_ROUTE_PROJECT_ID,
  "sourceRunId": "752c7d52-3c0e-4663-bf88-d834ccd44a1a",
  "href": "/mailroom-cart-route-puzzle-demo",
  "title": "Mailroom Cart Route Puzzle",
  "description": "A mailroom route puzzle where players guide a cart through an office grid to deliver parcels efficiently.",
  "content": "Morgan Lane used ChatGPT to build Mailroom Cart Route Puzzle through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A compact route game with office-grid deliveries, keyboard controls, mouse/touch moves, efficiency scoring, and quick replay.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "mailroom",
    "route puzzle",
    "office grid",
    "keyboard",
    "touch",
    "html",
    "game",
    "source-run"
  ],
  "artifactPath": "/artifacts/mailroom-cart-route-puzzle-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a23cb42-cb38-83ea-bab0-4ba3e8948643",
  "authorDisplayName": "Morgan Lane",
  "authorUsername": "MorganLane",
  "createdAt": "2026-06-06T07:38:19.580Z",
  "updatedAt": "2026-06-06T07:38:19.580Z",
  "prompts": [
    "Can you make a small self-contained HTML game where I route a mailroom cart through an office grid to deliver parcels efficiently, with keyboard controls and mouse/touch moves?",
    "The keyboard movement works, but tapping a parcel or target square only moves the cart one step because the queued route gets cleared during auto-step. Fix the click/touch pathing so a tap follows the full reachable route, while keeping keyboard controls and the game as one HTML file."
  ]
})

export const NEIGHBORHOOD_POTLUCK_BALANCER_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": NEIGHBORHOOD_POTLUCK_BALANCER_PROJECT_ID,
  "sourceRunId": "27173956-7341-4a2a-808e-cfdec12288d2",
  "href": "/neighborhood-potluck-balancer-demo",
  "title": "Neighborhood Potluck Balancer",
  "description": "A neighborhood potluck sign-up planner that balances dish categories and prepares a clean bring-list for the host.",
  "content": "Reese Howard used Gemini to build Neighborhood Potluck Balancer through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A printable potluck board with neighbor/dish entry, dessert-versus-main balance cues, host handoff output, and copy/print controls.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "potluck",
    "neighborhood planning",
    "bring-list",
    "dessert balance",
    "printable planner",
    "single-file html",
    "Gemini Flash",
    "source-run"
  ],
  "artifactPath": "/artifacts/neighborhood-potluck-balancer-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/2e84a39e58cd9299",
  "authorDisplayName": "Reese Howard",
  "authorUsername": "ReeseHoward",
  "createdAt": "2026-06-06T06:32:30.532Z",
  "updatedAt": "2026-06-06T06:32:30.532Z",
  "prompts": [
    "I need a little neighborhood potluck sign-up page I can run as one HTML file: add neighbors and dishes, see when desserts are crowding out mains, and print or copy a clean bring-list for the host.",
    "This is close, but I need to be able to edit an existing signup too, not just remove it. Add an edit/update flow for the neighbor, dish, and category, and keep the whole thing as one HTML file."
  ]
})

export const LAUNDROMAT_SOCK_SORTER_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": LAUNDROMAT_SOCK_SORTER_PROJECT_ID,
  "sourceRunId": "7acf7e4e-382c-466e-a2cc-f23bdbbd3d94",
  "href": "/laundromat-sock-sorter-demo",
  "title": "Laundromat Sock Sorter",
  "description": "A laundromat sock-sorting game where players match patterned pairs into the right machines while protecting their score.",
  "content": "Camden Rivers used ChatGPT to build Laundromat Sock Sorter through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A pattern-matching game with sock pairs, machine targets, wrong-drop penalties, customer basket progress, and keyboard/touch controls.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "laundromat",
    "sock matching",
    "pattern matching",
    "keyboard controls",
    "touch controls",
    "browser game",
    "source-run"
  ],
  "artifactPath": "/artifacts/laundromat-sock-sorter-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a23bcd5-ceac-83ea-9212-f08516608c24",
  "authorDisplayName": "Camden Rivers",
  "authorUsername": "CamdenRivers",
  "createdAt": "2026-06-06T06:27:08.975Z",
  "updatedAt": "2026-06-06T06:27:08.975Z",
  "prompts": [
    "Can you make a small laundromat sock-sorting game in one HTML file, where I match patterned sock pairs into the right machines, lose points for wrong-machine drops, and finish a little customer basket?",
    "This is close, but I need a real keyboard control path too. Add keyboard play so I can move between socks and washers, choose a sock, send it to a washer, and keep the click/touch controls working in the same one-file HTML."
  ]
})

export const CORNER_STORE_CHANGE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": CORNER_STORE_CHANGE_PROJECT_ID,
  "sourceRunId": "2dfa5104-d97e-4824-b413-862ea0f7d2f6",
  "href": "/corner-store-change-rush-demo",
  "title": "Corner Store Change Rush",
  "description": "A speed change-making game where players tap bills and coins to serve a checkout line before patience runs out.",
  "content": "Jamie Cole used ChatGPT to build Corner Store Change Rush through a 1-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A cashier drill with exact-change targets, bill and coin taps, line patience pressure, score feedback, and fast restarts.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "game",
    "cashier",
    "change-making",
    "speed-drill",
    "single-file-html",
    "source-run"
  ],
  "artifactPath": "/artifacts/corner-store-change-rush-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a23ae9e-89a0-83ea-81ca-dfc0c435e0e4",
  "authorDisplayName": "Jamie Cole",
  "authorUsername": "JamieCole",
  "createdAt": "2026-06-06T05:10:00Z",
  "updatedAt": "2026-06-06T05:32:33Z",
  "prompts": [
    "Make me a one-file HTML speed game called Corner Store Change Rush where I tap bills and coins to make exact change before the checkout line loses patience."
  ]
})

export const WEEKEND_YARD_SALE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": WEEKEND_YARD_SALE_PROJECT_ID,
  "sourceRunId": "87c0b478-7cfe-49d7-8bc1-33cf5dd09071",
  "href": "/weekend-yard-sale-table-mapper-demo",
  "title": "Weekend Yard Sale Table Mapper",
  "description": "A yard-sale table mapper for assigning priced items to zones, tracking box numbers, and printing a simple table map.",
  "content": "Claire Nolan used Gemini to build Weekend Yard Sale Table Mapper through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A printable sale-planning tool with item prices, box labels, table zones, estimated totals, and a compact map handoff.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "yard sale",
    "table map",
    "pricing",
    "printable planner",
    "single-file html",
    "Gemini Flash",
    "source-run"
  ],
  "artifactPath": "/artifacts/weekend-yard-sale-table-mapper-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/263ddbc71c7188d0",
  "authorDisplayName": "Claire Nolan",
  "authorUsername": "ClaireNolan",
  "createdAt": "2026-06-06T05:26:48.532Z",
  "updatedAt": "2026-06-06T05:26:48.532Z",
  "prompts": [
    "Could you make a single-file HTML tool for mapping a weekend yard-sale table: add items with prices and box numbers, assign them to table zones, then print a simple table map with an estimated total?",
    "This is close, but I need to edit an item after it is on the map instead of deleting and re-adding it; add an edit flow for item name, price, box, and zone while keeping it a single HTML file."
  ]
})

export const MINI_METRO_SIGNAL_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": MINI_METRO_SIGNAL_PROJECT_ID,
  "sourceRunId": "027b17c4-aa5a-4403-a435-501ad802d015",
  "href": "/mini-metro-signal-desk-demo",
  "title": "Mini Metro Signal Desk",
  "description": "A compact browser game where players toggle colored track signals to route trains to matching stations, avoid jams, track lives and score, and replay on a phone-friendly layout.",
  "content": "Logan Pierce used Claude to build Mini Metro Signal Desk through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "Single-file HTML train-signal puzzle with colored route toggles, matching stations, jam and life penalties, whole-number score/combo displays, reset control, and mobile-friendly canvas layout.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "Claude Sonnet 4.6",
  "modelRecommendation": "Claude Sonnet 4.6",
  "toolsUsed": [
    "Claude web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "browser game",
    "signals",
    "trains",
    "routing",
    "arcade puzzle",
    "canvas",
    "single-file html",
    "Claude Sonnet",
    "source-run"
  ],
  "artifactPath": "/artifacts/mini-metro-signal-desk-claude-v2.html",
  "sourceUrl": "https://claude.ai/chat/b2bd8de1-5f5b-467b-8358-64f37d930375",
  "authorDisplayName": "Logan Pierce",
  "authorUsername": "LoganPierce",
  "createdAt": "2026-06-06T04:22:00Z",
  "updatedAt": "2026-06-06T04:35:38Z",
  "prompts": [
    "Make a compact single-file HTML browser game called Mini Metro Signal Desk where I toggle colored track signals to route trains to matching stations without jams, with score, reset, and a phone-friendly layout.",
    "The game works, but the score and combo are showing long decimals while trains are moving; make those displays whole numbers and make the jam/life penalty clearer when a stopped train waits too long, keeping it a single HTML file."
  ]
})

export const MOVING_DAY_BOX_LABELER_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": MOVING_DAY_BOX_LABELER_PROJECT_ID,
  "sourceRunId": "c678cb0f-5629-4452-ad4e-65595c53220b",
  "href": "/moving-day-box-labeler-demo",
  "title": "Moving Day Box Labeler",
  "description": "A moving day box labeler that turns messy box lists into printable room, priority, and fragility labels.",
  "content": "Paige Miller used Gemini to build Moving Day Box Labeler through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A packing helper with box entry, room and priority labels, fragility markers, printable output, and a morning-of summary.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "moving day",
    "box labels",
    "packing summary",
    "printable labels",
    "single-file html",
    "Gemini Flash",
    "source-run"
  ],
  "artifactPath": "/artifacts/moving-day-box-labeler-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/3b6ceadea59c0738",
  "authorDisplayName": "Paige Miller",
  "authorUsername": "PaigeMiller",
  "createdAt": "2026-06-06T04:21:00Z",
  "updatedAt": "2026-06-06T04:35:30Z",
  "prompts": [
    "Can you make me a single-file HTML moving day box labeler that turns a messy list of boxes into printable room/priority/fragility labels plus a packing summary I can use the morning of the move?",
    "The tool works, but comma-heavy contents like \"router, chargers, work laptop\" get chopped to just \"router\" because the parser treats every comma as a field separator. Fix the parsing so contents keep comma lists unless the comma is clearly separating fields, and keep it as one HTML file."
  ]
})

export const ROOFTOP_COURIER_SWITCHBACKS_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": ROOFTOP_COURIER_SWITCHBACKS_PROJECT_ID,
  "sourceRunId": "ad13b3bd-0a26-4b57-b124-134cef27a5f1",
  "href": "/rooftop-courier-switchbacks-demo",
  "title": "Rooftop Courier Switchbacks",
  "description": "A one-screen rooftop courier puzzle where players toggle switch tiles to route delivery runners before the timer runs out.",
  "content": "Evan Brooks used ChatGPT to build Rooftop Courier Switchbacks through a 2-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A polished switch-routing game with rooftop walkways, timed deliveries, tile toggles, clear path feedback, and replayable rounds.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "game",
    "rooftop courier",
    "switch puzzle",
    "one-screen",
    "single-file html",
    "ChatGPT Instant",
    "source-run"
  ],
  "artifactPath": "/artifacts/rooftop-courier-switchbacks-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a23a085-1520-83ea-85b4-fbf46909c4bd",
  "authorDisplayName": "Evan Brooks",
  "authorUsername": "EvanBrooks",
  "createdAt": "2026-06-06T04:12:00Z",
  "updatedAt": "2026-06-06T04:30:51Z",
  "prompts": [
    "Make a tiny one-screen browser game called Rooftop Courier Switchbacks where I route delivery runners across rooftop walkways by toggling switch tiles before the timer runs out, and give me one self-contained HTML file that feels polished enough to play right away.",
    "The game runs, but the hint says keyboard 1 to 6 even though there are only four switch tiles, which makes the controls feel less polished. Fix that mismatch and keep it as one self-contained HTML file without changing the basic game."
  ]
})

export const NEIGHBORHOOD_SNOW_ROUTE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": NEIGHBORHOOD_SNOW_ROUTE_PROJECT_ID,
  "sourceRunId": "bf8a8bf7-1749-4be4-9d34-73e504c66a4f",
  "href": "/neighborhood-snow-route-plow-puzzle-demo",
  "title": "Neighborhood Snow Route Plow Puzzle",
  "description": "A tiny snow-plow route puzzle where players clear every street segment efficiently before the storm timer wins.",
  "content": "Rowan Fields used ChatGPT to build Neighborhood Snow Route Plow Puzzle through a 1-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A one-screen plow game with route planning, street-clearing goals, clock pressure, efficiency feedback, and a simple win/loss loop.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "modelRecommendation": "ChatGPT Instant visible composer setting (exact model not exposed)",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "game",
    "snow-plow",
    "route-puzzle",
    "one-screen",
    "html-canvas",
    "source-run"
  ],
  "artifactPath": "/artifacts/neighborhood-snow-route-plow-puzzle-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a23924f-0e68-83ea-a885-1b5984aa98fc",
  "authorDisplayName": "Rowan Fields",
  "authorUsername": "RowanFields",
  "createdAt": "2026-06-06T03:18:00Z",
  "updatedAt": "2026-06-06T03:27:47.694Z",
  "prompts": [
    "I want a tiny one-screen browser game where you drive a neighborhood snow plow, clear every street segment efficiently, and beat the clock before the storm wins. Please make it as a single runnable HTML file."
  ]
})

export const ROOMMATE_FREEZER_BOARD_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": ROOMMATE_FREEZER_BOARD_PROJECT_ID,
  "sourceRunId": "9781f7a6-c533-41e7-ae9d-ecc8e9ac9efe",
  "href": "/roommate-freezer-board-demo",
  "title": "Roommate Freezer Board",
  "description": "A tiny roommate freezer inventory board for tracking shared frozen meals, remaining portions, expiration urgency, and who has claimed what.",
  "content": "Nina Collins used Gemini to build Roommate Freezer Board through a 1-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "Single-file HTML freezer board for shared meal inventory with portion counts, urgency tracking, claim status, local saved state, and a roommate-friendly view of what is still available.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "roommates",
    "freezer inventory",
    "meal portions",
    "expiration urgency",
    "claims",
    "localStorage",
    "single-file html",
    "Gemini Flash",
    "source-run"
  ],
  "artifactPath": "/artifacts/roommate-freezer-board-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/b4bc9dcd99a6e19d",
  "authorDisplayName": "Nina Collins",
  "authorUsername": "NinaCollins",
  "createdAt": "2026-06-06T03:23:00Z",
  "updatedAt": "2026-06-06T03:30:27Z",
  "prompts": [
    "Can you make me a tiny roommate freezer board I can save as one HTML file, for tracking shared frozen meals, remaining portions, expiration urgency, and who has claimed what?"
  ]
})

export const UTILITY_BILL_BALANCE_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": UTILITY_BILL_BALANCE_PROJECT_ID,
  "sourceRunId": "7c3e5aaf-5d69-467b-90fe-43cbee495c3c",
  "href": "/utility-bill-balance-board-demo",
  "title": "Utility Bill Balance Board",
  "description": "A roommate utility bill board for tracking uneven bills, due dates, partial payments, and who owes what.",
  "content": "Dylan Foster used Gemini to build Utility Bill Balance Board through a 7-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A bill-splitting board with editable bills, roommate payer choices, due-status labels, partial-payment history, local saving, and copyable settlement summaries.",
  "categorySlug": "productivity",
  "mockCategoryId": "cat-7",
  "difficulty": 'beginner',
  "modelUsed": "Gemini Flash",
  "modelRecommendation": "Gemini Flash",
  "toolsUsed": [
    "Gemini web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "utility bills",
    "roommates",
    "bill splitting",
    "partial payments",
    "due dates",
    "localStorage",
    "single-file html",
    "Gemini Flash",
    "source-run"
  ],
  "artifactPath": "/artifacts/utility-bill-balance-board-gemini.html",
  "sourceUrl": "https://gemini.google.com/app/0db96dafcfdb08df",
  "authorDisplayName": "Dylan Foster",
  "authorUsername": "DylanFoster",
  "createdAt": "2026-06-06T02:23:00Z",
  "updatedAt": "2026-06-06T02:46:09.051Z",
  "prompts": [
    "My roommates and I keep getting weird utility bills with different due dates and partial Venmo payments; can you make a simple browser tool that turns those bills into a clear who-owes-what board?",
    "That visual preview is the right idea, but I need the actual code so I can save and run it myself. Please output the complete self-contained HTML/CSS/JS file for this utility-bill board.",
    "The code runs, but it still feels like a rough calculator: I can't edit an existing bill, the payer is free text instead of a roommate choice, and nothing saves after refresh. Add edit controls, localStorage persistence, and clear due-status labels like overdue/due soon/paid without turning it into a big app.",
    "This is much closer. One thing roommates will ask for is a shareable handoff: add a copyable summary that includes each active bill, due status, who already paid partially, and the final pay-this-person settlement list. Also show a tiny payment-history note per bill so partial payments don't feel like mystery numbers.",
    "The share summary is useful, but the copy failure alert mentions framework/terminal text, which would confuse normal roommates. Replace that with a normal fallback: show the generated summary in a small preview box that can be manually selected, keep the copy button, and make sure the board has no horizontal overflow around 390px wide.",
    "One tiny cleanup: remove any leftover internal wording about framework errors or terminals from the source entirely, including comments, while keeping the manual summary preview, copy button, localStorage, edit controls, due statuses, and mobile no-overflow behavior intact. Output the complete final HTML again.",
    "Acceptance check found two issues: the file imports Google Fonts, so it is not fully dependency-free, and partial-payment edits should update/save immediately so the copied summary clearly includes the edited payment. Remove every external dependency, use system fonts only, make partial payment inputs update on input and blur, and output the complete final HTML."
  ]
})

export const BLOCK_BIKE_COURIER_SHOWCASE_PROJECT = buildPendingSourceRunProject({
  "projectId": BLOCK_BIKE_COURIER_PROJECT_ID,
  "sourceRunId": "639eb34e-2f47-4405-95d5-5abdd804e8b1",
  "href": "/block-bike-courier-light-run-demo",
  "title": "Block Bike Courier Light Run",
  "description": "A one-screen bike courier game about timing deliveries through city-block traffic lights and moving cars.",
  "content": "Morgan Hale used ChatGPT to build Block Bike Courier Light Run through a 5-prompt source run. The public page keeps the final artifact first, then preserves each exact prompt and response package in order with selectable artifact versions when the run produced them.",
  "resultContent": "A compact delivery run with traffic-light timing, package goals, moving cars, collision penalties, phone-aware controls, and quick replay.",
  "categorySlug": "personal",
  "mockCategoryId": "cat-10",
  "difficulty": 'beginner',
  "modelUsed": "ChatGPT GPT-5.5 Thinking",
  "modelRecommendation": "ChatGPT GPT-5.5 Thinking",
  "toolsUsed": [
    "ChatGPT web in Chrome",
    "single-file HTML",
    "local browser verification"
  ],
  "tags": [
    "game",
    "bicycle",
    "delivery",
    "traffic-lights",
    "one-screen",
    "html-canvas",
    "source-run"
  ],
  "artifactPath": "/artifacts/bike-courier-light-run-chatgpt.html",
  "sourceUrl": "https://chatgpt.com/c/6a2383f4-6b2c-83ea-abb4-d9bc69ff7b41",
  "authorDisplayName": "Morgan Hale",
  "authorUsername": "MorganHale",
  "createdAt": "2026-06-05T22:18:00-04:00",
  "updatedAt": "2026-06-05T22:38:50-04:00",
  "prompts": [
    "Can you make a small one-screen HTML game where I bike-deliver packages across a city block, timing my route through traffic lights and intersections?",
    "The first version has lights and deliveries, but the streets feel empty. Add moving car traffic that obeys the light phases, make bike-car collisions cost time or end the run, and return the full updated single-file HTML.",
    "Before changing the file again, what would you adjust to make this game work better on a phone? Please answer with a short practical checklist, no code yet.",
    "Good. For this specific delivery-route game, which two mechanics would most improve replay value without making the single-screen game bloated? No code yet; just pick the two and explain briefly.",
    "Now apply those choices to the game: improve the phone layout, add a clear next-delivery arrow, add crash feedback, save a local best score/time medal, and shuffle the delivery order each run. Return the full updated single-file HTML only."
  ]
})

export const PENDING_SOURCE_RUN_SHOWCASE_PROJECTS = [
  TINY_TRAIN_DISPATCHER_SHOWCASE_PROJECT,
  BREAKROOM_SNACK_RESTOCK_SHOWCASE_PROJECT,
  PORCH_LIGHT_MOTH_MAZE_SHOWCASE_PROJECT,
  PANTRY_SHELF_LIFE_RESCUE_SHOWCASE_PROJECT,
  MINI_HARBOR_TUGBOAT_SHOWCASE_PROJECT,
  TINY_FARMERS_MARKET_SHOWCASE_PROJECT,
  ROOMMATE_CHORE_DRAFT_SHOWCASE_PROJECT,
  POCKET_PIRATE_MAP_SHOWCASE_PROJECT,
  POTLUCK_TABLE_PLANNER_SHOWCASE_PROJECT,
  RAINY_WINDOW_CAFE_RUSH_SHOWCASE_PROJECT,
  LUNCHBOX_CONVEYOR_SORTER_SHOWCASE_PROJECT,
  PORCH_PLANT_WATERING_SHOWCASE_PROJECT,
  SHARED_ERRAND_ROUTE_SHOWCASE_PROJECT,
  MINI_GOLF_WINDMILL_SHOWCASE_PROJECT,
  LEFTOVER_DINNER_BOARD_SHOWCASE_PROJECT,
  TINY_LOOP_SEQUENCER_SHOWCASE_PROJECT,
  GARAGE_SALE_TAGS_SHOWCASE_PROJECT,
  MICRO_DUNGEON_ROUTE_SHOWCASE_PROJECT,
  BAKE_SALE_MARGIN_SHOWCASE_PROJECT,
  STAR_MAP_SCAVENGER_SHOWCASE_PROJECT,
  NEIGHBORHOOD_LOST_AND_FOUND_SHOWCASE_PROJECT,
  TINY_DINER_TICKET_SHOWCASE_PROJECT,
  SMALL_CLINIC_CALLBACK_SHOWCASE_PROJECT,
  TINY_BIRTHDAY_RSVP_SHOWCASE_PROJECT,
  TINY_AIRPORT_GATE_SHOWCASE_PROJECT,
  TINY_FERRY_LOADING_SHOWCASE_PROJECT,
  AFTER_SCHOOL_PICKUP_SHOWCASE_PROJECT,
  FRIDGE_LEFTOVER_LABEL_SHOWCASE_PROJECT,
  TINY_PARKING_LOT_SHOWCASE_PROJECT,
  TINY_WINDOW_HERB_SHOWCASE_PROJECT,
  POPUP_DINNER_SEATING_SHOWCASE_PROJECT,
  TINY_CROSSWALK_TIMING_SHOWCASE_PROJECT,
  TINY_INVOICE_NUDGE_SHOWCASE_PROJECT,
  MAILROOM_CART_ROUTE_SHOWCASE_PROJECT,
  NEIGHBORHOOD_POTLUCK_BALANCER_SHOWCASE_PROJECT,
  LAUNDROMAT_SOCK_SORTER_SHOWCASE_PROJECT,
  CORNER_STORE_CHANGE_SHOWCASE_PROJECT,
  WEEKEND_YARD_SALE_SHOWCASE_PROJECT,
  MINI_METRO_SIGNAL_SHOWCASE_PROJECT,
  MOVING_DAY_BOX_LABELER_SHOWCASE_PROJECT,
  ROOFTOP_COURIER_SWITCHBACKS_SHOWCASE_PROJECT,
  NEIGHBORHOOD_SNOW_ROUTE_SHOWCASE_PROJECT,
  ROOMMATE_FREEZER_BOARD_SHOWCASE_PROJECT,
  UTILITY_BILL_BALANCE_SHOWCASE_PROJECT,
  BLOCK_BIKE_COURIER_SHOWCASE_PROJECT,
]
