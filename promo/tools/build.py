# Writes compositions/*.html and index.html for the "Ticker" promo from one table of shots.
# Re-run after changing timings or crops: python tools/build.py (from the promo folder).
import json, os

BAR = 60 / 123.5 * 4          # 1.9433 s
T = [0, 2, 4, 5.5, 7, 9, 11, 13, 16]   # scene start bars
BARS_END = 18.5
EDGE = 0.25                   # half of every transition
FPS = 30
SRC_W, SRC_H = 3840, 2160


def bar(b):
    return round(b * BAR, 3)


SCENE_AT = [bar(b) for b in T] + [bar(BARS_END)]
TOTAL = 36.0


def crop(img, x0, y0, w, h, fw=1920, fh=1080, extra=''):
    """An <img> placed so source region (x0,y0,w,h) fills a fw x fh frame."""
    s = fw / w
    return (f'<img class="shot" data-layout-allow-overflow src="assets/shots/{img}.jpg" alt="" '
            f'style="width:{SRC_W * s:.1f}px;height:{SRC_H * s:.1f}px;left:{-x0 * s:.1f}px;top:{-y0 * s:.1f}px;{extra}">')


CURSOR = ('<svg class="cursor" viewBox="0 0 64 90" aria-hidden="true">'
          '<path d="M6 4 L6 70 L22 56 L33 82 L45 77 L34 52 L56 52 Z" fill="#fbf6ea" stroke="#3a2e25" stroke-width="5" stroke-linejoin="round"/></svg>')

FONTS = """
@font-face { font-family: 'Baloo 2'; font-weight: 600; src: url('assets/fonts/baloo-2-latin-600-normal.woff2') format('woff2'); }
@font-face { font-family: 'Baloo 2'; font-weight: 700; src: url('assets/fonts/baloo-2-latin-700-normal.woff2') format('woff2'); }
@font-face { font-family: 'Baloo 2'; font-weight: 800; src: url('assets/fonts/baloo-2-latin-800-normal.woff2') format('woff2'); }
@font-face { font-family: 'Baloo Da 2'; font-weight: 700; src: url('assets/fonts/baloo-da-2-bengali-700-normal.woff2') format('woff2'); }
@font-face { font-family: 'Baloo Da 2'; font-weight: 800; src: url('assets/fonts/baloo-da-2-bengali-800-normal.woff2') format('woff2'); }
"""

BASE_CSS = """
#root { position: absolute; inset: 0; overflow: hidden; font-family: 'Baloo 2', 'Baloo Da 2', sans-serif; color: #3a2e25; }
#root .stage { position: absolute; inset: 0; overflow: hidden; }
#root .kb { position: absolute; inset: 0; }
#root .shot { position: absolute; max-width: none; }
#root .cursor { position: absolute; width: 90px; height: 126px; left: 0; top: 0; }
#root .dim { position: absolute; inset: 0; background: #1b1712; opacity: 0; }
"""


def scene(sid, dur, body, css, js):
    return f"""<template>
  <style>
{FONTS}
{BASE_CSS}
{css}
  </style>
  <div id="root" data-composition-id="{sid}" data-width="1920" data-height="1080">
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    const D = {dur};
{js}
    window.__timelines["{sid}"] = tl;
  </script>
</template>
"""


# outgoing moves, written at the end of a scene (local time D - 2*EDGE .. D)
PUSH_OUT = 'tl.to("#{p}-stage", { x: -1920, duration: 0.5, ease: "power3.inOut" }, D - 0.5);'
PUSH_IN = 'tl.fromTo("#{p}-stage", { x: 1920 }, { x: 0, duration: 0.5, ease: "power3.inOut" }, 0);'
WHIP_OUT = 'tl.to("#{p}-stage", { x: -760, filter: "blur(18px)", duration: 0.25, ease: "power3.in" }, D - 0.5);\n    tl.set("#{p}-stage", { opacity: 0 }, D - 0.25);'
WHIP_IN = 'tl.fromTo("#{p}-stage", { x: 760, filter: "blur(18px)", opacity: 0 }, { x: 0, filter: "blur(0px)", opacity: 1, duration: 0.28, ease: "expo.out" }, 0.25);'

