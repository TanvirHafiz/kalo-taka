// Procedural housing ladder, tiers 1 to 7. Local space: ground at y = 0, x centred on the plot.
// Every random choice is seeded per building, per floor and per decor slot, so upgrades only add detail.
import { BALANCE } from '../../config/balance';
import { STRINGS } from '../../config/strings';
import type { Building } from '../../state/types';
import { buildingName } from '../../util/names';
import { hashSeed, mulberry32 } from '../../util/rng';
import { box, circle, ellipse, fitText, line, pick, poly, range, roundBox, type Ctx } from '../draw';
import {
  CLOTHES, CONCRETE, GLASS, GLASS_HI, GOLD, GOLD_DARK, GRILL, INK, LEAF, MARBLE, SIGN_BG, SLAB, TIN, WALLS, WATER, WATER_DARK,
} from '../palette';
import {
  ac, balconyRail, banner, brickWall, bucket, cat, corrugated, cow, dish, door, gate, goldGate, laundry, plant, plasticChair,
  pottedPalm, rebar, signboard, sittingPerson, tinRoof, tubeWell, waterTank, windowUnit, type GrillStyle, type Rng,
} from './common';

export interface Design {
  /** Half-width of the drawing in world units (for sprite bounds). */
  halfW: number;
  /** Height above ground in world units. */
  height: number;
  draw(ctx: Ctx): void;
}

/** RNG for one floor / slot, independent of every other slot. */
export function slotRng(seed: number, a: number, b = 0): Rng {
  return mulberry32(hashSeed(seed, a + 1, b + 1));
}

/**
 * Whether decor slot (a, b) is visible at this level. Each slot has a fixed threshold,
 * so raising the level only ever adds decor, never removes or moves it.
 */
export function decorVisible(seed: number, a: number, b: number, level: number): boolean {
  const t = hashSeed(seed, a + 101, b + 7) / 4294967296;
  return t < level / BALANCE.maxLevel;
}

/** Floors for a To-Let Bhaban: 6, plus 1 per 3 levels (spec). */
export function toLetFloors(level: number): number {
  return 6 + Math.floor(level / 3);
}

const GRILLS: GrillStyle[] = ['bars', 'grid', 'diamond'];

export function housingDesign(b: Building, seed: number): Design {
  switch (b.tier) {
    case 1: return tinShed(b, seed);
    case 2: return semiPucca(b, seed);
    case 3: return dotola(b, seed);
    case 4: return toLet(b, seed);
    case 5: return duplex(b, seed);
    case 6: return palace(b, seed);
    default: return skyTower(b, seed);
  }
}

