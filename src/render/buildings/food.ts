// Food ladder, tiers 1 to 5. Local space: ground at y = 0, x centred on the plot.
import { VISUAL } from '../../config/balance';
import { STRINGS } from '../../config/strings';
import type { Building } from '../../state/types';
import { buildingName } from '../../util/names';
import { addWindowLight, box, circle, ellipse, line, pick, poly, roundBox } from '../draw';
import { CLOTHES, CONCRETE, GLASS, GOLD, GRILL, SIGN_BG, SKIN, SLAB, WALLS } from '../palette';
import {
  ac, balconyRail, bucket, door, fairyLights, glassGrid, glowText, logoBadge, openShop, plant, plasticChair, pottedPalm,
  signboard, standingPerson, steam, tarp, waterTank, windowUnit,
} from './common';
import { decorVisible, slotRng, type Design } from './housing';

export function foodDesign(b: Building, seed: number): Design {
  switch (b.tier) {
    case 1: return teaStall(b, seed);
    case 2: return biryaniHouse(b, seed);
    case 3: return rooftopCafe(b, seed);
    case 4: return buffetPalace(b, seed);
    default: return franchise(b, seed);
  }
}

const show = (seed: number, level: number) => (j: number) => decorVisible(seed, 1, j, level);

// Tier 1: Tong Tea Stall. Bench, kettle, hanging banana bunch.
function teaStall(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const tarpColor = pick(rng, ['#3d6fa3', '#e07a5f', '#4f7c6b', '#e9c46a']);
  const s = show(seed, b.level);
  return {
    halfW: 72,
    height: 70,
    draw(ctx) {
      line(ctx, -40, 0, -40, -44, '#9c7a43', 3);
      line(ctx, 40, 0, 40, -44, '#9c7a43', 3);
      tarp(ctx, -50, 50, -42, 12, tarpColor);
      box(ctx, -30, -26, 46, 26, '#a3683a');
      box(ctx, -33, -29, 52, 4, SLAB);
      // kettle, jars and the hanging banana bunch
      circle(ctx, -22, -35, 6, '#b8b8b8');
      line(ctx, -16, -36, -11, -40, '#3a2e25', 1.4);
      steam(ctx, -22, -46, 2);
      for (const jx of [-8, 0, 8]) box(ctx, jx, -38, 6, 9, pick(rng, ['#e9c46a', '#e07a5f', '#f5efe2']));
      line(ctx, 26, -42, 26, -36, '#3a2e25', 1);
      for (let i = 0; i < 5; i++) ellipse(ctx, 23 + (i % 3) * 3, -32 + Math.floor(i / 3) * 4, 2, 4, '#e9c46a');
      signboard(ctx, -6, -62, 44, 11, STRINGS.art.cha, pick(rng, SIGN_BG), -0.04);
      line(ctx, -20, -56, -20, -54, '#3a2e25', 1);
      line(ctx, 8, -56, 8, -54, '#3a2e25', 1);
      // bench with a customer
      box(ctx, 22, -10, 30, 3, '#7a5236');
      line(ctx, 25, -7, 25, 0, '#7a5236', 2);
      line(ctx, 49, -7, 49, 0, '#7a5236', 2);
      standingPerson(ctx, 32, -10, pick(rng, CLOTHES), pick(rng, SKIN), '#3d6fa3');
      if (s(0)) standingPerson(ctx, 42, -10, pick(rng, CLOTHES), pick(rng, SKIN), '#4f7c6b');
      if (s(1)) plasticChair(ctx, -48, 0, '#d94040');
      if (s(2)) bucket(ctx, -40, 0, '#2a9d8f');
      if (s(3)) box(ctx, -44, -9, 10, 6, '#3a3f4a');
      if (s(4)) fairyLights(ctx, -48, 48, -38, 3);
      if (s(5)) box(ctx, 60, -10, 14, 3, '#7a5236');
      if (s(6)) plant(ctx, 66, 0);
    },
  };
}