scenes = []

# --- 1. The tin shed ----------------------------------------------------------------------
scenes.append(('shed', 'push', f"""
    <div id="shed-stage" class="stage">
      <div id="shed-kb" class="kb">{crop('start_tinshed', 0, 812, 2400, 1350)}</div>
    </div>""", """
#shed-kb { transform-origin: 208px 678px; }
""", """
    tl.fromTo("#shed-kb", { scale: 1.4 }, { scale: 1.85, duration: D - 0.5, ease: "power2.inOut" }, 0);
""" + PUSH_OUT.replace('{p}', 'shed')))

# --- 2. Grab it: the card, the click, the playground filling ---------------------------------
scenes.append(('grab', 'push', f"""
    <div id="grab-stage" class="stage">
      <div id="grab-card" class="kb">{crop('card_grab', 2760, 0, 1080, 607.5)}</div>
      <div id="grab-fill" class="kb">{crop('grab_fill', 1200, 920, 1600, 900)}</div>
      <div id="grab-cur-wrap">{CURSOR}</div>
    </div>""", """
#grab-fill { opacity: 0; transform-origin: 50% 60%; }
#grab-cur-wrap { position: absolute; left: 0; top: 0; }
""", f"""
    {PUSH_IN.replace('{p}', 'grab')}
    // the cursor comes in from the lower right and clicks "Grab it"
    tl.fromTo("#grab-cur-wrap", {{ x: 1700, y: 1100 }}, {{ x: 1187, y: 599, duration: 0.7, ease: "power3.out" }}, 0.5);
    tl.to("#grab-cur-wrap", {{ scale: 0.86, duration: 0.07, ease: "power2.in" }}, 1.47);
    tl.to("#grab-cur-wrap", {{ scale: 1, duration: 0.1, ease: "power2.out" }}, 1.54);
    // cut on the click to the playground under sand trucks
    tl.set("#grab-fill", {{ opacity: 1 }}, 1.55);
    tl.set("#grab-cur-wrap", {{ opacity: 0 }}, 1.55);
    tl.fromTo("#grab-fill", {{ scale: 1.06 }}, {{ scale: 1.16, x: -60, duration: D - 2.1, ease: "power2.inOut" }}, 1.55);
""" + PUSH_OUT.replace('{p}', 'grab')))

# --- 3. Speed money: click, APPROVED stamp ----------------------------------------------------
scenes.append(('speed', 'push', f"""
    <div id="speed-stage" class="stage">
      <div id="speed-kb" class="kb">{crop('card_speed', 2760, 0, 1080, 607.5)}</div>
      <div id="speed-cur-wrap">{CURSOR}</div>
      <div id="speed-stamp-wrap"><div id="speed-stamp">APPROVED</div></div>
    </div>""", """
#speed-kb { transform-origin: 1195px 441px; }
#speed-cur-wrap { position: absolute; left: 0; top: 0; }
#speed-stamp-wrap { position: absolute; left: 1180px; top: 640px; }
#speed-stamp { font-weight: 800; font-size: 120px; line-height: 1; letter-spacing: 0.02em; color: #c8553d;
  border: 12px solid #c8553d; border-radius: 18px; padding: 18px 40px 8px; background: rgba(251,246,234,0.86); }
""", f"""
    {PUSH_IN.replace('{p}', 'speed')}
    tl.fromTo("#speed-kb", {{ scale: 1 }}, {{ scale: 1.08, duration: 2.0, ease: "power2.inOut" }}, 0.3);
    tl.fromTo("#speed-cur-wrap", {{ x: 1700, y: 1100 }}, {{ x: 1187, y: 435, duration: 0.6, ease: "power3.out" }}, 0.4);
    tl.to("#speed-cur-wrap", {{ scale: 0.86, duration: 0.07, ease: "power2.in" }}, 1.18);
    tl.to("#speed-cur-wrap", {{ scale: 1, duration: 0.1, ease: "power2.out" }}, 1.25);
    // the stamp slams down a beat after the click
    tl.fromTo("#speed-stamp", {{ scale: 1.8, rotation: -14, opacity: 0 }}, {{ scale: 1, rotation: -8, opacity: 1, duration: 0.3, ease: "back.out(2.2)" }}, 1.42);
""" + WHIP_OUT.replace('{p}', 'speed')))

