> Converted from "Kalo Taka Private Limited Game Spec.docx". The docx is the original; this file is the working copy.

# Kalo Taka Private Limited: Game Spec

Oct 25, 2026 · @Tanvir Hafiz

## Overview

Kalo Taka Private Limited is a 2D browser idle tycoon where the player grows from a tin-shed landlord into a satirical Bangladeshi business empire, earning money automatically while the game is open.

- Pitch: build houses, collect rent, merge them into mansions, then expand into clinics, hospitals, restaurants and malls. Bend every rule on the way, with bribes, filled-in ponds and a nephew on every payroll.

- Tone: affectionate, sharp satire in Banglish. The joke is always on the powerful (the tycoon, officials, fixers), never on tenants, workers or patients.

- Platform: desktop and mobile browsers, deployable as a static site on GitHub Pages. Portrait and landscape both supported.

- Session style: open the tab, tap a few things, leave it running. Short active bursts, long idle stretches.

- Art: fully procedural 2D. No image assets required for v1; buildings, people and vehicles are drawn in code.

- Language: English UI with Banglish flavour text in v1. All strings live in one strings file so a full Bangla translation can be added later.

- Legal guardrail: every person, company, party and agency is fictional. Title screen shows: "Any resemblance to any real bhai is purely coincidental."

Notes for Claude Code: build in the milestone order at the end of this doc. Each milestone must be playable before the next starts. All tuning numbers live in one config file so they can be rebalanced without touching logic.

## Tech stack and architecture

Use Vite + TypeScript + plain HTML5 Canvas 2D, with no game engine and no backend. The game state is one serializable object, the simulation is pure functions over it, and rendering only reads it.

| Concern | Choice |
|---|---|
| Build | Vite, TypeScript strict mode |
| Rendering | Canvas 2D for the city, HTML/CSS overlay for HUD, panels and popups |
| Big numbers | Custom Money helper on JS number, formatted as Taka with lakh/crore, then K crore, then suffixes (see Economy) |
| Randomness | Seeded PRNG (mulberry32) so a save always redraws the same city |
| Save | localStorage, autosave every 10 s and on visibilitychange, versioned with a migration function; export/import save as a base64 string |
| Audio | Web Audio API, short synthesized blips, no files in v1 |
| Tests | Vitest for economy and merge logic |
| Deploy | GitHub Pages via a GitHub Action on push to main |

```
src/
  main.ts            boot, loop, resize
  config/            balance.ts, buildings.ts, events.ts, strings.ts
  state/             types.ts, initialState.ts, save.ts, migrate.ts
  sim/               tick.ts, economy.ts, merge.ts, heat.ts, events.ts, prestige.ts
  render/            camera.ts, city.ts, buildings/*.ts, people.ts, traffic.ts, effects.ts
  ui/                hud.ts, panels/*.ts, ticker.ts, toasts.ts, dialogs.ts
  util/              rng.ts, money.ts, easing.ts
```

Game loop: requestAnimationFrame drives rendering at display rate. The simulation runs on a fixed 250 ms tick (4 ticks per second) using an accumulator, so income is identical at 30 or 144 fps. Hidden tabs still earn: on return, compute elapsed time and apply it as catch-up (see Offline and background earnings).

Rule: sim/ never imports from render/ or ui/. UI dispatches actions (buyPlot, build, merge, payBribe, ...) to a single reducer-style applyAction(state, action).

## Core loop and economy

The loop is: earn Taka every tick, spend it on plots, buildings and upgrades, merge maxed buildings into the next tier, and repeat until a Flee to Canada reset is worth more than staying.

- Buy a plot.

- Build a tier 1 building of a chosen category (housing, healthcare, food, retail).

- It earns automatically every tick.

- Upgrade it through levels 1 to 10 within its tier.

- Merge two level 10 buildings of the same tier and category, sitting on adjacent plots, into one level 1 building of the next tier. One plot is freed.

- Spend on corruption shortcuts when they pay off; manage the heat they create.

- Prestige when growth slows.

### Currency

- Taka (৳): the only spendable currency in v1. Start with ৳50,000 and one free plot.

- Influence: a meter, not a currency, earned from posters and donations. It lowers bribe prices and heat gain.

- Offshore Stars: the prestige currency, earned on reset (see Prestige).

### Income per building per second

$$
income = baseIncome_{tier} \cdot (1 + 0.25(level - 1)) \cdot occupancy \cdot globalMult \cdot eventMult
$$

