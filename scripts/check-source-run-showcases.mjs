#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const failures = []

const sourceRunProjects = [
  {
    name: 'Airlock Zero: Reactor Run',
    route: 'src/app/airlock-zero-reactor-run-demo/page.tsx',
    projectId: 'AIRLOCK_ZERO_PROJECT_ID',
    showcaseExport: 'AIRLOCK_ZERO_SHOWCASE_PROJECT',
    href: '/airlock-zero-reactor-run-demo',
    packagePath: 'seed-runs/model-variants/airlock-zero-reactor-run-chatgpt-56-sol-max-source-run.json',
    artifactPaths: [
      'public/artifacts/airlock-zero-gpt-56-sol-max-step-1.html',
      'public/artifacts/airlock-zero-gpt-56-sol-max-step-2.html',
    ],
    expectPersistableAfterPublish: true,
    releaseGate: 'preparedModelCohortIsPublic',
  },
  {
    name: 'Airlock Zero: Blackout Shift',
    route: 'src/app/airlock-zero-blackout-shift-fork-demo/page.tsx',
    projectId: 'AIRLOCK_ZERO_CLAUDE_FORK_PROJECT_ID',
    showcaseExport: 'AIRLOCK_ZERO_CLAUDE_FORK_SHOWCASE_PROJECT',
    href: '/airlock-zero-blackout-shift-fork-demo',
    packagePath: 'seed-runs/airlock-zero-blackout-shift-claude-sonnet-5-max-fork.json',
    artifactPaths: [
      'public/artifacts/airlock-zero-blackout-shift-claude-sonnet-5-max.html',
    ],
    expectPersistableAfterPublish: true,
    releaseGate: 'preparedProjectIsPublic',
  },
  {
    name: 'Airlock Zero: Swarm Shift',
    route: 'src/app/airlock-zero-swarm-shift-fork-demo/page.tsx',
    projectId: 'AIRLOCK_ZERO_GPT_FORK_PROJECT_ID',
    showcaseExport: 'AIRLOCK_ZERO_GPT_FORK_SHOWCASE_PROJECT',
    href: '/airlock-zero-swarm-shift-fork-demo',
    packagePath: 'seed-runs/airlock-zero-swarm-shift-gpt-56-sol-max-fork.json',
    artifactPaths: [
      'public/artifacts/airlock-zero-swarm-shift-gpt-56-sol-max.html',
    ],
    expectPersistableAfterPublish: true,
    releaseGate: 'preparedProjectIsPublic',
  },
  {
    name: 'Airlock Zero: Hull Breach',
    route: 'src/app/airlock-zero-hull-breach-fork-demo/page.tsx',
    projectId: 'AIRLOCK_ZERO_GEMINI_FORK_PROJECT_ID',
    showcaseExport: 'AIRLOCK_ZERO_GEMINI_FORK_SHOWCASE_PROJECT',
    href: '/airlock-zero-hull-breach-fork-demo',
    packagePath: 'seed-runs/airlock-zero-hull-breach-gemini-35-flash-fork.json',
    artifactPaths: [
      'public/artifacts/airlock-zero-hull-breach-gemini-35-flash-verified-final.html',
    ],
    expectPersistableAfterPublish: true,
    releaseGate: 'preparedProjectIsPublic',
  },
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

const curatedManifestPath = 'seed-runs/curation/2026-07-10-accepted-projects.json'
const curatedRegistryPath = 'src/lib/curated-source-run-showcases.ts'
const curatedManifestProjectFields = [
  'projectId',
  'sourceRunId',
  'href',
  'title',
  'description',
  'content',
  'resultContent',
  'categorySlug',
  'mockCategoryId',
  'difficulty',
  'modelUsed',
  'modelRecommendation',
  'toolsUsed',
  'tags',
  'artifactPath',
  'artifactVersionPaths',
  'sourceUrl',
  'authorDisplayName',
  'authorUsername',
  'createdAt',
  'updatedAt',
  'prompts',
  'packageFile',
  'capturedAt',
]

function loadCuratedSourceRunProjects() {
  if (!existsSync(curatedManifestPath)) {
    failures.push(`${curatedManifestPath}: missing required curated source-run manifest`)
    return []
  }

  let manifest
  try {
    manifest = JSON.parse(readFileSync(curatedManifestPath, 'utf8'))
  } catch (error) {
    failures.push(`${curatedManifestPath}: invalid JSON: ${error.message}`)
    return []
  }

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    failures.push(`${curatedManifestPath}: top level must be an object`)
    return []
  }

  for (const field of ['manifestVersion', 'generatedAt', 'queueTotal', 'acceptedCount', 'declinedCount', 'projects']) {
    if (!Object.hasOwn(manifest, field)) {
      failures.push(`${curatedManifestPath}: missing required top-level field ${field}`)
    }
  }

  if (!Array.isArray(manifest.projects)) {
    failures.push(`${curatedManifestPath}: projects must be an array`)
    return []
  }

  if (typeof manifest.generatedAt !== 'string' || manifest.generatedAt.trim().length === 0) {
    failures.push(`${curatedManifestPath}: generatedAt must be a nonblank string`)
  }
  for (const field of ['queueTotal', 'acceptedCount', 'declinedCount']) {
    if (!Number.isInteger(manifest[field]) || manifest[field] < 0) {
      failures.push(`${curatedManifestPath}: ${field} must be a nonnegative integer`)
    }
  }

  if (manifest.acceptedCount !== manifest.projects.length) {
    failures.push(`${curatedManifestPath}: acceptedCount must equal projects.length`)
  }
  if (
    Number.isInteger(manifest.queueTotal) &&
    Number.isInteger(manifest.acceptedCount) &&
    Number.isInteger(manifest.declinedCount) &&
    manifest.queueTotal !== manifest.acceptedCount + manifest.declinedCount
  ) {
    failures.push(`${curatedManifestPath}: queueTotal must equal acceptedCount + declinedCount`)
  }

  const seenProjectIds = new Set()
  const seenSourceRunIds = new Set()
  const seenHrefs = new Set()

  return manifest.projects.flatMap((entry, index) => {
    const entryLabel = `${curatedManifestPath} projects[${index}]`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      failures.push(`${entryLabel}: entry must be an object`)
      return []
    }
    for (const field of curatedManifestProjectFields) {
      if (!Object.hasOwn(entry, field)) failures.push(`${entryLabel}: missing required field ${field}`)
    }

    for (const field of curatedManifestProjectFields.filter(
      (field) => !['toolsUsed', 'tags', 'artifactVersionPaths', 'prompts'].includes(field),
    )) {
      if (typeof entry[field] !== 'string' || entry[field].trim().length === 0) {
        failures.push(`${entryLabel}: ${field} must be a nonblank string`)
      }
    }
    for (const field of ['toolsUsed', 'tags', 'artifactVersionPaths', 'prompts']) {
      if (!Array.isArray(entry[field]) || entry[field].length === 0) {
        failures.push(`${entryLabel}: ${field} must be a nonempty array`)
      }
    }

    if (typeof entry.href === 'string' && !/^\/[a-z0-9][a-z0-9-/]*$/.test(entry.href)) {
      failures.push(`${entryLabel}: href must be a root-relative route`)
    }
    if (typeof entry.packageFile === 'string' && !entry.packageFile.startsWith('seed-runs/')) {
      failures.push(`${entryLabel}: packageFile must be repo-relative under seed-runs/`)
    }
    if (typeof entry.artifactPath === 'string' && !entry.artifactPath.startsWith('/artifacts/')) {
      failures.push(`${entryLabel}: artifactPath must be public-facing under /artifacts/`)
    }
    if (
      Array.isArray(entry.artifactVersionPaths) &&
      entry.artifactVersionPaths.some(
        (artifactPath) => typeof artifactPath !== 'string' || !artifactPath.startsWith('public/artifacts/'),
      )
    ) {
      failures.push(`${entryLabel}: artifactVersionPaths must contain repo-relative public/artifacts paths`)
    }
    if (
      typeof entry.artifactPath === 'string' &&
      Array.isArray(entry.artifactVersionPaths) &&
      !entry.artifactVersionPaths.includes(`public${entry.artifactPath}`)
    ) {
      failures.push(`${entryLabel}: artifactVersionPaths must include the public artifactPath default`)
    }

    for (const [field, value, seen] of [
      ['projectId', entry.projectId, seenProjectIds],
      ['sourceRunId', entry.sourceRunId, seenSourceRunIds],
      ['href', entry.href, seenHrefs],
    ]) {
      if (typeof value !== 'string' || value.length === 0) continue
      if (seen.has(value)) failures.push(`${entryLabel}: duplicate ${field} ${value}`)
      seen.add(value)
    }

    if (
      typeof entry.title !== 'string' ||
      typeof entry.href !== 'string' ||
      typeof entry.projectId !== 'string' ||
      typeof entry.sourceRunId !== 'string' ||
      typeof entry.packageFile !== 'string'
    ) {
      return []
    }

    return [{
      name: entry.title,
      route: `src/app${entry.href}/page.tsx`,
      projectId: entry.projectId,
      sourceRunId: entry.sourceRunId,
      showcaseExport: 'PENDING_SOURCE_RUN_SHOWCASE_PROJECTS',
      href: entry.href,
      packagePath: entry.packageFile,
      artifactPaths: Array.isArray(entry.artifactVersionPaths) ? entry.artifactVersionPaths : [],
      defaultArtifactPath: entry.artifactPath,
      prompts: entry.prompts,
      expectPersistableAfterPublish: true,
      curated: true,
    }]
  })
}