// ---------------------------------------------------------------------------------------------
// Tier 1: Tin-Shed Ghor. One room, tin roof, a clothesline.
function tinShed(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const wall = pick(rng, TIN);
  const roof = pick(rng, TIN);
  const curtain = pick(rng, CLOTHES);
  const show = (j: number) => decorVisible(seed, 1, j, b.level);
  return {
    halfW: 72,
    height: 64,
    draw(ctx) {
      box(ctx, -50, -3, 82, 3, '#a98f69');
      corrugated(ctx, -46, -40, 74, 37, wall);
      if (b.level >= 4) box(ctx, -46, -22, 74, 3, pick(slotRng(seed, 9), CLOTHES), false);
      door(ctx, -6, -3, 15, 27, '#4a3b30', curtain);
      windowUnit(ctx, -38, -33, 13, 11, { grill: 'bars', grillColor: '#3b2a20', frame: '#d8cbb3' });
      tinRoof(ctx, -46, 28, -40, 17, roof, slotRng(seed, 2));
      // clothesline on bamboo
      line(ctx, 36, 0, 36, -32, '#9c7a43', 2.5);
      line(ctx, 66, 0, 66, -32, '#9c7a43', 2.5);
      laundry(ctx, 36, 66, -30, slotRng(seed, 3), show(6) ? 3 : 2);
      if (show(0)) tubeWell(ctx, -62, 0);
      if (show(1)) plant(ctx, -54, 0);
      if (show(2)) bucket(ctx, 16, 0, pick(slotRng(seed, 4), ['#2a9d8f', '#e63946', '#ffd166']));
      if (show(3)) plasticChair(ctx, 46, 0, '#d94040');
      if (show(4)) cat(ctx, -18, -48);
      if (show(5)) dish(ctx, 12, -51);
      if (show(7)) plant(ctx, 72, 0);
      if (b.level >= BALANCE.maxLevel) signboard(ctx, -10, -50, 40, 9, buildingName(seed, 'housing'), pick(slotRng(seed, 5), SIGN_BG), -0.06);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Tier 2: Semi-Pucca Bari. Brick walls, tin roof, a cow optional.
function semiPucca(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const plaster = pick(rng, WALLS);
  const roof = pick(rng, TIN);
  const grillColor = pick(rng, GRILL);
  const hasCow = rng() < 0.5;
  const show = (j: number) => decorVisible(seed, 1, j, b.level);
  return {
    halfW: 76,
    height: 78,
    draw(ctx) {
      box(ctx, -58, -4, 104, 4, '#a98f69');
      brickWall(ctx, -54, -30, 96, 26);
      box(ctx, -54, -52, 96, 22, plaster);
      if (b.level >= 4) box(ctx, -54, -34, 96, 4, pick(slotRng(seed, 9), CLOTHES), false);
      // hip roof
      poly(ctx, [-62, -51, 50, -51, 36, -70, -48, -70], roof);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -56; x < 46; x += 4) {
        ctx.moveTo(x, -52);
        ctx.lineTo(x + 2, -69);
      }
      ctx.stroke();
      ctx.restore();
      door(ctx, -12, -4, 18, 34, '#3b6e8f');
      windowUnit(ctx, -44, -46, 15, 15, { grill: 'grid', grillColor, frame: '#efe7d6' });
      windowUnit(ctx, 18, -46, 15, 15, { grill: 'grid', grillColor, frame: '#efe7d6', curtain: pick(slotRng(seed, 2), CLOTHES) });
      if (hasCow) cow(ctx, 48, 0);
      else {
        ellipse(ctx, 62, -8, 13, 9, '#e4c35a');
        line(ctx, 52, -10, 72, -12, '#c9a63c', 1);
      }
      if (show(0)) plant(ctx, -64, 0);
      if (show(1)) bucket(ctx, 12, 0, '#e63946');
      if (show(2)) cat(ctx, -30, -71);
      if (show(3)) dish(ctx, 24, -71);
      if (show(4)) laundry(ctx, -50, -20, -56, slotRng(seed, 3), 2);
      if (show(5)) plasticChair(ctx, -32, -4, '#2a9d8f');
      if (show(6)) plant(ctx, 46, -52);
      if (b.level >= 7) signboard(ctx, -3, -60, 46, 9, buildingName(seed, 'housing'), pick(slotRng(seed, 5), SIGN_BG), 0.03);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Tier 3: Rod-Wala Dotola. Two floors, rebar sticking out of the roof "for future floors".
function dotola(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const wall = pick(rng, WALLS);
  const grillColor = pick(rng, GRILL);
  const grill = pick(rng, GRILLS);
  const sign = pick(rng, SIGN_BG);
  const name = buildingName(seed, 'housing');
  const show = (f: number, j: number) => decorVisible(seed, f, j, b.level);
  return {
    halfW: 72,
    height: 112,
    draw(ctx) {
      const x0 = -58;
      const w = 116;
      box(ctx, x0, -36, w, 36, wall);
      box(ctx, x0, -74, w, 38, wall);
      if (b.level >= 4) box(ctx, x0, -46, w, 3, pick(slotRng(seed, 9), CLOTHES), false);
      box(ctx, x0 - 3, -39, w + 6, 4, SLAB);
      box(ctx, x0 - 3, -77, w + 6, 4, SLAB);
      box(ctx, x0, -85, w, 8, wall);
      // ground floor
      gate(ctx, x0 + 6, 0, 30, 28, '#2e6f5e');
      windowUnit(ctx, -12, -28, 16, 14, { grill, grillColor });
      door(ctx, 18, 0, 16, 28, '#7a4b2a');
      // first floor: window, balcony, window
      windowUnit(ctx, x0 + 8, -66, 16, 16, { grill, grillColor, curtain: pick(slotRng(seed, 2, 0), CLOTHES) });
      box(ctx, -14, -70, 30, 31, '#6c6257');
      door(ctx, -6, -40, 14, 24, '#a3683a');
      balconyRail(ctx, -18, -54, 38, 15, grillColor);
      windowUnit(ctx, 32, -66, 16, 16, { grill, grillColor });
      rebar(ctx, x0 + 2, x0 + w - 2, -85, slotRng(seed, 4));
      waterTank(ctx, 22, -85);
      signboard(ctx, -18, -81, 56, 9, name, sign);
      if (show(2, 0)) laundry(ctx, -16, 18, -54, slotRng(seed, 3), 3);
      if (show(2, 1)) ac(ctx, x0 + 25, -64);
      if (show(2, 2)) ac(ctx, 50, -64);
      if (show(2, 3)) plant(ctx, 16, -40);
      if (show(1, 0)) plant(ctx, -66, 0);
      if (show(1, 1)) ac(ctx, 6, -26);
      if (show(3, 0)) dish(ctx, -46, -85);
      if (show(3, 1)) cat(ctx, 48, -85);
      if (show(1, 2)) plasticChair(ctx, 40, 0, '#d94040');
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Tier 4: To-Let Bhaban. Six floors plus one per three levels, To-Let banner, grills everywhere.
function toLet(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const wall = pick(rng, WALLS);
  const accent = pick(rng, WALLS.filter((c) => c !== wall));
  const grillColor = pick(rng, GRILL);
  const grill = pick(rng, GRILLS);
  const floors = toLetFloors(b.level);
  const fh = 24;
  const groundH = 32;
  const top = -(groundH + floors * fh);
  const bannerFloor = 1 + Math.floor(slotRng(seed, 50)() * Math.min(4, floors));
  const name = buildingName(seed, 'housing');
  return {
    halfW: 72,
    height: -top + 40,
    draw(ctx) {
      const x0 = -60;
      const w = 120;
      // ground floor: garage gate and guard window
      box(ctx, x0, -groundH, w, groundH, CONCRETE);
      gate(ctx, x0 + 6, 0, 56, 26, '#2e6f5e', false);
      windowUnit(ctx, 14, -24, 14, 12, { grill: 'bars', grillColor });
      door(ctx, 34, 0, 18, 26, '#7a4b2a');
      signboard(ctx, -2, -29, 72, 9, name, pick(rng, SIGN_BG));
      // upper floors
      for (let f = 0; f < floors; f++) {
        const fy = -groundH - (f + 1) * fh;
        const fr = slotRng(seed, 10 + f);
        box(ctx, x0, fy, w, fh, wall);
        if (b.level >= 4) box(ctx, x0, fy + fh - 6, w, 2, accent, false);
        windowUnit(ctx, x0 + 6, fy + 5, 18, 13, { grill, grillColor, curtain: fr() < 0.5 ? pick(fr, CLOTHES) : null });
        // recessed balcony
        box(ctx, -18, fy + 3, 40, fh - 3, '#6c6257');
        box(ctx, -8, fy + 5, 12, fh - 5, '#a3683a', false);
        balconyRail(ctx, -20, fy + 11, 44, 13, grillColor);
        windowUnit(ctx, 30, fy + 5, 18, 13, { grill, grillColor });
        // stairwell lattice strip
        box(ctx, 52, fy, 8, fh, accent);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let ly = fy + 3; ly < fy + fh - 2; ly += 5) for (let lx = 53.5; lx < 59; lx += 3) ctx.fillRect(lx, ly, 1.6, 2.5);
        box(ctx, x0 - 2, fy + fh - 2, w + 4, 3, SLAB);
        const show = (j: number) => decorVisible(seed, 10 + f, j, b.level);
        if (show(0)) laundry(ctx, -16, 20, fy + 8, slotRng(seed, 30 + f), 3);
        else if (show(1)) plant(ctx, 14, fy + fh - 2);
        if (show(2)) ac(ctx, x0 - 10, fy + 6);
        if (show(3)) ac(ctx, 50 - 2, fy + 2);
        if (f === bannerFloor) banner(ctx, x0 + 3, fy + fh - 3, 26, 11, STRINGS.art.toLet);
      }
      // roof
      box(ctx, x0, top - 7, w, 7, wall);
      waterTank(ctx, -40, top - 7);
      waterTank(ctx, -14, top - 7, '#3c5a7a');
      if (slotRng(seed, 60)() < 0.6) rebar(ctx, 14, 56, top - 7, slotRng(seed, 61));
      if (decorVisible(seed, 70, 0, b.level)) dish(ctx, 30, top - 7);
      if (decorVisible(seed, 70, 1, b.level)) plant(ctx, 50, top - 7);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Tier 5: Duplex Mansion. Marble front, gold gate, two security guards asleep.
function duplex(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const trim = pick(rng, ['#c9a227', '#7a8c6e', '#8c5a3c']);
  const name = buildingName(seed, 'housing');
  const show = (j: number) => decorVisible(seed, 1, j, b.level);
  return {
    halfW: 76,
    height: 150,
    draw(ctx) {
      const x0 = -66;
      const w = 132;
      // body: two tall floors and a terrace
      box(ctx, x0, -46, w, 46, MARBLE);
      box(ctx, x0 + 8, -98, w - 16, 52, MARBLE);
      // marble veins
      ctx.strokeStyle = 'rgba(120,110,100,0.35)';
      ctx.lineWidth = 0.8;
      const vr = slotRng(seed, 5);
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const vx = range(vr, x0 + 4, x0 + w - 20);
        const vy = range(vr, -95, -6);
        ctx.moveTo(vx, vy);
        ctx.quadraticCurveTo(vx + 6, vy + 4, vx + 14, vy + range(vr, -3, 6));
      }
      ctx.stroke();
      box(ctx, x0 - 3, -49, w + 6, 4, SLAB);
      box(ctx, x0 + 5, -101, w - 10, 4, SLAB);
      // arched windows
      const arch = (x: number, y: number, ww: number, hh: number) => {
        ctx.beginPath();
        ctx.moveTo(x, y + hh);
        ctx.lineTo(x, y + ww / 2);
        ctx.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0);
        ctx.lineTo(x + ww, y + hh);
        ctx.closePath();
        ctx.fillStyle = GLASS;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = trim;
        ctx.stroke();
        line(ctx, x + ww / 2, y + 2, x + ww / 2, y + hh, trim, 1.2);
      };
      for (const wx of [-52, -24, 12, 40]) arch(wx, -88, 14, 30);
      // columns and portico
      for (const cx of [-60, -36, 30, 54]) {
        box(ctx, cx, -44, 6, 44, '#ffffff');
        box(ctx, cx - 2, -46, 10, 3, '#ffffff');
      }
      box(ctx, -18, -44, 36, 44, '#efe9dc');
      door(ctx, -10, 0, 20, 34, '#5a3a22');
      line(ctx, 0, -34, 0, 0, INK, 1);
      // balcony with gold rail
      balconyRail(ctx, -26, -64, 52, 15, GOLD);
      // terrace rail and umbrella
      balconyRail(ctx, x0 + 8, -110, w - 16, 10, '#ffffff');
      if (show(0)) {
        line(ctx, 30, -100, 30, -124, INK, 1.5);
        poly(ctx, [14, -122, 46, -122, 30, -132], pick(slotRng(seed, 7), ['#e63946', '#2a9d8f', '#f4a261']));
      }
      signboard(ctx, 0, -40, 50, 8, name, GOLD);
      // boundary wall with gold gate
      box(ctx, -74, -12, 46, 12, '#f1e9da');
      box(ctx, 28, -12, 46, 12, '#f1e9da');
      goldGate(ctx, -28, 0, 56, 22);
      sittingPerson(ctx, -64, 0, '#3a5f8a', slotRng(seed, 8), true);
      sittingPerson(ctx, 52, 0, '#3a5f8a', slotRng(seed, 9), true);
      if (show(1)) pottedPalm(ctx, -72, -12);
      if (show(2)) pottedPalm(ctx, 72, -12);
      if (show(3)) ac(ctx, 50, -80);
      if (show(4)) ac(ctx, -66, -80);
      if (show(5)) dish(ctx, -40, -110);
      if (show(6)) {
        // CCTV that films the sleeping guards
        box(ctx, 58, -46, 8, 4, '#e8e8e8');
        line(ctx, 62, -46, 62, -50, INK, 1.2);
      }
      if (show(7)) plant(ctx, -14, -64);
      if (show(8)) plant(ctx, 14, -64);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Tier 6: Lake View Palace. The lake is a filled-in pond with a fountain.
function palace(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const wall = pick(rng, ['#f7d6c9', '#f3e2b8', '#d9ecdf', '#e3d7f2']);
  const dome = pick(rng, [GOLD, '#4fb3a9', '#e9eef2']);
  const show = (j: number) => decorVisible(seed, 1, j, b.level);
  return {
    halfW: 78,
    height: 236,
    draw(ctx) {
      // side wings
      for (const sx of [-72, 34]) {
        box(ctx, sx, -110, 38, 110, wall);
        for (let r = 0; r < 3; r++) {
          for (const wx of [sx + 6, sx + 22]) {
            const y = -100 + r * 34;
            box(ctx, wx - 1, y - 1, 12, 20, '#ffffff');
            box(ctx, wx, y + 5, 10, 14, GLASS, false);
            ctx.beginPath();
            ctx.arc(wx + 5, y + 5, 5, Math.PI, 0);
            ctx.fillStyle = GLASS;
            ctx.fill();
          }
        }
        box(ctx, sx - 2, -114, 42, 5, SLAB);
        ctx.beginPath();
        ctx.ellipse(sx + 19, -114, 14, 16, 0, Math.PI, 0);
        ctx.fillStyle = dome;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
        line(ctx, sx + 19, -130, sx + 19, -138, INK, 1.5);
      }
      // central block
      box(ctx, -34, -160, 68, 160, wall);
      for (let r = 0; r < 4; r++) {
        const y = -150 + r * 36;
        for (const wx of [-26, -6, 14]) {
          box(ctx, wx - 1, y - 1, 14, 24, '#ffffff');
          box(ctx, wx, y + 6, 12, 17, GLASS, false);
          ctx.beginPath();
          ctx.arc(wx + 6, y + 6, 6, Math.PI, 0);
          ctx.fillStyle = GLASS;
          ctx.fill();
          line(ctx, wx + 6, y, wx + 6, y + 23, '#ffffff', 1);
        }
        box(ctx, -36, y + 26, 72, 3, SLAB);
      }
      // grand dome with spire
      box(ctx, -30, -168, 60, 8, SLAB);
      ctx.beginPath();
      ctx.moveTo(-26, -168);
      ctx.bezierCurveTo(-30, -200, -6, -206, 0, -222);
      ctx.bezierCurveTo(6, -206, 30, -200, 26, -168);
      ctx.closePath();
      ctx.fillStyle = dome;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      line(ctx, 0, -222, 0, -234, INK, 1.5);
      circle(ctx, 0, -235, 2.5, GOLD);
      // entrance arch
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(-12, -26);
      ctx.arc(0, -26, 12, Math.PI, 0);
      ctx.lineTo(12, 0);
      ctx.closePath();
      ctx.fillStyle = '#5a3a22';
      ctx.fill();
      ctx.stroke();
      signboard(ctx, 0, -48, 56, 9, buildingName(seed, 'housing'), GOLD_DARK);
      // the "lake": a filled-in pond with a fountain
      ellipse(ctx, 0, -3, 46, 6, WATER);
      ellipse(ctx, 0, -3, 30, 3.5, WATER_DARK, false);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const dx of [-14, 14]) {
        ctx.moveTo(0, -6);
        ctx.quadraticCurveTo(dx * 0.4, -30, dx, -8);
      }
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -30);
      ctx.stroke();
      if (show(0)) pottedPalm(ctx, -62, 0);
      if (show(1)) pottedPalm(ctx, 62, 0);
      if (show(2)) ac(ctx, -78, -90);
      if (show(3)) ac(ctx, 68, -56);
      if (show(4)) dish(ctx, 46, -114);
      if (show(5)) {
        // fountain lights
        for (const dx of [-30, -10, 10, 30]) circle(ctx, dx, -5, 1.6, '#ffe066', false);
      }
      if (show(6)) {
        // a lone duck that did not relocate
        ellipse(ctx, 30, -6, 4, 2.5, '#ffffff');
        circle(ctx, 33, -9, 1.8, '#ffffff');
        poly(ctx, [34.5, -9, 37, -8.5, 34.5, -8], '#f4a261', false);
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Tier 7: Sky Tower. Thirty floors, a helipad nobody uses, own name in neon.
function skyTower(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const glass = pick(rng, [GLASS, '#3f7a80', '#5a5f8a']);
  const neon = pick(rng, ['#ff4fa3', '#3ff0ff', '#b6ff3b']);
  const name = buildingName(seed, 'housing');
  const floors = 30;
  const fh = 9;
  const podium = 40;
  const towerTop = -(podium + floors * fh);
  return {
    halfW: 76,
    height: -towerTop + 64,
    draw(ctx) {
      // podium with lobby
      box(ctx, -70, -podium, 140, podium, CONCRETE);
      box(ctx, -40, -30, 80, 30, GLASS_HI);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -40; x < 40; x += 10) {
        ctx.moveTo(x, -30);
        ctx.lineTo(x, 0);
      }
      ctx.stroke();
      box(ctx, -46, -34, 92, 5, '#e8e1d3');
      // tower glass
      const x0 = -46;
      const w = 92;
      box(ctx, x0, towerTop, w, floors * fh, glass);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, towerTop, w, floors * fh);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (const off of [10, 46]) {
        ctx.beginPath();
        ctx.moveTo(x0 + off, -podium);
        ctx.lineTo(x0 + off + 60, towerTop);
        ctx.lineTo(x0 + off + 80, towerTop);
        ctx.lineTo(x0 + off + 20, -podium);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(20,30,45,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let f = 1; f < floors; f++) {
        ctx.moveTo(x0, -podium - f * fh);
        ctx.lineTo(x0 + w, -podium - f * fh);
      }
      for (let x = x0 + 11.5; x < x0 + w; x += 11.5) {
        ctx.moveTo(x, towerTop);
        ctx.lineTo(x, -podium);
      }
      ctx.stroke();
      // sky gardens appear with levels
      for (let g = 0; g < 4; g++) {
        if (!decorVisible(seed, 20, g, b.level)) continue;
        const gf = 5 + g * 6;
        const gy = -podium - gf * fh;
        ctx.fillStyle = LEAF;
        ctx.fillRect(x0, gy, w, 3);
        for (let tx = x0 + 6; tx < x0 + w; tx += 12) circle(ctx, tx, gy - 1, 3, LEAF, false);
      }
      ctx.restore();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.strokeRect(x0, towerTop, w, floors * fh);
      // crown and helipad
      box(ctx, -40, towerTop - 18, 80, 18, '#23262d');
      box(ctx, -52, towerTop - 21, 104, 5, '#59606b');
      for (let x = -48; x < 52; x += 8) box(ctx, x, towerTop - 21, 4, 2, '#ffd23f', false);
      roundBox(ctx, -6, towerTop - 30, 12, 9, 2, '#ffd23f');
      fitText(ctx, STRINGS.art.helipad, 0, towerTop - 25.5, 10, 8, INK);
      line(ctx, 40, towerTop - 21, 40, towerTop - 54, INK, 1.5);
      circle(ctx, 40, towerTop - 56, 2.5, '#ff3b3b', false);
      // neon name, the most important feature
      ctx.save();
      ctx.shadowColor = neon;
      ctx.shadowBlur = b.level >= 5 ? 8 : 3;
      ctx.font = `800 13px "Baloo 2", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let size = 13;
      while (size > 6 && ctx.measureText(name.toUpperCase()).width > 68) {
        size -= 0.5;
        ctx.font = `800 ${size}px "Baloo 2", sans-serif`;
      }
      ctx.fillStyle = neon;
      ctx.fillText(name.toUpperCase(), 0, towerTop - 8);
      ctx.restore();
      if (decorVisible(seed, 30, 0, b.level)) pottedPalm(ctx, -62, -0);
      if (decorVisible(seed, 30, 1, b.level)) pottedPalm(ctx, 62, -0);
      if (decorVisible(seed, 30, 2, b.level)) dish(ctx, -26, towerTop - 21);
    },
  };
}
