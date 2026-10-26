# Review: Kalo Taka promo ("The Ticker")

## Creative calls
- Built storyline A, The Ticker: one tycoon's rise told only by the game's own red BREAKING ticker, each headline dropping into the real shot that caused it. Not built: B "One Plot" (a continuous take on plot 1 growing tin shed to Sky Tower) and C "Mamun's Briefing" (Manager Mamun pitching the scheme in Bangla). Both are in STORYLINES.md.
- Every screen is a real capture of the live game (2x, 3840 x 2160), cropped to the street band or to the one card the beat uses, shown at about 1.2 to 2x. The cursor and the APPROVED stamp are the only drawn pieces.
- Every ticker headline is a real line from the game's ticker and cutscene pools.
- The news voice is the game's own ticker (Baloo 2 on a red band) rather than a separate newspaper serif.
- Music: Runware MiniMax Music 2.6, take B of two ($0.30 total), trimmed from 1.0 s to its strongest opening, -16 LUFS, 123.5 BPM; every scene starts on a bar line. Sound effects are HyperFrames' bundled library, placed so each peaks one frame after its picture.
- The film runs 36 s: the Flee scene got half a bar more so the cutscene's two lines can be read.

## Measured vs looked at
- `hyperframes check`: 0 errors; layout, motion and contrast clean.
- Looked at: snapshots at every QA time in SPEC.md, plus every changed frame after fixes.
- Music loudness measured (-16.1 LUFS integrated, -0.9 dBFS sample peak). Nobody has listened to the mix: sound was measured, not heard.

## Weakest shot
- The opening tin shed is still fairly small in frame 0 (about 130 px wide), because the shot also shows the empty plots for sale around it. With more time: a dedicated capture at the game's maximum zoom.
- Shot 4 (posters): the tycoon's posters on the lamp posts are small; the bunting reads, the faces barely do.

## Warnings kept on purpose
- `timeline_track_too_dense` on compositions/ticker.html: the ticker is the film's single carrier, so all eight headlines live in one file on purpose.