# --- 4. Posters and bunting -----------------------------------------------------------------
scenes.append(('posters', 'whip', f"""
    <div id="posters-stage" class="stage">
      <div id="posters-kb" class="kb">{crop('event_election_posters', 600, 1000, 1600, 900)}</div>
    </div>""", "", f"""
    {WHIP_IN.replace('{p}', 'posters')}
    tl.fromTo("#posters-kb", {{ x: 0 }}, {{ x: -260, duration: D, ease: "power2.inOut" }}, 0);
"""))

# --- 5. Title: paper blocks, the name prints, the stamp lands on the bar -------------------
blocks = ''.join(f'<div class="blk" id="title-b{i}" style="left:{i * 320}px"></div>' for i in range(6))
letters = ''.join(f'<span class="ltr">{c}</span>' if c != ' ' else '<span class="gap"> </span>' for c in 'Kalo Taka')
scenes.append(('title', 'blocks', f"""
    <div id="title-stage" class="stage">
      {blocks}
      <div id="title-content">
        <h1 id="title-name">{letters}</h1>
        <p id="title-sub">Private Limited</p>
        <div id="title-stamp-wrap"><div id="title-stamp">PAPERWORK OPTIONAL</div></div>
      </div>
    </div>""", """
#title-stage .blk { position: absolute; top: 0; width: 322px; height: 1080px; background: #f3e9d2; }
#title-content { position: absolute; inset: 0; padding: 0 0 0 220px; display: flex; flex-direction: column; justify-content: center; gap: 0; box-sizing: border-box; }
#title-name { margin: 0; font-weight: 800; font-size: 260px; line-height: 0.9; letter-spacing: -0.02em; color: #3a2e25; }
#title-name .ltr { display: inline-block; }
#title-sub { margin: 18px 0 0 10px; font-weight: 700; font-size: 84px; line-height: 1; color: #3a2e25; }
#title-stamp-wrap { position: absolute; left: 1040px; top: 690px; }
#title-stamp { font-weight: 800; font-size: 64px; line-height: 1; letter-spacing: 0.03em; color: #c8553d; border: 9px solid #c8553d; border-radius: 14px; padding: 16px 30px 6px; }
""", """
    // six strips of kraft drop in, staggered, and become the ground
    tl.fromTo("#title-stage .blk", { y: -1090 }, { y: 0, duration: 0.42, ease: "power3.out", stagger: 0.035 }, 0);
    // the name prints letter by letter
    tl.fromTo("#title-name .ltr", { opacity: 0.12, y: 26 }, { opacity: 1, y: 0, duration: 0.22, ease: "expo.out", stagger: 0.1 }, 0.62);
    tl.fromTo("#title-sub", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "power2.out" }, 1.55);
    // the stamp lands on the bar line
    tl.fromTo("#title-stamp", { scale: 1.9, rotation: -16, opacity: 0 }, { scale: 1, rotation: -7, opacity: 1, duration: 0.3, ease: "back.out(2.2)" }, 2.19);
""" + PUSH_OUT.replace('{p}', 'title')))