// Tier 2: Biryani House. Big pot, steam, a queue.
function biryaniHouse(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const wall = pick(rng, WALLS);
  const s = show(seed, b.level);
  return {
    halfW: 76,
    height: 96,
    draw(ctx) {
      box(ctx, -58, -62, 116, 62, wall);
      box(ctx, -61, -66, 122, 5, SLAB);
      openShop(ctx, -50, 0, 52, 40, slotRng(seed, 3), ['#e9c46a', '#c47a4f', '#f5efe2']);
      windowUnit(ctx, 14, -54, 16, 13, { grill: 'bars', grillColor: pick(rng, GRILL) });
      windowUnit(ctx, 36, -54, 16, 13, { grill: 'bars', grillColor: pick(rng, GRILL) });
      door(ctx, 30, 0, 18, 30, '#7a4b2a');
      signboard(ctx, 0, -74, 92, 13, buildingName(seed, 'food'), pick(rng, SIGN_BG));
      // the deg: big copper pot on a stand, lid and steam
      line(ctx, -60, 0, -56, -10, '#3a2e25', 2);
      line(ctx, -36, 0, -40, -10, '#3a2e25', 2);
      ellipse(ctx, -48, -18, 16, 10, '#b87333');
      ellipse(ctx, -48, -27, 13, 3, '#a0602a');
      steam(ctx, -48, -36, 3);
      // the queue
      const q = 2 + (s(0) ? 1 : 0) + (s(1) ? 1 : 0) + (s(2) ? 1 : 0);
      for (let i = 0; i < q; i++) standingPerson(ctx, 60 + i * 8, 0, pick(rng, CLOTHES), pick(rng, SKIN), pick(rng, ['#3d6fa3', '#4f7c6b', '#3a3f58']));
      if (s(3)) signboard(ctx, -24, -50, 40, 9, STRINGS.art.biryani, '#c8553d', 0.03);
      if (s(4)) ac(ctx, 52, -48);
      if (s(5)) ellipse(ctx, -70, -10, 8, 6, '#b87333');
      if (s(6)) plant(ctx, 8, -66);
    },
  };
}

// Tier 3: Rooftop Cafe. Fairy lights, plastic plants, a guitar nobody plays.
function rooftopCafe(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const wall = pick(rng, WALLS);
  const grillColor = pick(rng, GRILL);
  const s = show(seed, b.level);
  return {
    halfW: 74,
    height: 150,
    draw(ctx) {
      for (let f = 0; f < 3; f++) {
        const y = -(f + 1) * 34;
        box(ctx, -58, y, 116, 34, wall);
        windowUnit(ctx, -48, y + 8, 18, 14, { grill: 'grid', grillColor });
        windowUnit(ctx, -14, y + 8, 18, 14, { grill: 'grid', grillColor, curtain: pick(rng, CLOTHES) });
        windowUnit(ctx, 22, y + 8, 18, 14, { grill: 'grid', grillColor });
        box(ctx, -60, y + 31, 120, 3, SLAB);
      }
      // the cafe on the roof
      box(ctx, -60, -106, 120, 4, SLAB);
      balconyRail(ctx, -58, -118, 116, 12, '#f5efe2');
      box(ctx, -40, -134, 30, 28, '#c8553d');
      signboard(ctx, 18, -128, 70, 12, buildingName(seed, 'food'), pick(rng, SIGN_BG));
      fairyLights(ctx, -56, 56, -140, 6);
      line(ctx, -56, -140, -56, -106, '#9c7a43', 1.6);
      line(ctx, 56, -140, 56, -106, '#9c7a43', 1.6);
      // tables and umbrella
      line(ctx, 10, -106, 10, -124, '#3a2e25', 1.2);
      poly(ctx, [-4, -122, 24, -122, 10, -131], '#e9c46a');
      box(ctx, 2, -112, 16, 2, '#f5efe2');
      // guitar nobody plays
      ellipse(ctx, 44, -110, 4, 5, '#a0602a');
      line(ctx, 44, -114, 46, -126, '#7a5236', 1.6);
      pottedPalm(ctx, -50, -106);
      door(ctx, -10, 0, 20, 30, '#7a4b2a');
      if (s(0)) pottedPalm(ctx, 52, -106);
      if (s(1)) plasticChair(ctx, 20, -106, '#90be6d');
      if (s(2)) ac(ctx, 50, -94);
      if (s(3)) ac(ctx, -72, -60);
      if (s(4)) plant(ctx, -24, -106);
      if (s(5)) waterTank(ctx, -30, -140);
      if (s(6)) standingPerson(ctx, 30, -106, pick(rng, CLOTHES), pick(rng, SKIN));
    },
  };
}

