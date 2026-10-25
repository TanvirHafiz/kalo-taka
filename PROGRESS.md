# Progress

Spec: [SPEC.md](SPEC.md). Build order follows "Build milestones and acceptance criteria".

Play online: https://tanvirhafiz.github.io/kalo-taka/

## M1: Skeleton and economy core

- [x] Vite + TS project, folder structure as specified, GitHub Pages deploy action working
- [x] Fixed 250 ms sim tick with accumulator; state object; applyAction reducer
- [x] Housing tiers 1 to 3 with placeholder rectangles; buy plot, build, upgrade, merge
- [x] Taka formatting in lakh/crore; Vitest tests for income, cost curves, merge rules and formatting
- [x] Save/load to localStorage with version field; hidden-tab catch-up

### Decisions made in M1

- **Pacing:** spec numbers are used as written. With them the first merge takes about 2 hours, not 4 minutes. Retuning is deferred to the M6 balance pass. All numbers are in `src/config/`.
- **Number format:** 2 decimals below 1,000 crore, then whole crore with Indian grouping (৳4,210 crore). Lakh crore from 1e12. CrCr from 1e14 (1 decimal). Then aa at 1e17, ab at 1e20, x1000 per step. Values are truncated, never rounded up, so ৳99.99 lakh never shows as ৳100.00 lakh. "K crore" from the tech-stack table is not used.
- **Permit waits:** actions are instant until M4.
- **Merging:** all 7 housing tiers are in config, so tier 3 can merge up to tier 7 already. Merge takes two plot numbers; the result always lands on the left plot.
- **Clock:** the sim uses wall-clock epoch ms (`Date.now()`). The accumulator is the gap between now and `lastSimTime`. A gap over 1 s (hidden tab, sleep) is applied as one full-rate catch-up step.
- **Closed game:** reloading resumes from now with no offline earnings. The 25% offline rate and the Mamun report come in M5.
- **Saves:** key `kalotaka.save`. A corrupt or unmigratable save is copied to `kalotaka.save.bak` before starting fresh. The game saves every 10 s, on tab hide and on `pagehide`. Base64 export/import exists in `save.ts`; the buttons come with the M6 settings panel.
- **Title card:** shows the disclaimer line from the spec.

## M2: Procedural city

- [x] Side-scrolling street with front row of 12 plots, sky, road, footpath
- [x] Full building generator for housing tiers 1 to 7 with offscreen-canvas caching
- [x] Day/night cycle, rickshaws and pedestrians, traffic density tied to income
- [x] Merge animation and upgrade visual changes

### Street life and day/night (M2)

- Day/night: a full day takes 6 real minutes (`VISUAL.dayLengthMs`) and runs on the wall clock, so you can open the game at any time of day. At dusk the sky glows warm and a tint shifts the whole street to orange, then to blue-purple at night. Windows (about 60% lit, a different pattern per building), the Sky Tower neon, skyline windows, street lamps and headlights glow after dark. Paper pieces laid over a window (ACs, banners, laundry) block its light.
- Traffic: rickshaws, green CNGs, dented two-tone buses and cars, plus a white SUV once you own a tier 5 building. Two lanes, each a loop with car-following. Density is a share of lane capacity that grows with log10(income/s). Above 1.0 (around crore/s) the road is a permanent creeping jam. Numbers are in `VISUAL` in `config/balance.ts`.
- Pedestrians: tiny paper people in lungi, saree, or shirt and trousers walk the footpath. Some step out of buildings and some walk into them. The number grows with buildings.
- Animations:
  - Merge: both buildings shake for 0.5 s, then paper dust, a tower crane, and the new building rising floor by floor over 1.5 s.
  - Build: rises from the ground.
  - Upgrade: a squash pop and confetti.
  - The lights follow these animations at night. With prefers-reduced-motion they are skipped.
- Night lights are composed back to front in one layer, so poles, wires, people and traffic block the glow behind them. Performance on desktop with a busy street: about 1.1 ms script per frame by day and about 2 ms at night.

## M3: All categories and HUD

- [x] Food, healthcare and retail ladders with unlock rules and neighbour bonuses
- [x] Patient counts on healthcare; signboard name generator with blocklist
- [x] Full HUD, building card, plot card, buy-max toggle, cash bags and golden briefcase
- [x] Back row unlock at 20 plots; first three districts

### Decisions made in M3