# --- 6. The street by day, night sweeps in --------------------------------------------------
scenes.append(('city', 'push', f"""
    <div id="city-stage" class="stage">
      <div id="city-pan" class="kb" data-layout-allow-overflow>
        <div id="city-day" class="kb">{crop('city_day_wide', 0, 1080, 1920, 1080)}</div>
        <div id="city-night" class="kb">{crop('city_night_wide', 0, 1080, 1920, 1080)}</div>
      </div>
      <div id="city-dim" class="dim"></div>
    </div>""", """
#city-night { clip-path: inset(0 0 0 100%); }
""", f"""
    {PUSH_IN.replace('{p}', 'city')}
    tl.fromTo("#city-pan", {{ x: 0 }}, {{ x: -120, duration: D, ease: "none" }}, 0);
    // night arrives from the right edge on the bar line
    tl.fromTo("#city-night", {{ clipPath: "inset(0 0 0 100%)" }}, {{ clipPath: "inset(0 0 0 0%)", duration: 0.6, ease: "power2.inOut" }}, 2.19);
    // dip before the cut to the inquiry
    tl.to("#city-dim", {{ opacity: 0.4, duration: 0.1, ease: "none" }}, D - 0.35);
"""))

# --- 7. The committee --------------------------------------------------------------------
scenes.append(('inquiry', 'dip', f"""
    <div id="inquiry-stage" class="stage">
      <div id="inquiry-kb" class="kb">{crop('inquiry', 1280, 1120, 1280, 720)}</div>
    </div>""", """
#inquiry-stage { opacity: 0; }
#inquiry-kb { transform-origin: 960px 420px; }
""", """
    // hard cut on the transition centre, after the outgoing frame dipped
    tl.set("#inquiry-stage", { opacity: 1 }, 0.25);
    tl.fromTo("#inquiry-kb", { scale: 1 }, { scale: 1.12, duration: D - 0.5, ease: "power2.inOut" }, 0.25);
    tl.to("#inquiry-kb", { y: -1080, duration: 0.28, ease: "power3.in" }, D - 0.5);
"""))

# --- 8. Flee: the sheet, the click, the airport, the Jamai ---------------------------------
scenes.append(('flee', 'whipv', f"""
    <div id="flee-stage" class="stage">
      <div id="flee-sheet" class="kb">{crop('sheet_flee', 2400, 0, 1440, 810)}</div>
      <div id="flee-cur-wrap">{CURSOR}</div>
      <div id="flee-air" class="kb"><div id="flee-air-in" class="kb">{crop('cutscene_airport', 240, 800, 1440, 810)}</div></div>
      <div id="flee-jamai" class="kb">{crop('cutscene_jamai', 1456, 1120, 924, 520)}</div>
    </div>""", """
#flee-cur-wrap { position: absolute; left: 0; top: 0; }
#flee-air { clip-path: circle(0% at 1712px 507px); }
#flee-jamai { opacity: 0; }
""", """
    tl.fromTo("#flee-stage", { y: 1080 }, { y: 0, duration: 0.3, ease: "expo.out" }, 0.22);
    tl.fromTo("#flee-cur-wrap", { x: 1500, y: 1100 }, { x: 1700, y: 500, duration: 0.55, ease: "power3.out" }, 0.55);
    tl.to("#flee-cur-wrap", { scale: 0.86, duration: 0.07, ease: "power2.in" }, 1.28);
    tl.to("#flee-cur-wrap", { scale: 1, duration: 0.1, ease: "power2.out" }, 1.35);
    // iris from the click onto the airport
    tl.fromTo("#flee-air", { clipPath: "circle(0% at 1712px 507px)" }, { clipPath: "circle(150% at 1712px 507px)", duration: 0.45, ease: "power2.in" }, 1.36);
    tl.set("#flee-cur-wrap", { opacity: 0 }, 1.6);
    tl.fromTo("#flee-air-in", { scale: 1 }, { scale: 1.06, duration: 2.3, ease: "power2.inOut" }, 1.4);
    // cut on the bar to the Jamai
    tl.set("#flee-jamai", { opacity: 1 }, 3.6);
    tl.fromTo("#flee-jamai", { scale: 1.06 }, { scale: 1, duration: 2.2, ease: "expo.out" }, 3.6);
    // blur swap into the end card
    tl.to("#flee-stage", { opacity: 0, filter: "blur(8px)", duration: 0.2, ease: "power2.in" }, D - 0.45);
"""))