// Tier 4: Buffet Palace. "All You Can Eat" sign.
function buffetPalace(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const wall = pick(rng, ['#f2cc8f', '#e07a5f', '#efe1c6']);
  const s = show(seed, b.level);
  return {
    halfW: 78,
    height: 168,
    draw(ctx) {
      box(ctx, -66, -120, 132, 120, wall);
      glassGrid(ctx, -56, -40, 112, 36, 8, 2, '#7d98a6', 1);
      for (let f = 0; f < 2; f++) {
        const y = -112 + f * 36;
        for (let x = -54; x < 54; x += 22) {
          box(ctx, x - 1, y - 1, 16, 22, GOLD);
          box(ctx, x + 1, y + 1, 12, 18, GLASS, false);
          addWindowLight(ctx, x + 1, y + 1, 12, 18, VISUAL.litWindowShare + 0.2);
        }
        box(ctx, -68, y + 26, 136, 3, SLAB);
      }
      box(ctx, -70, -124, 140, 6, GOLD);
      // the big banner
      roundBox(ctx, -62, -150, 124, 22, 3, '#c8553d');
      glowText(ctx, STRINGS.art.buffet, 0, -139, 116, 13, '#fff1c2');
      signboard(ctx, 0, -48, 76, 10, buildingName(seed, 'food'), GOLD);
      door(ctx, -12, 0, 24, 30, '#5a3a22');
      for (let i = 0; i < 3; i++) standingPerson(ctx, -36 + i * 9, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(0)) pottedPalm(ctx, -72, 0);
      if (s(1)) pottedPalm(ctx, 72, 0);
      if (s(2)) ac(ctx, 66, -90);
      if (s(3)) ac(ctx, -80, -90);
      if (s(4)) fairyLights(ctx, -66, 66, -126, 4);
      if (s(5)) for (let i = 0; i < 2; i++) standingPerson(ctx, 30 + i * 9, 0, pick(rng, CLOTHES), pick(rng, SKIN));
    },
  };
}

// Tier 5: Franchise Empire. Same logo on three floors.
function franchise(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const brand = pick(rng, ['#c8553d', '#3d6fa3', '#4f7c6b', '#a8466e']);
  const name = buildingName(seed, 'food');
  const letter = name[0] ?? 'K';
  const s = show(seed, b.level);
  return {
    halfW: 74,
    height: 232,
    draw(ctx) {
      const floors = 6;
      for (let f = 0; f < floors; f++) {
        const y = -(f + 1) * 34;
        box(ctx, -58, y, 116, 34, f % 2 ? '#f5efe2' : '#efe1c6');
        glassGrid(ctx, -50, y + 6, 70, 20, 5, 1, '#7d98a6', VISUAL.litWindowShare);
        if (f % 2 === 0) logoBadge(ctx, 38, y + 17, 11, brand, letter);
        box(ctx, -60, y + 31, 120, 3, brand);
      }
      box(ctx, -62, -210, 124, 8, brand);
      roundBox(ctx, -60, -228, 120, 18, 3, brand);
      glowText(ctx, name.toUpperCase(), 0, -219, 112, 12, '#fff1c2');
      // drive-thru lane at the side
      box(ctx, 58, -24, 14, 24, CONCRETE);
      box(ctx, 60, -20, 10, 8, '#e9c46a');
      door(ctx, -12, 0, 24, 28, '#2f3338');
      if (s(0)) pottedPalm(ctx, -70, 0);
      if (s(1)) fairyLights(ctx, -58, 58, -206, 3);
      if (s(2)) ac(ctx, -74, -120);
      if (s(3)) standingPerson(ctx, -30, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(4)) standingPerson(ctx, -40, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(5)) line(ctx, 50, -228, 50, -246, '#3a2e25', 1.4);
    },
  };
}