- Neighbour bonuses stack per qualifying neighbour (your choice). Pharmacy next to a Diagnostic Centre: +30% -10% = +20%.
- Districts sit side by side with a gate between them. Plots across a gate are not neighbours (your choice). Mirpara is open from the start, Dhanpur opens at ৳5,000/s and Gulmohor at ৳2 lakh/s. Unlocks use income without the briefcase boost, and never lock again.
- Back row: opens at 20 owned plots and adds 12 back plots per district. It is drawn smaller and higher, shifted half a plot so it shows between front buildings, and earns 80%. Back plots neighbour only other back plots.
- Categories unlock the first time you own housing of tier 3 (food), 4 (healthcare) and 5 (retail), and stay unlocked.
- Cash bags stay until tapped, one at a time (your choice). The next one comes 20 to 40 s after you collect. A bag pays 30 s of that building's income. If its building is merged away, the bag goes too.
- Golden briefcase: every 5 to 8 minutes, visible for 10 s, gives 3x income for 60 s. While you are away (catch-up) no briefcase spawns, and a running boost only counts until it ends.
- Buy-max: x10 is capped at the levels left and needs their full cost. Max buys as many levels as you can afford. Your choice of x1/x10/Max is remembered.
- HUD: procedural avatar, Taka, income (gold while boosted), district name, and the Media Heat, Tenant Anger, Committee, Influence and Offshore Stars gauges, all at 0 until M4/M5 (your choice). Each gauge has an icon and a label as well as a colour.
- Buttons: Build jumps to the selected or first empty plot you own. Posters, Nephews and Settings say they open in a later update. Flee stays hidden until M5.
- Healthcare: patients = occupancy x tier capacity (12, 30, 80, 200, 480). Each level's card line names a new test.
- Signboard names come from the spec word lists plus extras. Real well-known names that the spec lists can produce (Haji Biryani, Nanna Biryani, Popular Diagnostic, New Market and others) are blocklisted.
- Traffic was turned down at your request: about 37% of lane capacity at ৳40,000/s. A full jam only appears at extreme late-game income.
- Save format v2, with migration from v1 (district and slot added, unlocks worked out from your highest house).

## M4: Corruption layer

- [x] Permit waits and speed money formula
- [x] Three heat meters, inquiries with four resolution options
- [x] Land grabbing with pond-fill animation
- [x] Posters with procedural player face; Influence effects
- [x] Four nephews with skim shown in HUD

### Decisions made in M4