sourceRunProjects.push(...loadCuratedSourceRunProjects())

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
    .filter((entry) => entry.name !== 'artifact-viewer')
    .map((entry) => `src/app/${entry.name}/page.tsx`)
    .filter((routePath) => existsSync(routePath))
    .filter((routePath) => {
      const routeContent = readFileSync(routePath, 'utf8')
      return (
        routeContent.includes("from '@/components/SourceRunShowcase'") ||
        routeContent.includes("from '@/components/PreparedSourceRunPage'") ||
        routeContent.includes("from '@/components/PreparedModelVariantSourceRunPage'")
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
    routeContent.includes("from '@/components/PreparedSourceRunPage'") ||
    routeContent.includes("from '@/components/PreparedModelVariantSourceRunPage'")
  )
}

function curatedRegistryHasDescriptor(registryContent, project) {
  const mapsManifestFields = (
    /sourceRunId:\s*[A-Za-z_$][\w$]*\.sourceRunId/.test(registryContent) &&
    /href:\s*[A-Za-z_$][\w$]*\.href/.test(registryContent)
  )
  const hasLiteralDescriptor = (
    registryContent.includes(project.sourceRunId) &&
    registryContent.includes(project.href)
  )
  return mapsManifestFields || hasLiteralDescriptor
}

const sharedComponent = 'src/components/SourceRunShowcase.tsx'
const sharedComponentContent = read(sharedComponent)
const protectedWrapper = 'src/lib/protected-artifact-wrapper.mjs'
const protectedWrapperContent = read(protectedWrapper)
mustInclude(sharedComponent, sharedComponentContent, 'aria-pressed={selected}', 'shared showcase must render a selected state on response artifact controls')
mustInclude(sharedComponent, sharedComponentContent, 'onClick={() => onSelect?.(detailPackage.id)}', 'shared showcase must let each response mount its artifact above')
mustInclude(sharedComponent, sharedComponentContent, 'setSelectedPackageId', 'shared showcase must keep artifact package selection state')
mustInclude(sharedComponent, sharedComponentContent, 'defaultStepNumber', 'shared showcase must support final-artifact default selection')
mustInclude(sharedComponent, sharedComponentContent, 'artifactVersions?: SourceRunShowcaseArtifactVersion[]', 'shared showcase must allow multiple artifact versions per response package')
mustInclude(sharedComponent, sharedComponentContent, 'isDefaultArtifact', 'shared showcase must support an explicit default artifact version')
mustInclude(sharedComponent, sharedComponentContent, '<ExactResponseBlock', 'shared showcase must render verbatim response text for each response package')
mustInclude(sharedComponent, sharedComponentContent, 'setSelectedPackageId', 'shared showcase must let response cards mount their artifact above')
mustInclude(sharedComponent, sharedComponentContent, 'data-artifact-package-select={detailPackage.id}', 'response artifact controls must expose stable package identities for browser regression verification')
mustInclude(sharedComponent, sharedComponentContent, 'data-artifact-version-select={pkg.id}', 'artifact-version controls must expose stable identities for browser regression verification')
  mustInclude(sharedComponent, sharedComponentContent, 'currentArtifactLoad(selectedPackage.id, loadedArtifact)', 'shared showcase must scope loaded artifact source state to the selected package through the behavior-tested helper')
mustInclude(sharedComponent, sharedComponentContent, 'measuredArtifact?.packageId === selectedPackage.id', 'shared showcase must scope artifact measurements to the selected package')
mustInclude(sharedComponent, sharedComponentContent, 'const controller = new AbortController()', 'shared showcase must abort stale artifact loads during selection changes')
mustInclude(sharedComponent, sharedComponentContent, 'data-artifact-package-id={selectedPackage.id}', 'shared showcase must expose the mounted artifact package identity')
mustInclude(sharedComponent, sharedComponentContent, 'data-artifact-path={selectedPackage.artifactPath}', 'shared showcase must expose the mounted artifact path for switching verification')
mustInclude(sharedComponent, sharedComponentContent, 'data-artifact-loading', 'shared showcase must show an explicit loading state between artifact selections')
mustInclude(sharedComponent, sharedComponentContent, 'srcDoc={srcDoc ?? undefined}', 'shared showcase must mount checked artifact HTML through one srcDoc source')
  mustInclude(sharedComponent, sharedComponentContent, 'sandbox="allow-scripts allow-pointer-lock"', 'shared showcase must keep generated scripts and pointer lock in an opaque-origin sandbox without direct download permission')
  mustInclude(sharedComponent, sharedComponentContent, 'buildProtectedArtifactWrapperDocument', 'shared showcase must put artifacts behind the persistent nested-frame navigation policy')
  mustInclude(sharedComponent, sharedComponentContent, 'pathforge-artifact-download', 'shared showcase must bridge bounded data-only downloads instead of granting direct network downloads')
mustInclude(sharedComponent, sharedComponentContent, 'allow="clipboard-write"', 'shared showcase must preserve user-triggered copy controls')
  mustInclude(sharedComponent, sharedComponentContent, "new DOMParser().parseFromString(html, 'text/html')", 'shared showcase must parse the actual artifact document before injecting security controls')
  mustInclude(sharedComponent, sharedComponentContent, 'parsed.head.prepend(csp)', 'shared showcase must inject a restrictive artifact CSP into the actual parsed head before generated scripts')
mustInclude(sharedComponent, sharedComponentContent, 'pathforge-artifact-storage', 'shared showcase must bridge namespaced storage without same-origin access')
mustInclude(sharedComponent, sharedComponentContent, 'data-artifact-load-error', 'shared showcase must block unsafe direct fallback when protected loading fails')
mustInclude(sharedComponent, sharedComponentContent, 'artifactViewerHref(selectedPackage, providerName)', 'shared showcase must open the mounted artifact through the protected viewer')
mustInclude(sharedComponent, sharedComponentContent, 'artifactViewerHref(detailPackage, providerName)', 'response artifact links must open through the protected viewer')
  mustNotInclude(sharedComponent, sharedComponentContent, 'allow-same-origin', 'shared showcase must not combine generated scripts with same-origin access')
  mustNotInclude(sharedComponent, sharedComponentContent, 'allow-downloads', 'shared showcase must not let artifact frames initiate uncontrolled network downloads')
mustNotInclude(sharedComponent, sharedComponentContent, 'src={selectedPackage.artifactPath}', 'shared showcase must not navigate the sandbox directly to generated files')
mustNotInclude(sharedComponent, sharedComponentContent, 'href={selectedPackage.artifactPath}', 'shared showcase must not open generated HTML with PathForge origin privileges')
mustNotInclude(sharedComponent, sharedComponentContent, 'href={detailPackage.artifactPath}', 'response artifact links must not open generated HTML with PathForge origin privileges')
mustNotInclude(sharedComponent, sharedComponentContent, 'usesDirectSource', 'shared showcase must not retain the old direct-source fallback race')
mustInclude(sharedComponent, sharedComponentContent, 'Source run', 'shared showcase must expose one provider source-run link at the bottom')
mustNotInclude(sharedComponent, sharedComponentContent, '<ArtifactCodeBlock', 'shared showcase must not dump generated HTML into the public response path')
mustNotInclude(sharedComponent, sharedComponentContent, '<SourceLink', 'shared showcase must not repeat provider links inside every response package')
mustNotInclude(sharedComponent, sharedComponentContent, 'pathforgeSourceRunUrl', 'shared showcase must not expose admin source-run record links publicly')
mustNotInclude(sharedComponent, sharedComponentContent, 'Source run ID', 'shared showcase must not render internal source-run ids as public copy')
mustNotInclude(sharedComponent, sharedComponentContent, 'verificationNotes', 'shared showcase must not expose internal verification notes publicly')
mustNotInclude(sharedComponent, sharedComponentContent, 'Verbatim artifact', 'shared showcase must not label generated code as public page content')
mustNotInclude(sharedComponent, sharedComponentContent, 'sourceFilePath', 'shared showcase must not serialize local artifact file paths into public page payloads')
mustNotInclude(sharedComponent, sharedComponentContent, 'artifactVersionNotes', 'shared showcase must not serialize internal artifact notes into public page payloads')
mustNotInclude(sharedComponent, sharedComponentContent, 'version.code', 'shared showcase must not serialize generated artifact HTML into public page payloads')
mustInclude(sharedComponent, sharedComponentContent, 'data-source-run-node={variant}', 'shared showcase must label prompt and response nodes for layout verification')
mustInclude(sharedComponent, sharedComponentContent, 'variant="prompt"', 'shared showcase must render prompts as their own pipe nodes')
mustInclude(sharedComponent, sharedComponentContent, 'variant="response"', 'shared showcase must render response packages as their own pipe nodes')
mustNotInclude(sharedComponent, sharedComponentContent, 'ProjectEngagementBar', 'shared showcase should not own page-shell engagement controls')
mustComeBefore(sharedComponent, sharedComponentContent, '<ProtectedArtifactFrame', 'Build path', 'shared showcase must mount the artifact before the prompt/response path')
mustComeBefore(sharedComponent, sharedComponentContent, '<PromptText text={step.prompt}', '<ResponsePackageCard', 'shared showcase must render each prompt before its response package')
mustComeBefore(sharedComponent, sharedComponentContent, 'variant="prompt"', 'variant="response"', 'shared showcase must connect prompt and response as separate sequential pipe nodes')
mustInclude(protectedWrapper, protectedWrapperContent, '"frame-src \'none\'"', 'trusted artifact wrapper must persistently block child-frame navigation')
mustInclude(protectedWrapper, protectedWrapperContent, '"child-src \'none\'"', 'trusted artifact wrapper must block legacy child navigation paths')
mustInclude(protectedWrapper, protectedWrapperContent, 'frame.srcdoc = artifactDocument', 'trusted wrapper must mount the artifact without a network-addressable child URL')
mustInclude(protectedWrapper, protectedWrapperContent, 'sandbox="allow-scripts allow-pointer-lock"', 'inner artifact document must remain script-capable and pointer-lock capable but opaque-origin sandboxed')
mustInclude(protectedWrapper, protectedWrapperContent, "data.dataUrl.startsWith('data:')", 'download bridge must forward only data-backed content')
mustInclude(protectedWrapper, protectedWrapperContent, 'navigator.userActivation?.isActive', 'download bridge must require real user activation in the trusted wrapper')
mustNotInclude(protectedWrapper, protectedWrapperContent, 'allow-downloads', 'neither protected artifact layer may grant uncontrolled downloads')
mustNotInclude(protectedWrapper, protectedWrapperContent, 'frame-src blob:', 'trusted wrapper must not allow blob self-navigation to shed the artifact CSP')

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
const preparedModelVariantSourceRunPage = read('src/components/PreparedModelVariantSourceRunPage.tsx')
const artifactViewerPage = read('src/app/artifact-viewer/page.tsx')
const nextConfig = read('next.config.ts')
const pendingSourceRunShowcases = read('src/lib/pending-source-run-showcases.ts')
const curatedProjects = sourceRunProjects.filter((project) => project.curated)
const curatedSourceRunShowcases = curatedProjects.length > 0 ? read(curatedRegistryPath) : ''
const airlockZeroShowcases = read('src/lib/airlock-zero-projects.ts')
const preparedShowcaseMetadata = `${preparedShowcase}\n${airlockZeroShowcases}\n${pendingSourceRunShowcases}\n${curatedSourceRunShowcases}`
const modelVariantRegistryDirectory = 'seed-runs/model-variants'
const modelVariantManifestsByProjectId = new Map()
if (existsSync(modelVariantRegistryDirectory)) {
  for (const fileName of readdirSync(modelVariantRegistryDirectory).filter((name) => name.endsWith('.json'))) {
    const manifestPath = join(modelVariantRegistryDirectory, fileName)
    const candidate = parseJson(manifestPath)
    if (!candidate || !Array.isArray(candidate.variants) || !candidate.contract) continue
    if (typeof candidate.canonicalProjectId !== 'string') {
      failures.push(`${manifestPath}: model-variant manifest needs canonicalProjectId`)
      continue
    }
    if (modelVariantManifestsByProjectId.has(candidate.canonicalProjectId)) {
      failures.push(`${manifestPath}: duplicate model-variant manifest for ${candidate.canonicalProjectId}`)
      continue
    }
    modelVariantManifestsByProjectId.set(candidate.canonicalProjectId, {
      path: manifestPath,
      manifest: candidate,
    })
  }
}
const guardedRouteSet = new Set(sourceRunProjects.map((project) => project.route))

if (curatedProjects.length > 0) {
  mustInclude(
    curatedRegistryPath,
    curatedSourceRunShowcases,
    '2026-07-10-accepted-projects.json',
    'curated source-run registry must be driven by the accepted-projects manifest',
  )
  mustInclude(
    curatedRegistryPath,
    curatedSourceRunShowcases,
    'CURATED_SOURCE_RUN_SHOWCASE_PROJECTS',
    'curated source-run registry must export its project descriptor collection',
  )
  mustInclude(
    curatedRegistryPath,
    curatedSourceRunShowcases,
    'sourceRunId',
    'curated source-run descriptors must preserve sourceRunId',
  )
  mustInclude(
    curatedRegistryPath,
    curatedSourceRunShowcases,
    'href',
    'curated source-run descriptors must preserve href',
  )
}

mustNotInclude('src/components/PreparedSourceRunPage.tsx', preparedSourceRunPage, 'readArtifact', 'prepared source-run wrapper must not serialize artifact HTML into public page payloads')
mustNotInclude('src/components/PreparedSourceRunPage.tsx', preparedSourceRunPage, 'notes: step.notes', 'prepared source-run wrapper must not serialize internal step notes into public page payloads')
mustInclude('src/app/artifact-viewer/page.tsx', artifactViewerPage, 'safeArtifactPath', 'protected artifact viewer must validate requested artifact paths')
mustInclude('src/app/artifact-viewer/page.tsx', artifactViewerPage, '<ProtectedArtifactFrame', 'protected artifact viewer must preserve the opaque-origin sandbox')
mustInclude('src/app/artifact-viewer/page.tsx', artifactViewerPage, 'showOpenAction={false}', 'protected artifact viewer must not recursively expose a direct-open action')
mustInclude('src/app/artifact-viewer/page.tsx', artifactViewerPage, 'download', 'protected artifact viewer may expose generated HTML only as a download')
mustInclude('next.config.ts', nextConfig, 'source: "/artifacts/:path*"', 'raw public artifacts must have a dedicated response-header boundary')
mustInclude('next.config.ts', nextConfig, 'Content-Disposition', 'raw public artifacts must download instead of executing on the PathForge origin')
mustInclude('next.config.ts', nextConfig, "sandbox; default-src 'none'; frame-ancestors 'none'", 'raw artifact responses need a sandboxed deny-all CSP as defense in depth')
mustInclude('next.config.ts', nextConfig, 'X-Content-Type-Options', 'raw artifact responses must disable MIME sniffing')
mustInclude('src/components/PreparedSourceRunPage.tsx', preparedSourceRunPage, 'const pageRoute = route ?? project.href', 'prepared source-run wrapper must default the public route from project metadata')

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
  const usesModelVariantWrapper = routeContent.includes("from '@/components/PreparedModelVariantSourceRunPage'")
  const routeShellContent = usesModelVariantWrapper
    ? `${routeContent}\n${preparedModelVariantSourceRunPage}\n${preparedSourceRunPage}`
    : usesPreparedWrapper
      ? `${routeContent}\n${preparedSourceRunPage}`
      : routeContent
  if (!routeContent.includes("from '@/components/SourceRunShowcase'") && !usesPreparedWrapper && !usesModelVariantWrapper) {
    failures.push(`${project.route}: ${project.name} must use the shared source-run showcase, PreparedSourceRunPage, or the model-variant wrapper`)
  }
  if (usesPreparedWrapper) {
    mustNotInclude(project.route, routeContent, 'route=', `${project.name} prepared wrapper must use the registry href instead of a duplicate route prop`)
  }
  mustInclude(project.route, routeShellContent, 'defaultStepNumber', `${project.name} must explicitly default the mounted artifact`)
  mustInclude(project.route, routeShellContent, 'sourceRunUrl=', `${project.name} must pass the full provider source-run link to the shared showcase`)
  mustInclude(project.route, routeShellContent, 'ProjectEngagementBar', `${project.name} must keep the public project shell`)
  mustInclude(project.route, routeShellContent, 'ProjectCommunityPanel', `${project.name} must keep the community panel`)

  if (project.curated) {
    if (!curatedRegistryHasDescriptor(curatedSourceRunShowcases, project)) {
      failures.push(`${curatedRegistryPath}: ${project.name} descriptor must preserve sourceRunId ${project.sourceRunId} and href ${project.href}`)
    }
  } else if (!project.releaseGate) {
    mustInclude('src/lib/featured-projects.ts', featuredProjects, project.projectId, `${project.name} must have a featured project id`)
  }
  if (!preparedShowcaseMetadata.includes(project.showcaseExport)) {
    failures.push(`src/lib/prepared-showcase-projects.ts: ${project.name} must have prepared showcase metadata`)
  }
  if (!preparedShowcaseMetadata.includes(project.href) && !project.curated) {
    failures.push(`src/lib/prepared-showcase-projects.ts: ${project.name} prepared showcase must point to its special route`)
  }
  mustInclude('src/lib/project-links.ts', projectLinks, project.projectId, `${project.name} must have a route override`)
  mustInclude('src/lib/project-links.ts', projectLinks, project.href, `${project.name} route override must point to the special page`)
  if (project.releaseGate) {
    mustInclude(project.route, routeContent, project.releaseGate, `${project.name} must fail closed until persisted release evidence exists`)
    mustInclude(project.route, routeContent, "export const dynamic = 'force-dynamic'", `${project.name} release gate must re-check persisted approval on every request`)
    mustNotInclude('src/lib/data.ts', data, project.projectId, `${project.name} must not appear through approved mock fallback data`)
  } else if (!project.curated) {
    mustInclude('src/lib/data.ts', data, project.projectId, `${project.name} must be approved in public fallback data`)
  }
  if (!project.expectPersistableAfterPublish) {
    mustInclude('src/lib/project-engagement.ts', engagement, project.projectId, `${project.name} must be non-persistable until a real prompts row exists`)
  }
  mustInclude('src/lib/mock-data.ts', mockData, project.showcaseExport, `${project.name} must be present in mock prompt/profile data`)

  for (const artifactPath of project.artifactPaths ?? []) {
    if (!existsSync(artifactPath)) failures.push(`${project.name}: missing artifact file ${artifactPath}`)
  }

  if (project.name === 'Pomodoro Focus Timer') {
    mustInclude(project.route, routeContent, 'generated_files:', 'Pomodoro must preserve captured and final artifacts as selectable versions')
    mustInclude(project.route, routeContent, 'pomodoro-focus-timer-gpt55-instant.html', 'Pomodoro must keep the current public final artifact selectable')
    mustInclude('src/components/PreparedSourceRunPage.tsx', preparedSourceRunPage, 'isDefault', 'Pomodoro must default to the current public final artifact')
    mustInclude(project.route, routeContent, 'response_exact: readArtifact', 'Pomodoro must use the captured HTML file as the exact response text')
  }

  if (!project.packagePath) continue

  const pkg = parseJson(project.packagePath)
  if (!pkg) continue

  if (project.curated) {
    const packageFileName = basename(project.packagePath)
    const modelVariantManifestEntry = modelVariantManifestsByProjectId.get(project.projectId)
    const packageLoadedByModelVariantRegistry = Boolean(
      usesModelVariantWrapper &&
      modelVariantManifestEntry?.manifest.canonicalRoute === project.href &&
      modelVariantManifestEntry.manifest.variants.some(
        (variant) =>
          variant?.packageFile === packageFileName &&
          variant?.sourceRunId === project.sourceRunId,
      ),
    )

    if (usesModelVariantWrapper && !modelVariantManifestEntry) {
      failures.push(
        `${project.route}: ${project.name} must have its own canonical model-variant manifest`,
      )
    }

    if (!routeContent.includes(packageFileName) && !packageLoadedByModelVariantRegistry) {
      failures.push(
        `${project.route}: ${project.name} route must load its curated source-run package`,
      )
    }

    const packageSourceRunId = pkg.source_run_submission_id ?? pkg.pathforge_pending_id
    if (packageSourceRunId !== project.sourceRunId) {
      failures.push(`${project.packagePath}: source-run id must match curated manifest id ${project.sourceRunId}`)
    }

    const expectedFinalArtifactPath = `public${project.defaultArtifactPath}`
    if (pkg.final_artifact_path !== expectedFinalArtifactPath) {
      failures.push(`${project.packagePath}: final_artifact_path must match curated default ${expectedFinalArtifactPath}`)
    }

    if (existsSync(expectedFinalArtifactPath)) {
      const finalArtifactContent = readFileSync(expectedFinalArtifactPath, 'utf8')
      const forbiddenFinalArtifactPatterns = [
        [/https?:\/\//i, 'remote URL'],
        [/<script\b[^>]*\bsrc\s*=/i, 'external script'],
        [/<link\b[^>]*\bhref\s*=/i, 'external linked resource'],
        [/@import\s/i, 'CSS import'],
        [/\bfetch\s*\(/i, 'fetch call'],
        [/\bXMLHttpRequest\b/i, 'XMLHttpRequest'],
        [/\bWebSocket\b/i, 'WebSocket'],
        [/\bwindow\.open\s*\(/i, 'window.open'],
        [/\b(?:window\.)?alert\s*\(/i, 'alert dialog'],
        [/\b(?:window\.)?confirm\s*\(/i, 'confirm dialog'],
        [/\b(?:window\.)?prompt\s*\(/i, 'prompt dialog'],
        [/\bwindow\.print\s*\(/i, 'print dialog'],
        [/\bdocument\.write\s*\(/i, 'document.write'],
        [/\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/i, 'dynamic HTML rendering'],
        [/<[^>]+\son[a-z]+\s*=/i, 'inline event handler'],
        [/\bdocument\.execCommand\s*\(/i, 'document.execCommand'],
        [/\beval\s*\(/i, 'eval'],
        [/\bnew\s+Function\s*\(/i, 'new Function'],
      ]
      for (const [pattern, label] of forbiddenFinalArtifactPatterns) {
        if (pattern.test(finalArtifactContent)) {
          failures.push(`${expectedFinalArtifactPath}: curated final artifact contains forbidden ${label}`)
        }
      }
    }

    const packagePrompts = Array.isArray(pkg.steps)
      ? pkg.steps.map((step) => step.prompt_exact)
      : []
    if (JSON.stringify(packagePrompts) !== JSON.stringify(project.prompts)) {
      failures.push(`${project.packagePath}: exact prompts must match the curated project descriptor`)
    }

    const packageArtifactPaths = new Set()
    if (typeof pkg.final_artifact_path === 'string' && pkg.final_artifact_path.startsWith('public/artifacts/')) {
      packageArtifactPaths.add(pkg.final_artifact_path)
    }
    for (const artifactVersion of Array.isArray(pkg.artifact_versions) ? pkg.artifact_versions : []) {
      const artifactPath = typeof artifactVersion === 'string'
        ? artifactVersion
        : artifactVersion?.path ?? artifactVersion?.artifact_path
      if (typeof artifactPath === 'string' && artifactPath.startsWith('public/artifacts/')) {
        packageArtifactPaths.add(artifactPath)
      }
    }
    for (const step of Array.isArray(pkg.steps) ? pkg.steps : []) {
      if (typeof step.artifact_version_path === 'string' && step.artifact_version_path.startsWith('public/artifacts/')) {
        packageArtifactPaths.add(step.artifact_version_path)
      }
      for (const artifactPath of Array.isArray(step.generated_files) ? step.generated_files : []) {
        if (typeof artifactPath === 'string' && artifactPath.startsWith('public/artifacts/')) {
          packageArtifactPaths.add(artifactPath)
        }
      }
    }

    const manifestArtifactPaths = [...(project.artifactPaths ?? [])].sort()
    if (JSON.stringify([...packageArtifactPaths].sort()) !== JSON.stringify(manifestArtifactPaths)) {
      failures.push(`${project.packagePath}: curated artifactVersionPaths must match every public artifact version in the package`)
    }
  }

  if (!Array.isArray(pkg.steps) || pkg.steps.length === 0) {
    failures.push(`${project.packagePath}: source-run package must have steps`)
    continue
  }

  const defaultStepNumber = routeDefaultStepNumber(routeContent)
  const finalStepNumber = finalArtifactStepNumber(pkg)
  if (usesPreparedWrapper || usesModelVariantWrapper) {
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
  mustNotInclude(project.route, routeShellContent, 'Source run ID', `${project.name} must not render internal source-run ids as public copy`)
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
    mustInclude('src/components/PreparedSourceRunPage.tsx', preparedSourceRunPage, 'artifactVersionsForStep', 'HP must map every generated artifact file into selectable showcase versions')
    mustInclude('src/components/PreparedSourceRunPage.tsx', preparedSourceRunPage, 'isDefault', 'HP must default to the verified public mounted artifact')
    if (artifactVersions.length !== generatedArtifactPaths.size) {
      failures.push(`${project.packagePath}: HP artifact_versions must match generated public artifact files so every version can mount above`)
    }
  }
}

if (failures.length > 0) {
  console.error('Source-run showcase guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Source-run showcase guard passed.')
