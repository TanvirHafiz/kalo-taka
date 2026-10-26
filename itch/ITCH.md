# Kalo Taka on itch.io: upload kit

## Files in this folder

| File | Use |
|---|---|
| `kalo-taka-web.zip` | The game. Upload it as the HTML5 file. Rebuild with `npm run build:itch` (not committed, it is a build output). |
| `cover-630x500.png`, `cover-1260x1000.png` | Cover image. Upload the 1260x1000 one (itch shows it at 630x500; the larger file stays sharp on high-density screens). |
| `screenshots/*.png` | Seven 1920x1080 screenshots, in the order to upload them. |
| `cover/cover.html` | The cover's source, if you want to change it. |

The promo video is at `promo/renders/kalo-taka-promo.mp4` (rebuild it with `npm run render` in `promo/`). itch.io takes a trailer as a YouTube or Vimeo link, not an upload, so post it there first and paste the link into "Gameplay video or trailer".

## Upload settings (Edit game page)

- **Title:** Kalo Taka Private Limited
- **Project URL:** kalo-taka
- **Short description or tagline:** From tin shed to sky tower. Paperwork optional.
- **Classification:** Games. **Kind of project:** HTML.
- **Release status:** Released (or In development, if you want to keep tuning).
- **Pricing:** No payments, or "$0 or donate", your call.
- **Uploads:** upload `kalo-taka-web.zip` and tick "This file will be played in the browser".
- **Embed options:**
  - Viewport dimensions: 1280 x 720.
  - Tick "Mobile friendly" (orientation: Landscape; it also plays in portrait).
  - Tick "Fullscreen button".
  - Leave "Automatically start on page load" off, so the title card's language choice is the first thing a player sees.
  - Frame options: "Click to launch in fullscreen" is a good choice on mobile.
- **Genre:** Simulation.
- **Tags:** idle, incremental, city-builder, satire, clicker, bangladesh, bangla, comedy, 2d, singleplayer
- **AI disclosure:** itch.io asks whether the project uses generative AI. The code and art were written with an AI coding assistant, and the promo's music was generated (Runware, MiniMax Music 2.6); answer the form accordingly.
- **Languages:** English, Bengali.
- **Inputs:** Mouse, Touchscreen, Keyboard.
- **Accessibility:** none of itch.io's checkboxes fit exactly; mention in the description that Settings has reduced motion and separate volume sliders.

## Description (paste into the Description field)

> **Kalo Taka Private Limited** is a satirical idle city builder set in a cut-paper Dhaka-style street. Start with a single tin shed and work your way up to a Sky Tower, a Galaxy Mall and a Super Specialty Hospital, by any means necessary.
>
> **Build, upgrade, merge.** Four ladders (housing, food, healthcare, retail), seven tiers of homes from Tin-Shed Ghor to Sky Tower, and merges that turn two maxed buildings into the next tier.
>
> **Bend every rule.** Grab the pond next door, pay speed money to the permit office, plaster your face on every lamp post, hire your nephews (they take a cut), and evict tenants when a plot is in the way.
>
> **Watch the heat.** Media Heat, Tenant Anger and the Anti-Durniti Committee are always watching. Too much attention and an inquiry freezes your best building, until a TV talk show, a donation photo-op or a brown envelope makes it go away.
>
> **Ride the news.** Load-shedding, monsoon floods, hartal, dengue season, VIP visits, election season and Ramadan all shake up the street, and the BREAKING ticker never stops.
>
> **Flee to Canada.** When the money stops growing, sell everything, escape abroad and let your Jamai restart the business with Offshore Stars that make every run richer.
>
> Plays in English or বাংলা, saves automatically in your browser, and keeps earning (a little) while you are away.
>
> *Everything in this game is fictional. Any resemblance to any real bhai is purely coincidental.*

## Controls (paste under the description or in "Install instructions")

- Tap or click a plot to buy, build, upgrade, merge, relocate or evict.
- Drag to scroll the street; scroll wheel or pinch to zoom.
- Tap cash bags, the golden briefcase and (in a flood) the paper boats.
- Esc closes panels.

## Notes

- Saves live in the browser's local storage on itch.io's domain, so a player's progress stays in that browser. Settings has Export and Import save for moving between devices.
- The game makes no network requests and collects nothing.
