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

- [ ] Side-scrolling street with front row of 12 plots, sky, road, footpath
- [ ] Full building generator for housing tiers 1 to 7 with offscreen-canvas caching
- [ ] Day/night cycle, rickshaws and pedestrians, traffic density tied to income
- [ ] Merge animation and upgrade visual changes
