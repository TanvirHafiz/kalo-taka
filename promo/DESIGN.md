# Kalo Taka promo: design

## Style Prompt

Cut-paper satire. The video looks like the game: warm craft paper, pieces with slightly torn edges and soft drop shadows, a tea-stained cream ground, and the game's own screenshots pinned on like photos in a scrapbook. Headlines speak in the game's chunky rounded voice (Baloo 2), and the news register is the game's own red BREAKING ticker, scaled up. The joke is the tone: a cheerful paper toy reported on like a scandal. Motion is playful and tactile: pieces slide in like paper sheets, stamps slam down, nothing glows.

## Colors

| Role | Hex | Use |
|---|---|---|
| Paper (background) | `#f3e9d2` | Every scene's ground |
| Card paper | `#fbf6ea` | Photo frames, cards, title plates |
| Ink (text) | `#3a2e25` | Body and headline text on paper |
| Accent red | `#c8553d` | Stamps, ticker bar, one key word per scene |
| Mustard | `#e9c46a` | Star counts, the ticker tag, small highlights |
| Night ink (dark scene only) | `#232838` | Scrim and plate behind text on the night shot |

Green `#5f8f6b` only appears inside screenshots, never as a design color.

## Typography

- **Baloo 2** 800/900: headlines and the game title. Tight tracking (-0.02em). This is the game's own font.
- **Baloo Da 2** 700/800: Bangla text.
- Video sizes: headlines 96px+, body 34px+, labels 26px+.

## Motion

- Entrances: paper slides (`power3.out`), stamps slam with overshoot (`back.out(2.2)`), photos drop and settle with a small rotation (`expo.out`).
- Transitions: push slide as the primary (sheets of paper), staggered paper blocks for the change of topic into the news scene, a circle iris for the Flee reveal, a slow dissolve into the end card.
- Screenshots drift slowly (Ken Burns, about 4% over a scene). Decorative paper scraps drift and rotate a few degrees.

## What NOT to Do

- No glow, neon, gradients on text, or glassmorphism: this is paper.
- No pure black or white; tint toward the paper and ink colors.
- No real people, parties, brands or places beyond what the game shows; everything stays fictional.
- No em dashes in on-screen text (the game's rule).
- Don't let the sky dominate a screenshot: crop to the street band.