# --- 9. Claim and end card ------------------------------------------------------------------
scenes.append(('end', 'blur', """
    <div id="end-stage" class="stage">
      <div id="end-claim">
        <p id="end-l1">From tin shed to sky tower.</p>
        <p id="end-l2">Paperwork <span class="acc">optional.</span></p>
      </div>
      <div id="end-card">
        <div id="end-lockup"><span id="end-name">Kalo Taka</span><span id="end-ltd">Private Limited</span></div>
        <div id="end-lang"><span class="on">English</span><span class="bn">বাংলা</span></div>
        <p id="end-cta">Play free in your browser</p>
        <p id="end-url" data-var-text="url">tanvirhafiz.github.io/kalo-taka</p>
      </div>
    </div>""", """
#end-stage { background: #f3e9d2; opacity: 0; }
#end-claim { position: absolute; inset: 0; padding: 0 0 0 200px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; }
#end-claim p { margin: 0; font-weight: 800; font-size: 132px; line-height: 1.02; letter-spacing: -0.02em; }
#end-claim .acc { color: #c8553d; }
#end-card { position: absolute; inset: 0; padding: 0 200px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: 26px; box-sizing: border-box; opacity: 0; }
#end-lockup { display: flex; align-items: baseline; gap: 34px; }
#end-name { font-weight: 800; font-size: 180px; line-height: 0.95; letter-spacing: -0.02em; }
#end-ltd { font-weight: 700; font-size: 72px; line-height: 1; }
#end-lang { display: flex; gap: 14px; }
#end-lang span { font-weight: 800; font-size: 40px; line-height: 1; padding: 18px 34px 12px; border-radius: 40px; border: 4px solid #e3cfa8; background: #fbf6ea; }
#end-lang .on { background: #3a2e25; color: #fbf6ea; border-color: #3a2e25; }
#end-lang .bn { font-family: 'Baloo Da 2', sans-serif; }
#end-cta { margin: 10px 0 0; font-weight: 700; font-size: 56px; line-height: 1.1; }
#end-url { margin: 0; font-weight: 800; font-size: 64px; line-height: 1.1; color: #c8553d; }
""", """
    tl.fromTo("#end-stage", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.15, ease: "power2.out" }, 0.25);
    tl.fromTo("#end-l1", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.18, ease: "power2.out" }, 0.4);
    tl.fromTo("#end-l2", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.18, ease: "power2.out" }, 1.0);
    // the claim clears on the bar and the card is printed in its place
    tl.to("#end-claim", { opacity: 0, filter: "blur(8px)", duration: 0.18, ease: "power2.in" }, 2.05);
    tl.set("#end-card", { opacity: 1 }, 2.23);
    tl.fromTo("#end-name", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }, 2.23);
    tl.fromTo("#end-ltd", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.4, ease: "power3.out" }, 2.4);
    tl.fromTo("#end-lang span", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.6)", stagger: 0.09 }, 2.6);
    tl.fromTo("#end-cta", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.18, ease: "power2.out" }, 2.85);
    tl.fromTo("#end-url", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.18, ease: "power2.out" }, 2.97);
    // the last half second settles to kraft
    tl.to("#end-card", { opacity: 0, duration: 0.45, ease: "power1.in" }, D - 0.5);
"""))

# ---------------------------------------------------------------------------------------------
os.makedirs('compositions', exist_ok=True)
hosts = []
for i, (sid, kind, body, css, js) in enumerate(scenes):
    start = SCENE_AT[i] - (EDGE if i > 0 else 0)
    end = SCENE_AT[i + 1] + (EDGE if i < len(scenes) - 1 else 0)
    if i == len(scenes) - 1:
        end = TOTAL
    dur = round(end - start, 3)
    with open(f'compositions/{sid}.html', 'w', encoding='utf8', newline='\n') as f:
        f.write(scene(sid, dur, body, css, js))
    hosts.append((sid, round(start, 3), dur, 10 + i))