- baseIncome per tier is listed in the building tables. Each tier earns about 3.5x the previous tier at level 1.

- occupancy runs 0.5 to 1.0. It starts at 0.9 and is lowered by Tenant Anger (housing) or Media Heat (healthcare, food, retail).

- globalMult = (1 + 0.1 per Offshore Star) x upgrades bought in the Nephew and Poster systems.

- eventMult comes from active random events (load-shedding 0.5, dengue season 3.0 for healthcare, and so on).

### Costs

$$
upgradeCost = baseCost_{tier} \cdot 1.18^{level}
$$

$$
plotCost = 20000 \cdot 1.35^{plotsOwned}
$$

- Build cost of a tier 1 building = its baseCost. Higher tiers can only be reached by merging, never bought directly.

- Merge fee = 2x the baseCost of the target tier, paid in Taka, plus a permit wait (see Corruption systems).

- Target pacing: first merge at about 4 minutes, first clinic unlock at about 15 minutes, first hospital at about 1 hour, first Flee to Canada worth doing at about 3 to 4 hours of open play.

### Active play bonus

Idle is the default, but a tapper is rewarded:

- Every 20 to 40 s a random building shows a floating cash bag ("bhara", "tip", "commission"). Tapping it pays 30 s of that building's income.

- A golden briefcase appears every 5 to 8 minutes for 10 s. Tapping it gives 3x global income for 60 s. Toast: "Envelope received. Do not ask from whom."

### Offline and background earnings

- Tab hidden but open: full rate. On visibilitychange back to visible, apply elapsed time in one catch-up step and show a toast with the total.

- Game fully closed: earns at 25% rate, capped at 4 hours. On return, Manager Mamun reports: "Sir, your nephews collected ৳X while you slept. They kept 75% for petrol." The rate and cap can be raised with Nephew upgrades.

### Number formatting

Show money in Bangladeshi units:

| Range | Format | Example |
|---|---|---|
| under 1 lakh | Indian comma grouping | ৳85,400 |
| 1 lakh to under 1 crore | lakh, 2 decimals | ৳12.40 lakh |
| 1 crore to under 1 lakh crore | crore, 2 decimals | ৳3.75 crore, ৳4,210 crore |
| 1 lakh crore and up | lakh crore | ৳2.10 lakh crore |
| 1 crore crore and up | short suffix chain | ৳1.2 CrCr, then ৳1.2 aa, ab, ac... |

## Map and plots

The city is a side-on 2D street scene, scrolled horizontally, with plots in a row along a main road and later a second row behind it. Side-on suits stacked floors and rebar jokes better than top-down.

- Layout: each district is 12 plots wide. Plots are numbered left to right; "adjacent" for merging means neighbouring plot numbers in the same row.

- Rows: v1 has a front row (road-facing) and, unlocked at 20 plots owned, a back row drawn slightly smaller and higher for depth. Back-row buildings earn 0.8x.

- Districts: unlock in order as total income grows. Each changes the background palette and some event odds.

| District | Unlock at income | Flavour |
|---|---|---|
| Mirpur-ish Para | start | dense, tin roofs, tea stalls |
| Dhanmondi-ish Lake Road | ৳5,000/s | trees, a lake, cafés |
| Gulshan-ish Diplomatic Zone | ৳2 lakh/s | wide roads, glass towers |
| Purbachal-ish New Town | ৳1 crore/s | empty plots, sand, one billboard per acre |
| Char Island | ৳50 crore/s | river island that did not exist last year |

Use invented names ("Mirpara", "Dhanpur", "Gulmohor", "Purbopur", "Notun Char") in the UI. The "-ish" labels above are for the developer only.

### Buying land

Each empty plot offers two buttons:

- Buy legally: pay plotCost. No heat.

- Grab it: free, but the plot first shows as a pond, wetland, playground or riverbank. A filling animation runs for 20 s (trucks dumping sand). Adds +15 Media Heat and a ticker headline. Grabbed plots are marked with a tiny red flag only the player sees.

If an inquiry hits (see Corruption systems), it targets a grabbed plot first.

## Building ladders and merge rules

There are four categories. Only tier 1 can be built directly; every higher tier comes from merging two maxed buildings of the tier below. Income values are per second at level 1; costs are the baseCost used for upgrades and merge fees.

### Merge rules

