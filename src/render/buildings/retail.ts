// Retail ladder, tiers 1 to 5. Local space: ground at y = 0, x centred on the plot.
import { VISUAL } from '../../config/balance';
import { STRINGS } from '../../config/strings';
import type { Building } from '../../state/types';
import { buildingName } from '../../util/names';
import { box, circle, ellipse, fitText, line, paperShape, pick, poly, roundBox } from '../draw';
import { CLOTHES, CONCRETE, GOLD, SIGN_BG, SKIN, SLAB, WALLS, WATER } from '../palette';
import { ac, fairyLights, glassGrid, glowText, openShop, pottedPalm, signboard, standingPerson, tarp } from './common';
import { decorVisible, slotRng, type Design } from './housing';

export function retailDesign(b: Building, seed: number): Design {
  switch (b.tier) {
    case 1: return hawker(b, seed);
    case 2: return bazaar(b, seed);
    case 3: return complex(b, seed);
    case 4: return megaMall(b, seed);
    default: return galaxyMall(b, seed);
  }
}

const show = (seed: number, level: number) => (j: number) => decorVisible(seed, 1, j, level);

// Tier 1: Footpath Hawker Spot. You rent out a footpath you do not own.
function hawker(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const s = show(seed, b.level);
  return {
    halfW: 72,
    height: 62,
    draw(ctx) {
      // plastic sheets on the ground with goods
      const sheets = 2 + (s(0) ? 1 : 0);
      for (let i = 0; i < sheets; i++) {
        const x = -60 + i * 42;
        box(ctx, x, -4, 38, 4, pick(rng, ['#3d6fa3', '#c8553d', '#4f7c6b']));
        for (let g = 0; g < 5; g++) box(ctx, x + 3 + g * 7, -10 - (g % 2) * 3, 5, 6 + (g % 2) * 3, pick(rng, CLOTHES));
      }
      // big umbrella
      line(ctx, -20, 0, -20, -46, '#3a2e25', 1.6);
      paperShape(ctx, pick(rng, ['#e07a5f', '#e9c46a', '#2a9d8f']), (c) => {
        c.beginPath();
        c.moveTo(-50, -42);
        c.quadraticCurveTo(-20, -66, 10, -42);
        c.closePath();
      });
      // hawker on a stool and the cheeky sign
      standingPerson(ctx, 34, -6, pick(rng, CLOTHES), pick(rng, SKIN));
      box(ctx, 30, -6, 8, 6, '#7a5236');
      signboard(ctx, 42, -38, 52, 10, STRINGS.art.sale, '#c8553d', 0.05);
      roundBox(ctx, 52, -22, 22, 12, 2, '#fffaf0');
      fitText(ctx, STRINGS.art.footpathRent, 63, -16, 20, 4, '#3a2e25');
      if (s(1)) standingPerson(ctx, -66, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(2)) standingPerson(ctx, 10, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(3)) box(ctx, -70, -20, 12, 16, '#e9c46a');
      if (s(4)) fairyLights(ctx, -50, 10, -44, 3);
    },
  };
}

// Tier 2: Bazaar. Tarp roofs, many tiny shops.
function bazaar(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const s = show(seed, b.level);
  return {
    halfW: 78,
    height: 90,
    draw(ctx) {
      box(ctx, -70, -58, 140, 58, pick(rng, WALLS));
      for (let i = 0; i < 4; i++) {
        const x = -66 + i * 33;
        openShop(ctx, x, 0, 29, 34, slotRng(seed, 10 + i), CLOTHES);
        tarp(ctx, x - 2, x + 31, -36, 8, pick(slotRng(seed, 20 + i), ['#c8553d', '#3d6fa3', '#e9c46a', '#4f7c6b', '#a8466e']));
        // goods hanging from the tarp
        for (let g = 0; g < 3; g++) box(ctx, x + 4 + g * 9, -33, 5, 9, pick(rng, CLOTHES));
      }
      signboard(ctx, 0, -68, 110, 14, buildingName(seed, 'retail'), pick(rng, SIGN_BG));
      for (let i = 0; i < 3; i++) standingPerson(ctx, -50 + i * 40 + (rng() - 0.5) * 10, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(0)) standingPerson(ctx, 64, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(1)) fairyLights(ctx, -70, 70, -58, 4);
      if (s(2)) ac(ctx, 56, -54);
      if (s(3)) standingPerson(ctx, -72, 0, pick(rng, CLOTHES), pick(rng, SKIN));
    },
  };
}