# --- ticker: the carrier ------------------------------------------------------------------------
HEAD = [
    ('h1', 0.35, SCENE_AT[1], 'Local tycoon opens Tin-Shed Ghor, says it is "for the people"'),
    ('h2', SCENE_AT[1] + 1.55, SCENE_AT[2], 'Playground in Mirpara relocated to "somewhere nicer"'),
    ('h3', SCENE_AT[2] + 1.25, SCENE_AT[3], 'Officer buys new car on government salary, credits "savings"'),
    ('h4', SCENE_AT[3] + 0.4, SCENE_AT[4] - 0.25, 'Tycoon posters now outnumber trees in Mirpara'),
    ('h6', SCENE_AT[5] + 0.45, SCENE_AT[6], 'Traffic jam in Mirpara now visible from space'),
    ('h7', SCENE_AT[6] + 0.45, SCENE_AT[7] - 0.25, 'Committee forms committee to investigate committee'),
    ('h8', SCENE_AT[7] - EDGE + 1.5, SCENE_AT[7] - EDGE + 3.6, 'Businessman goes abroad for medical treatment'),
    ('h9', SCENE_AT[7] - EDGE + 3.6, SCENE_AT[8] - 0.25, 'Meanwhile, the Jamai arrives with a hard hat.'),
]
band1 = (0.0, SCENE_AT[4] - 0.25)
band2 = (SCENE_AT[5], SCENE_AT[7] - 0.25)
band3 = (SCENE_AT[7] - EDGE + 1.4, SCENE_AT[8] - 0.25)
tick_body = []
tick_js = []
for bid, (s, e) in (('tk-band1', band1), ('tk-band2', band2), ('tk-band3', band3)):
    tick_body.append(f'<div id="{bid}" class="clip band-host" data-start="{s:.3f}" data-duration="{e - s:.3f}" data-track-index="1">'
                     f'<div id="{bid}-in" class="band"><span class="tag">BREAKING</span></div></div>')
    tick_js.append(f'tl.fromTo("#{bid}-in", {{ y: 90 }}, {{ y: 0, duration: 0.3, ease: "expo.out" }}, {s:.3f});')
    tick_js.append(f'tl.to("#{bid}-in", {{ y: 90, duration: 0.22, ease: "power3.in" }}, {e - 0.24:.3f});')
for hid, s, e, text in HEAD:
    tick_body.append(f'<div id="tk-{hid}" class="clip head-host" data-start="{s:.3f}" data-duration="{e - s:.3f}" data-track-index="2">'
                     f'<p id="tk-{hid}-t" class="head" data-var-text="{hid}">{text}</p></div>')
    tick_js.append(f'tl.fromTo("#tk-{hid}-t", {{ x: 900, opacity: 0, filter: "blur(12px)" }}, '
                   f'{{ x: 0, opacity: 1, filter: "blur(0px)", duration: 0.3, ease: "expo.out" }}, {s:.3f});')
ticker = f"""<template>
  <style>
{FONTS}
    #root {{ position: absolute; inset: 0; font-family: 'Baloo 2', sans-serif; }}
    #root .band-host {{ position: absolute; left: 0; right: 0; bottom: 0; height: 76px; }}
    #root .band {{ position: absolute; inset: 0; background: #c8553d; box-shadow: 0 -6px 0 rgba(70,42,16,0.25); }}
    #root .tag {{ position: absolute; left: 0; top: 0; bottom: 0; display: flex; align-items: center; padding: 6px 28px 0; background: #e9c46a; color: #3a2e25; font-weight: 800; font-size: 34px; letter-spacing: 0.04em; }}
    #root .head-host {{ position: absolute; left: 268px; right: 40px; bottom: 0; height: 76px; }}
    #root .head {{ margin: 0; position: absolute; left: 0; top: 0; bottom: 0; display: flex; align-items: center; padding-top: 6px; color: #fffaf0; font-weight: 700; font-size: 40px; white-space: nowrap; }}
  </style>
  <div id="root" data-composition-id="ticker" data-width="1920" data-height="1080" data-layout-allow-overlap>
    {''.join(tick_body)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {chr(10).join('    ' + j for j in tick_js)}
    window.__timelines["ticker"] = tl;
  </script>
</template>
"""
with open('compositions/ticker.html', 'w', encoding='utf8', newline='\n') as f:
    f.write(ticker)

