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
- Zoom: wheel or pinch, 0.6x to 1.5x (as in the spec). Pan by dragging, or with Shift+wheel or a sideways trackpad swipe. On first load the zoom is fit to the screen.