// Tier 3: Shopping Complex. The escalator is the main attraction.
function complex(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const s = show(seed, b.level);
  return {
    halfW: 76,
    height: 160,
    draw(ctx) {
      box(ctx, -64, -136, 128, 136, pick(rng, ['#efe1c6', '#f2cc8f', '#a8c5da']));
      glassGrid(ctx, -56, -128, 112, 120, 6, 4, '#7d98a6', VISUAL.litWindowShare + 0.1);
      // the escalator, shown off diagonally across the glass
      ctx.save();
      ctx.beginPath();
      ctx.rect(-56, -128, 112, 120);
      ctx.clip();
      poly(ctx, [-50, -8, -38, -8, 40, -100, 28, -100], '#9aa0a6');
      for (let i = 0; i < 9; i++) {
        const t = i / 9;
        line(ctx, -44 + t * 78, -8 - t * 92, -38 + t * 78, -8 - t * 92, '#3a2e25', 1);
      }
      ctx.restore();
      roundBox(ctx, -40, -152, 80, 16, 3, '#c8553d');
      glowText(ctx, STRINGS.art.escalator, 0, -144, 74, 11, '#fff1c2');
      signboard(ctx, 0, -14, 90, 12, buildingName(seed, 'retail'), pick(rng, SIGN_BG));
      for (let i = 0; i < 3; i++) standingPerson(ctx, -60 + i * 9, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(0)) pottedPalm(ctx, 68, 0);
      if (s(1)) ac(ctx, 64, -60);
      if (s(2)) ac(ctx, 64, -100);
      if (s(3)) standingPerson(ctx, 40, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(4)) fairyLights(ctx, -64, 64, -136, 3);
    },
  };
}

// Tier 4: Mega Mall. Glass, fountain, a cinema.
function megaMall(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const s = show(seed, b.level);
  return {
    halfW: 80,
    height: 196,
    draw(ctx) {
      glassGrid(ctx, -72, -170, 144, 170, 8, 6, pick(rng, ['#6f93a6', '#7d98a6', '#8aa1b6']), VISUAL.litWindowShare);
      box(ctx, -74, -174, 148, 6, SLAB);
      // cinema marquee
      roundBox(ctx, 10, -150, 58, 26, 3, '#2e3140');
      glowText(ctx, STRINGS.art.cinema, 39, -141, 52, 10, '#ffd27a');
      for (let x = 14; x < 66; x += 6) circle(ctx, x, -128, 1.3, '#ffd27a', false);
      roundBox(ctx, -70, -192, 140, 18, 3, '#3d6fa3');
      glowText(ctx, buildingName(seed, 'retail').toUpperCase(), 0, -183, 132, 12, '#fffaf0');
      // entrance fountain
      ellipse(ctx, -20, -3, 30, 5, WATER);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-20, -6);
      ctx.lineTo(-20, -22);
      ctx.moveTo(-20, -6);
      ctx.quadraticCurveTo(-26, -20, -32, -6);
      ctx.moveTo(-20, -6);
      ctx.quadraticCurveTo(-14, -20, -8, -6);
      ctx.stroke();
      box(ctx, 30, -30, 30, 30, '#2f3338');
      if (s(0)) pottedPalm(ctx, -66, 0);
      if (s(1)) pottedPalm(ctx, 66, 0);
      if (s(2)) for (let i = 0; i < 3; i++) standingPerson(ctx, 20 + i * 8, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(3)) fairyLights(ctx, -72, 72, -168, 4);
      if (s(4)) ac(ctx, -84, -100);
    },
  };
}

// Tier 5: Galaxy Mall. Indoor theme park, own flyover exit.
function galaxyMall(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const s = show(seed, b.level);
  return {
    halfW: 82,
    height: 262,
    draw(ctx) {
      // the flyover exit ramp, straight from the mall to the road
      poly(ctx, [-80, -6, -40, -96, -28, -96, -66, -6], CONCRETE);
      line(ctx, -78, -8, -38, -98, '#c8553d', 1.6);
      box(ctx, -60, -40, 4, 40, CONCRETE);
      fitText(ctx, STRINGS.art.flyover, -50, -70, 24, 6, '#3a2e25');
      // main body
      glassGrid(ctx, -40, -200, 116, 200, 7, 9, '#5f7f9a', VISUAL.litWindowShare);
      // dome with a roller coaster loop poking out
      paperShape(ctx, '#a8c5da', (c) => {
        c.beginPath();
        c.ellipse(18, -200, 54, 34, 0, Math.PI, 0);
        c.closePath();
      });
      ctx.strokeStyle = '#c8553d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(46, -236, 16, 0, Math.PI * 2);
      ctx.moveTo(-20, -200);
      ctx.quadraticCurveTo(10, -250, 30, -236);
      ctx.stroke();
      circle(ctx, 30, -250, 3.5, '#e9c46a');
      roundBox(ctx, -36, -196, 108, 16, 3, '#2e3140');
      glowText(ctx, STRINGS.art.themePark, 18, -188, 100, 9, '#f28482');
      roundBox(ctx, -38, -30, 112, 18, 3, GOLD);
      glowText(ctx, buildingName(seed, 'retail').toUpperCase(), 18, -21, 104, 12, '#fffaf0');
      if (s(0)) pottedPalm(ctx, 80, 0);
      if (s(1)) fairyLights(ctx, -36, 72, -204, 5);
      if (s(2)) for (let i = 0; i < 3; i++) standingPerson(ctx, 30 + i * 9, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(3)) circle(ctx, -20, -238, 3, '#e9c46a');
    },
  };
}