# --- sound -----------------------------------------------------------------------------------
LEN = {'pop': 0.72, 'click': 0.366, 'whoosh': 0.575, 'whoosh-short': 0.575, 'impact-bass-1': 2.116, 'impact-bass-2': 2.592, 'riser': 10.032}
PEAK = {'pop': 0.122, 'click': 0.053, 'whoosh': 0.165, 'whoosh-short': 0.165, 'impact-bass-1': 1.956, 'impact-bass-2': 2.066, 'riser': 3.036}
FRAME = 1 / FPS
grab_click = SCENE_AT[1] - EDGE + 1.5
speed_click = SCENE_AT[2] - EDGE + 1.2
flee_click = SCENE_AT[7] - EDGE + 1.31
cues = [
    ('pop', 0.65, 0.35),
    ('whoosh-short', SCENE_AT[1], 0.4),
    ('click', grab_click, 0.55),
    ('whoosh', SCENE_AT[2], 0.4),
    ('click', speed_click, 0.55),
    ('impact-bass-1', SCENE_AT[2] - EDGE + 1.5, 0.35),
    ('whoosh-short', SCENE_AT[3], 0.45),
    ('pop', SCENE_AT[3] + 0.45, 0.3),
    ('whoosh', SCENE_AT[4] - 0.1, 0.4),
    ('impact-bass-2', SCENE_AT[4] - EDGE + 2.27, 0.55),
    ('whoosh-short', SCENE_AT[5], 0.4),
    ('pop', SCENE_AT[5] + 0.5, 0.3),
    ('whoosh', SCENE_AT[5] - EDGE + 2.3, 0.35),
    ('pop', SCENE_AT[6] + 0.5, 0.3),
    ('riser', flee_click + 0.2, 0.3),
    ('click', flee_click, 0.55),
    ('pop', SCENE_AT[7] - EDGE + 1.5, 0.3),
    ('pop', SCENE_AT[8] - EDGE + 2.3, 0.35),
]
audio = [f'<audio id="music" class="clip" data-start="0" data-duration="{TOTAL}" data-track-index="30" src="assets/audio/music.mp3" data-volume="0.9"></audio>']
for n, (name, hit, vol) in enumerate(cues):
    start = max(0, round(hit - PEAK[name] + FRAME, 3))
    audio.append(f'<audio id="sfx-{n + 1}" class="clip" data-start="{start}" data-duration="{LEN[name]}" data-track-index="{31 + n}" src="assets/sfx/{name}.mp3" data-volume="{vol}"></audio>')

host_html = '\n'.join(
    f'      <div id="{sid}" class="clip" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" '
    f'data-start="{s}" data-duration="{d}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:{z}"></div>'
    for sid, s, d, z in hosts)
variables = [{'id': 'url', 'type': 'string', 'label': 'Game URL', 'default': 'tanvirhafiz.github.io/kalo-taka'}] + \
    [{'id': h[0], 'type': 'string', 'label': f'Ticker headline {h[0][1:]}', 'default': h[3]} for h in HEAD]
index = f"""<!doctype html>
<html lang="en" data-composition-variables='{json.dumps(variables).replace("'", "&#39;")}'>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #f3e9d2; }}
      #bg {{ position: absolute; inset: 0; background: #f3e9d2; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL}" data-width="1920" data-height="1080">
      <div id="bg"></div>
{host_html}
      <div id="ticker" class="clip" data-composition-id="ticker" data-composition-src="compositions/ticker.html" data-start="0" data-duration="{round(SCENE_AT[8], 3)}" data-track-index="2" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:50"></div>
      {chr(10).join('      ' + a for a in audio).strip()}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
with open('index.html', 'w', encoding='utf8', newline='\n') as f:
    f.write(index)
print('scenes', [(h[0], h[1], h[2]) for h in hosts])