- Permits: build 30 s, upgrade 5 s x tier per level, merge 60 s x target tier, shortened by Permit Bhai Polash. Paid up front. Buildings keep earning while an upgrade or merge waits (your choice); a new build earns nothing until it clears. A merge locks both plots. Merge, build and upgrade animations now play when the stamp lands.
- Speed money = remaining s x income x 0.5 x (1 - Influence/200), using real income (no briefcase boost, after the nephews' cut), with a ৳500 floor. Each payment is +1 Committee, and the label rotates.
- Heat: Media -0.5/s, Tenant Anger -0.2/s, Committee -0.1/s. Committee rises +1/s while Media is above 60. Influence cuts all heat gain by up to 30%.
  - "Doubles Media decay" per poster campaign is read as x(1 + campaigns), so it never goes exponential.
  - Tenant Anger rises +0.03/s per To-Let Bhaban or bigger (your choice).
  - Occupancy: housing x (1 - anger/200), everything else x (1 - media/250), clamped 0.5 to 1.
- Inquiries: one at a time. The talk show can be used once per inquiry. Bags never appear on the frozen building, and speed money cannot rush a frozen building's permit.
  - It targets a grabbed building first, otherwise your top earner. It freezes that building for 5 min (earns 0, no upgrade or merge).
  - The committee is held below 100 while it runs and resets to 30 when it ends.
  - Talk show (30 s of income, halves the remaining time), donation (60 s, ends it, +20 Influence) and brown envelope (120 s, ends it, 25% chance to leak +10 Media) all get the Influence discount.
  - If the frozen building is merged, the inquiry follows the result.
- Land grab: free. The plot becomes owned and grabbed (so it counts toward the plot price and the 20-plot back row). 20 s of sand trucks fill the pond, wetland, playground or riverbank before you can build. +15 Media, +5 Committee. A small red flag marks grabbed plots.
- Influence: posters give +10 while a 10-minute campaign runs (cost 20 s of income). Donation and event Influence fades about 1 per minute (your choice). Total capped at 100. Posters with your face appear on lamp posts and rickshaw backs, and age through rain streaks and torn edges.
- Nephews:
  - Hire costs 2 min of income; upgrades cost 3, 6, 12, 24 and 48 min (your choice). Each upgrade improves the effect and lowers the skim. Levels are kept if you fire one, and firing adds +15 Tenant Anger ("Your Khala is upset").
  - Unlocks: Rony at 5 buildings, Polash at your first merge, Mithu at your first inquiry, Dipu at your first tier 5.
  - Rony auto-collects bags at 50%+. Dipu's offline cap takes effect with M5's offline earnings.
  - The total skim is shown next to income in the HUD.
- Tenant fixes on housing cards: water pump (15 s of housing income, -20 Anger) and allow bachelors (once, -10).
- Catch-up while the tab is hidden now steps at most 5 s at a time, cut at every permit, inquiry, poster and boost deadline, so heat, inquiries and permits play out in order.
- Save format v3 (migrates from v2; milestones are worked out from your buildings).

## Changes requested after M4 (2026-10-25)

- All money is 100x (MONEY_SCALE = 100 in config/balance.ts): you start with ৳50 lakh, a Tin-Shed costs ৳2 lakh and earns ৳500/s at level 1. Every cost, income, plot price, district threshold and price floor uses the same scale, so pacing is unchanged. Income-scaled prices (speed money, bribes, posters, nephews) follow automatically. Old saves get their Taka multiplied by 100 (save v4). Traffic is measured in spec-scale Taka, so the street is no busier.
- The "tip" cash bag is now "chanda".
- HUD calendar: "Month M, Day D", counting one day per 6-minute day/night cycle since the game began, 30 days a month. It keeps counting across Flee to Canada.
- On screens 760 px and wider, the building card and the Posters/Nephews sheets dock top-right, and toasts sit bottom-right. Phones keep the bottom sheet.
- Media Heat already cut food, shop and hospital customers (up to 40%) and draws the committee above 60. That is now spelled out in the gauge tooltip and on the building card. A new "Pay off journalists" option (Posters sheet) costs 45 s of income (Influence discount applies) and removes 25 Media Heat.
- Buildings show current and max level ("Lv 3/10"); the card shows "Tier 2/7, Level 3/10".

### Art notes

- Style: **paper cutout**, chosen from the Style Lab on 2026-10-25. Muted craft paper palette, no outlines. Every shape is a cut piece with slightly uneven edges and a soft drop shadow. The sky is flat paper with a torn horizon strip, and a paper grain overlay (CSS, generated once) sits over the canvas.
- Shadows: cached sprites (buildings, skyline tiles) use a real blurred shadow, drawn once. Shapes drawn every frame (plots, poles, trees, badges, clouds) use a cheap offset copy instead. Script time is about 0.8 ms per frame, with no frame over 50 ms on a cold load.
- The game spec says "2 px dark outlines"; the paper style replaces that by your choice.
- Scene: sky, sun, drifting clouds, two parallax skyline layers (pre-rendered tiles), street trees, electric poles with tangled wires, tiled footpath, yellow and black curb, patched road.
- Plots: for-sale plots have weeds, a bamboo fence and a "JOMI BIKROY" board with the price. Owned empty plots show bricks, sand and a "COMING SOON" board.
- Housing T1 to T7: tin shed with clothesline and tube-well; semi-pucca with brick, tin roof and an optional cow; 2-floor dotola with rebar and a water tank; To-Let Bhaban (6 floors + 1 per 3 levels) with grills, balconies, ACs and a TO-LET banner; marble duplex with a gold gate and sleeping guards; Lake View Palace with domes and a fountain pond; glass Sky Tower with sky gardens, helipad and a neon name.
- Seeds: building seed = hash(runSeed, plot, tier, fixed category index). Every floor and decor slot has its own seed, and each slot has a fixed level threshold, so upgrades only add detail.
- Sprite cache: DPR capped at 2, two scale buckets, LRU capped at about 12M pixels.
- Signboard names come from word lists in `strings.ts`, with a blocklist.
- Font: Baloo 2, self-hosted via @fontsource (no Google dependency). Sprites redraw once it loads.
- Zoom: wheel or pinch, 0.6x to 1.5x (as in the spec). Pan by dragging, or with Shift+wheel or a sideways trackpad swipe. On first load the zoom is fit to the screen; on portrait phones it zooms in so the street fills about 2/3 of the height, and dragging down pans up to see the tops of tall towers.