- Two buildings, same category, same tier, both level 10, on adjacent plots in the same row.

- Player drags one onto the other (or taps Merge on either). The result appears on the left plot at level 1 of the next tier; the right plot becomes empty and keeps its "grabbed" status if it had one.

- Merge animation: both buildings shake, dust cloud, a crane appears, the new building rises floor by floor over 1.5 s.

- Merging is blocked while an inquiry freezes either building.

- No cross-category merges in v1.

### Housing (available from start)

| Tier | Name | Income ৳/s | Base cost ৳ | Visual notes |
|---|---|---|---|---|
| 1 | Tin-Shed Ghor | 5 | 2,000 | one room, tin roof, a clothesline |
| 2 | Semi-Pucca Bari | 18 | 8,000 | brick walls, tin roof, a cow optional |
| 3 | Rod-Wala Dotola | 60 | 30,000 | 2 floors, rebar sticking out of the roof "for future floors" |
| 4 | To-Let Bhaban | 220 | 1.2 lakh | 6 floors, "To-Let" banner, grills on every window |
| 5 | Duplex Mansion | 780 | 5 lakh | marble front, gold gate, two security guards asleep |
| 6 | Lake View Palace | 2,700 | 20 lakh | the lake is a filled-in pond with a fountain |
| 7 | Sky Tower | 9,500 | 80 lakh | 30 floors, helipad nobody uses, own name in neon |

Housing is the only category whose occupancy is driven by Tenant Anger. Its tenants appear as speech bubbles (see UI and comedy writing).

### Food (unlocks with first tier 3 housing)

| Tier | Name | Income ৳/s | Base cost ৳ | Visual notes |
|---|---|---|---|---|
| 1 | Tong Tea Stall | 40 | 15,000 | bench, kettle, hanging banana bunch |
| 2 | Biryani House | 140 | 60,000 | big pot, steam, queue |
| 3 | Rooftop Café | 500 | 2.4 lakh | fairy lights, plastic plants, a guitar nobody plays |
| 4 | Buffet Palace | 1,750 | 9 lakh | "All You Can Eat ৳2,999" sign |
| 5 | Franchise Empire | 6,100 | 36 lakh | same logo on three floors |

### Healthcare (unlocks with first tier 4 housing)

| Tier | Name | Income ৳/s | Base cost ৳ | Visual notes |
|---|---|---|---|---|
| 1 | Pharmacy | 150 | 1 lakh | green cross, stethoscope logo |
| 2 | Doctor's Chamber | 520 | 4 lakh | "Doctor sits Friday only" board |
| 3 | Diagnostic Centre | 1,800 | 15 lakh | "14 tests, 1 price" banner |
| 4 | Specialized Hospital | 6,400 | 60 lakh | 8 beds, 2 lifts, 1 working |
| 5 | Super Specialty Hospital | 22,000 | 2.4 crore | VIP wing, an ambulance parked forever |

Healthcare shows a live patient count above each building. Patients = occupancy x tier capacity, and income scales with it, so "more patients, more income" is visible. Each upgrade level is labelled as a new test added ("Level 6: Vitamin D test for everyone").

### Retail (unlocks with first tier 5 housing)

| Tier | Name | Income ৳/s | Base cost ৳ | Visual notes |
|---|---|---|---|---|
| 1 | Footpath Hawker Spot | 600 | 4 lakh | you rent out a footpath you do not own |
| 2 | Bazaar | 2,100 | 16 lakh | tarp roofs, many tiny shops |
| 3 | Shopping Complex | 7,400 | 64 lakh | escalator is the main attraction |
| 4 | Mega Mall | 26,000 | 2.6 crore | glass, fountain, a cinema |
| 5 | Galaxy Mall | 90,000 | 10 crore | indoor theme park, own flyover exit |

### Neighbour bonuses

Adjacent plots (same row, immediate neighbours) give small multipliers, shown as a green "+%" tag above the building:

| Building | Neighbour | Bonus |
|---|---|---|
| Any food | Any healthcare | +20% food income (patients' relatives eat) |
| Pharmacy | Diagnostic Centre or higher | +30% pharmacy income |
| Any housing | Retail tier 3+ | +10% rent |
| Any healthcare | Another healthcare | -10% each (they fight over referrals) |

## Corruption systems

Corruption is a risk-reward layer: shortcuts save time or money but feed three heat meters, and full meters trigger inquiries that freeze income. A careful player can play almost clean but slowly; a greedy player grows fast and spends time firefighting.

### Permits and speed money

Every action has a permit wait, shown as a stamp-and-file progress bar over the building:

| Action | Permit wait |
|---|---|
| Build tier 1 | 30 s |
| Upgrade one level | 5 s x tier |
| Merge | 60 s x target tier |

A Speed Money button finishes the wait instantly. Its price scales with the player's wealth, not the job, because "Sir knows you are rich now":

$$
speedMoney = remainingSeconds \cdot totalIncomePerSec \cdot 0.5 \cdot (1 - influence / 200)
$$

Each payment adds +1 Committee Attention. The button label rotates: "Speed Money", "Tea Money", "Sir's Coffee Fund", "Processing Fee (unofficial)".

### Heat meters

Three meters, each 0 to 100, shown as small gauges in the HUD:

| Meter | Rises from | Falls by | Effect |
|---|---|---|---|
| Media Heat | land grabs (+15), leaked bribes (+10), some events | -0.5/s base, faster with posters | lowers non-housing occupancy: 1 - heat/250 |
| Tenant Anger | January rent hike, water/gas events, many tenants per plot | -0.2/s base, fixes (below) | lowers housing occupancy: 1 - anger/200 |
| Committee Attention | speed money (+1), land grabs (+5), Media Heat above 60 (+1/s) | -0.1/s base | at 100, triggers an Inquiry |

### Inquiries

When Committee Attention reaches 100, an "Anti-Durniti Committee" notice drops onto one building: a grabbed plot first, otherwise the highest-earning building. It is frozen for 5 minutes (earns 0, cannot upgrade or merge), then Attention resets to 30. The player can resolve it early:

| Option | Cost | Result |
|---|---|---|
| Wait it out | nothing | freeze ends in 5 min |
| TV talk-show appearance | 30 s of total income | freeze time halved; ticker shows a ridiculous quote |
| Donation photo-op | 60 s of total income | freeze lifted, +20 Influence |
| Brown envelope | 120 s of total income | freeze lifted instantly; 25% chance it leaks: +10 Media Heat |

### Posters and Influence

- Buy poster campaigns from the Posters panel. Each campaign costs 20 s of total income and plasters the player's procedural face on walls, rickshaw backs and banners across the visible district.

- Each active campaign gives +10 Influence and doubles Media Heat decay. Posters fade over 10 minutes (rain streaks, then torn edges, then gone).

- Influence (0 to 100) gives up to 50% off speed money and bribes, and up to 30% less heat gain.

### Nephews (automation)

Instead of managers, the player hires relatives into four slots. Each nephew automates something but skims a cut of all income, shown honestly in the HUD:

| Nephew | Unlock | Automates | Skim |
|---|---|---|---|
| Rent Collector Rony | 5 buildings | auto-taps cash bags at 50% value | 3% |
| Permit Bhai Polash | first merge | permit waits -25% | 4% |
| Media Bhagne Mithu | first inquiry | Media Heat decay +50% | 3% |
| Driver Dipu | first tier 5 building | raises offline cap to 8 h | 2% + random "crashed the Prado" event |

Each nephew has 5 upgrade levels that improve the effect and lower the skim slightly. Firing a nephew triggers a family-pressure event that adds Tenant Anger ("Your Khala is upset").

### Tenant Anger fixes

- Fix the water pump: 15 s of housing income, -20 Anger.

- Allow bachelors (one-time toggle): -10 Anger permanently, but a "Neighbours complain" event becomes possible.

- Iftar party (only during the Ramadan event): 30 s of total income, -40 Anger, +10 Influence.

## Random events

Every 3 to 6 minutes of play, the event scheduler rolls one event from a weighted pool, skipping any whose unlock condition is not met and never repeating the last two. Only one major event runs at a time. Each event announces itself with a ticker headline and a Manager Mamun popup offering a response.

| Event | Unlock | Duration | Effect | Player response |
|---|---|---|---|---|
| Load-shedding | start | 60 s | random half of buildings at 0.5x, those buildings go dark | buy a generator per building (one-time); unlocks Diesel Supply side income |
| Monsoon waterlogging | start | 90 s | ground floors flood, housing 0.7x | rent out boats: tap boats for cash bags during the event |
| Hartal day | 10 buildings | 60 s | food and retail at 0.3x | open a bus parking lot on any empty plot for the duration, earning per stranded bus |
| Dengue season | first healthcare | 120 s | healthcare 3x, ticker: "Tycoon sad, also very rich" | none needed; optional "donate mosquito nets" for +15 Influence |
| January rent hike | 5 housing | instant | choice: raise all rents +20% for 10 min | accept: +20% housing, +30 Tenant Anger, "No Bachelors" signs appear |
| Gas line problem | 5 housing | 90 s | +15 Tenant Anger | open a cylinder shop on an empty plot for the duration |
| VIP visit | first tier 5 | 45 s | road closed, all income 0.8x, but huge Influence chance | pay for a welcome gate: 30 s of income, +25 Influence |
| Journalist sniffing | Media Heat above 50 | 60 s | Media Heat +1/s | buy ad space in their paper (heat stops rising) or ignore |
| Nephew crashed the Prado | Driver Dipu hired | instant | lose 20 s of income | pay it, or blame the rickshaw (+5 Media Heat) |
| Election season | 30 min played, once per run | 180 s | posters cost 50% less, Influence gain doubled | poster spree |
| Ramadan | 45 min played, once per run | 240 s | food 1.5x in the evening phase, Iftar party unlocked | host Iftar (see Tenant Anger fixes) |
| Flyover inaugurated | first retail | instant | one random building gains a permanent +15% (road frontage) | ribbon-cutting photo-op for +10 Influence |

Events tie into the day/night cycle where they make sense (load-shedding blackouts look best at night, Iftar runs at dusk).

## Prestige: Flee to Canada

The prestige reset is called Flee to Canada: the player sells everything, escapes abroad, and the Jamai (son-in-law) restarts the business with a permanent bonus from Offshore Stars.

$$
offshoreStars = \lfloor \sqrt{lifetimeEarnings / 10^{7}} \rfloor - starsAlreadyEarned
$$

- The Flee button appears once a reset would award at least 1 star. It shows the stars on offer and pulses when the reward is at least 50% of current total stars.

- Each Offshore Star gives +10% to all income, permanently.

- Reset: Taka, plots, buildings, heat meters, Influence, posters, events.

- Kept: Offshore Stars, nephew upgrade levels, unlocked districts' names in the codex, achievements, stats.

### Destinations

Before confirming, the player picks where to flee. Each destination is unlocked by total stars earned and gives a perk for the next run only:

| Destination | Unlock at total stars | Next-run perk |
|---|---|---|
| Toronto (Begum Para) | 1 | housing +25% |
| Kuala Lumpur Second Home | 10 | permit waits -25% |
| Dubai Marina | 30 | speed money -30% |
| London Flat | 75 | Media Heat decay +50% |
| Undisclosed Island | 200 | all heat gain -25% |

### Family perks (unlocked by total stars, never spent)

| Total stars | Perk |
|---|---|
| 5 | Jamai starts with 3 plots instead of 1 |
| 15 | start with ৳10 lakh |
| 40 | food and healthcare unlock one housing tier earlier |
| 100 | inquiries last 3 minutes instead of 5 |
| 250 | start each run with a free tier 3 Rod-Wala Dotola |

### Reset cutscene

A 6-second skippable scene: the tycoon at an airport with too many suitcases, a ticker reading "Businessman goes abroad for medical treatment, condition stable, assets also stable", then the Jamai stepping into an empty plot with a hard hat on backwards.

## Procedural 2D art spec

Everything is drawn with Canvas 2D primitives from a seeded RNG, in a flat, slightly chunky cartoon style with thick dark outlines and a warm palette. Each building's seed is hash(runSeed, plotIndex, tier, category), so a building looks the same every time it is drawn but different from its neighbours.

### Style rules

- Flat fills, 2 px dark outlines, no gradients except the sky. One soft drop shadow per building at the base.

- Palette: dusty pastels for walls (mint, salmon, lemon, sky blue, off-white), tin-grey and rust for roofs, saturated accents for signboards. Night palette shifts everything toward blue-purple with warm window lights.

- Pre-render each building to an offscreen canvas when it changes (built, upgraded, merged, event state), then blit. Do not redraw building geometry every frame.

### Building generator

Build each building from stacked modules:

- Base: shop shutter, gate, or lobby depending on category.

- Floors: count from tier and level (housing T4 = 6 floors, plus 1 per 3 levels). Each floor picks a window pattern, grill style, and random balcony props: laundry, AC unit, potted plant, satellite dish, sleeping cat.

- Roof: tin, flat slab with a water tank, or rebar spikes (housing T3 always has rebar). Higher tiers add a neon sign, helipad, or billboard.

- Signboard: generated name from word lists (below), drawn in a chunky font on a coloured board, sometimes slightly crooked.

- Level marks: each upgrade adds visible detail (a new AC, a fresh paint stripe, a second sign) so growth is readable without numbers.

Name generator word lists (expand in strings.ts):

- Housing: ["Shanti", "Rahman", "Ma", "Bhai Bhai", "Golden", "Royal"] + ["Nibash", "Villa", "Tower", "Bhaban", "Heights"]

- Healthcare: ["Modern", "Hi-Tech", "Popular", "Ibn", "Life Care", "Shefa"] + ["Diagnostic", "Medical", "Hospital", "Clinic"]

- Food: ["Star", "Haji", "Nanna", "Sultan's", "Kacchi", "Old Town"] + ["Biryani", "Kitchen", "Café", "Hotel & Restaurant"]

- Retail: ["Galaxy", "Padma", "Twin", "New", "Metro"] + ["Plaza", "City", "Complex", "Market"]

Keep every generated name invented. Add a blocklist in `strings.ts` and reject any combination that matches a real, well-known Bangladeshi brand.

### Street life

- Vehicles: rickshaws (with painted backs), CNG auto-rickshaws (green), buses (dented, two-tone), private cars (the player's own white Prado appears after tier 5). Traffic density scales with total income; at high income the road becomes a permanent jam, which is the wealth signal.

- People: tiny 3-part figures (head, body, legs) with procedural lungi, saree, shirt and pant colours; tenants walk in and out of housing, patients queue at healthcare, crowds at food.

- Crows, cats and a dog wander occasionally. A hawker walks the footpath every few minutes.

### Player portrait

The tycoon's face is procedural too: round face, moustache style, hair (or lack of), sunglasses, and a sleeveless waistcoat over a panjabi in a random colour (keep it party-neutral). It appears on posters, the HUD avatar and the TV talk-show popup. It ages slightly (more grey, bigger belly) with total stars earned.

### Day and night

A full day lasts 6 real minutes. Windows light up at dusk, neon and fairy lights switch on, and load-shedding events black out individual buildings.

## UI, UX and comedy writing

The screen is the city canvas with a thin HUD on top, a news ticker at the bottom, and slide-up panels for everything else; the comedy lives in the ticker, Manager Mamun and tenant bubbles.

### Layout

- Top HUD: player avatar, Taka total, income per second, three heat gauges, Influence, Offshore Stars.

- City canvas: drag or swipe to scroll; mouse wheel or pinch to zoom between 0.6x and 1.5x.

- Bottom ticker: a scrolling TV-style news strip in a red bar with a "BREAKING" tag.

- Bottom-right button row: Build, Posters, Nephews, Flee (appears when available), Settings.

- Tap a building: a card slides up with name, tier, level, income, upgrade button with cost, merge hint ("Needs a maxed neighbour of the same type"), and permit/speed money if a wait is running.

- Tap an empty plot: Buy legally / Grab it.

- Every button shows its cost and greys out when unaffordable. Buy-max (x1, x10, Max) toggle on upgrades.

### Manager Mamun

The player's assistant, a small avatar in the corner with a clipboard. He delivers tutorial steps, event popups and offline reports, always framing scams as routine. Sample lines:

- "Sir, permit office says 30 seconds. I told them you are a busy man."

- "Very normal, sir. Everyone fills ponds. Ducks can relocate."

- "The committee wants to 'discuss' Lake View Palace. I have prepared the envelope, sir."

- "Sir, tenants are saying no water 3 days. I said water is a state of mind."

### News ticker

Headlines fire on player actions and events, mixed with filler. Each headline is a template with slots ({building}, {district}, {amount}, {nephew}). Samples:

- "Local tycoon opens {building}, says it is 'for the people'"

- "Pond in {district} mysteriously becomes 6-storey building overnight"

- "Hospital adds 14th mandatory test; patients 'feeling healthier already'"

- "{nephew} spotted in new Prado, says it is 'company car'"

- "Traffic jam in {district} now visible from space; tycoon calls it 'development'"

- "Committee forms committee to investigate committee"

### Tenant and patient bubbles

Short speech bubbles pop above buildings every few seconds, drawn from pools keyed to state (happy, angry, event-specific): "Bhaiya, water nai 3 din", "Rent again increased?!", "Lift is decoration only", "Doctor will come Friday, inshallah", "Why 14 tests for a cold?".

### Writing rules

- Banglish in English letters for v1; keep each line under 70 characters.

- Target the tycoon, officials and fixers. Tenants, patients and workers are the straight men, never the butt of the joke.

- No real people, parties, brands, or religious mockery. Ramadan and Eid content stays warm, not satirical.

- Minimum pool sizes for v1: 40 ticker headlines, 25 Mamun lines, 30 bubbles per category. All live in strings.ts.

### Onboarding

A 90-second guided start by Manager Mamun: buy nothing (first plot is free), build a Tin-Shed Ghor, watch money tick, upgrade once, buy a second plot, build and max two, merge. After the first merge the tutorial ends with: "Congratulations sir, you are now officially a developer."

## Audio, settings, accessibility

Audio is synthesized with the Web Audio API in v1 and starts muted until the first user tap, as browsers require.

- SFX: coin tick (throttled to at most 4 per second), cash bag pop, permit stamp thunk, merge crane rumble plus rising chime, inquiry siren (short, not shrill), rickshaw bell, crow caw. Each under 0.5 s.

- Ambience: optional low traffic hum and distant horn loop, generated from filtered noise, volume tied to traffic density.

- Music: none in v1. Leave a music channel and volume slider in place for a later track.

- Settings: master, SFX and ambience volume; reduce motion (disables shake, dust, screen flashes); number format (Bangladeshi units or short scientific); ticker speed; export save, import save, hard reset with a two-step confirm.

- Accessibility: all meaningful colour states also use an icon or label; minimum tap target 44 px; text never below 12 px; HUD and panels navigable by keyboard (Tab, Enter, Esc closes panels).

## Build milestones and acceptance criteria

Build in six milestones, each ending in a playable, deployed build; do not start the next until every box in the current one is ticked.

### M1: Skeleton and economy core

- ☐ Vite + TS project, folder structure as specified, GitHub Pages deploy action working

- ☐ Fixed 250 ms sim tick with accumulator; state object; applyAction reducer

- ☐ Housing tiers 1 to 3 with placeholder rectangles; buy plot, build, upgrade, merge

- ☐ Taka formatting in lakh/crore; Vitest tests for income, cost curves, merge rules and formatting

- ☐ Save/load to localStorage with version field; hidden-tab catch-up

### M2: Procedural city

- ☐ Side-scrolling street with front row of 12 plots, sky, road, footpath

- ☐ Full building generator for housing tiers 1 to 7 with offscreen-canvas caching

- ☐ Day/night cycle, rickshaws and pedestrians, traffic density tied to income

- ☐ Merge animation and upgrade visual changes

### M3: All categories and HUD

- ☐ Food, healthcare and retail ladders with unlock rules and neighbour bonuses

- ☐ Patient counts on healthcare; signboard name generator with blocklist

- ☐ Full HUD, building card, plot card, buy-max toggle, cash bags and golden briefcase

- ☐ Back row unlock at 20 plots; first three districts

### M4: Corruption layer

- ☐ Permit waits and speed money formula

- ☐ Three heat meters, inquiries with four resolution options

- ☐ Land grabbing with pond-fill animation

- ☐ Posters with procedural player face; Influence effects

- ☐ Four nephews with skim shown in HUD

### M5: Events, comedy and prestige

- ☐ Event scheduler and all 12 events

- ☐ News ticker, Manager Mamun, bubbles, with minimum string pool sizes met

- ☐ Onboarding tutorial

- ☐ Flee to Canada: star formula, destinations, family perks, cutscene

- ☐ Closed-game offline earnings with Mamun report

### M6: Polish and balance

- ☐ Audio and settings panel; reduce-motion and keyboard navigation

- ☐ Remaining districts

- ☐ A debug panel (hidden behind ?debug) with time-skip x10/x100, add money, set heat, trigger any event

- ☐ Balance pass using a headless sim script that plays greedily for 4 simulated hours and logs time-to-milestone; hit the pacing targets in Core loop and economy within 20%

- ☐ Runs at 60 fps on a mid-range Android phone with 40 buildings on screen

### Out of scope for v1

Accounts, cloud save, leaderboards, ads, in-app purchases, full Bangla localisation, music. Keep code structured so each can be added later without rewrites.