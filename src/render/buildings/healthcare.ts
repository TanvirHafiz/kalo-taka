// Healthcare ladder, tiers 1 to 5. Local space: ground at y = 0, x centred on the plot.
import { VISUAL } from '../../config/balance';
import { STRINGS } from '../../config/strings';
import type { Building } from '../../state/types';
import { buildingName } from '../../util/names';
import { box, circle, ellipse, fitText, line, pick, roundBox } from '../draw';
import { CLOTHES, GOLD, GRILL, SKIN, SLAB } from '../palette';
import {
  ac, banner, crossSign, door, glassGrid, glowText, openShop, plant, plasticChair, pottedPalm, signboard, standingPerson,
  waterTank, windowUnit,
} from './common';
import { decorVisible, slotRng, type Design } from './housing';

export function healthcareDesign(b: Building, seed: number): Design {
  switch (b.tier) {
    case 1: return pharmacy(b, seed);
    case 2: return chamber(b, seed);
    case 3: return diagnostic(b, seed);
    case 4: return hospital(b, seed);
    default: return superSpecialty(b, seed);
  }
}

const show = (seed: number, level: number) => (j: number) => decorVisible(seed, 1, j, level);
const WHITE_WALLS = ['#f5efe2', '#e8f1ef', '#eef0f6'];
const MINT = '#9fc7b5';

// Tier 1: Pharmacy. Green cross, stethoscope logo.
function pharmacy(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const s = show(seed, b.level);
  return {
    halfW: 70,
    height: 84,
    draw(ctx) {
      box(ctx, -50, -52, 100, 52, pick(rng, WHITE_WALLS));
      box(ctx, -53, -56, 106, 5, MINT);
      openShop(ctx, -42, 0, 64, 40, slotRng(seed, 3), ['#e07a5f', '#a8c5da', '#f5efe2', '#90be6d', '#e9c46a']);
      box(ctx, -30, -12, 40, 12, '#cfe3ea');
      standingPerson(ctx, 34, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      signboard(ctx, -6, -66, 80, 14, buildingName(seed, 'healthcare'), '#4f7c6b');
      crossSign(ctx, 38, -40, 9);
      // stethoscope logo on the board
      circle(ctx, -40, -66, 3, '#f5efe2', false);
      if (s(0)) standingPerson(ctx, 44, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(1)) plasticChair(ctx, 52, 0, '#3d6fa3');
      if (s(2)) ac(ctx, 40, -24);
      if (s(3)) plant(ctx, -58, 0);
      if (s(4)) box(ctx, -58, -30, 8, 10, '#e9c46a');
      if (s(5)) plant(ctx, 44, -56);
    },
  };
}

// Tier 2: Doctor's Chamber. "Doctor sits Friday only" board.
function chamber(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const grillColor = pick(rng, GRILL);
  const s = show(seed, b.level);
  return {
    halfW: 72,
    height: 116,
    draw(ctx) {
      box(ctx, -56, -84, 112, 84, pick(rng, WHITE_WALLS));
      box(ctx, -58, -44, 116, 4, SLAB);
      box(ctx, -58, -88, 116, 5, MINT);
      openShop(ctx, -48, 0, 44, 36, slotRng(seed, 3), ['#e07a5f', '#a8c5da', '#f5efe2']);
      crossSign(ctx, -26, -58, 7);
      windowUnit(ctx, 2, -76, 20, 16, { grill: 'grid', grillColor, curtain: '#a8c5da' });
      windowUnit(ctx, 30, -76, 20, 16, { grill: 'grid', grillColor });
      door(ctx, 16, 0, 18, 32, '#4f7c6b');
      signboard(ctx, 0, -98, 96, 14, buildingName(seed, 'healthcare'), '#3d6fa3');
      // the famous board
      roundBox(ctx, 40, -40, 30, 22, 2, '#fffaf0');
      fitText(ctx, STRINGS.art.friday, 55, -29, 27, 5, '#c8553d');
      line(ctx, 46, -18, 46, 0, '#7a5236', 1.6);
      line(ctx, 64, -18, 64, 0, '#7a5236', 1.6);
      // waiting bench
      box(ctx, -62, -10, 26, 3, '#7a5236');
      standingPerson(ctx, -56, -10, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(0)) standingPerson(ctx, -46, -10, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(1)) ac(ctx, -54, -76);
      if (s(2)) plant(ctx, 0, -44);
      if (s(3)) plant(ctx, 52, -88);
      if (s(4)) standingPerson(ctx, 0, 0, pick(rng, CLOTHES), pick(rng, SKIN));
    },
  };
}

// Tier 3: Diagnostic Centre. "14 tests, 1 price" banner.
function diagnostic(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const s = show(seed, b.level);
  return {
    halfW: 74,
    height: 160,
    draw(ctx) {
      for (let f = 0; f < 4; f++) {
        const y = -(f + 1) * 32;
        box(ctx, -58, y, 116, 32, f === 0 ? '#e8f1ef' : '#f5efe2');
        if (f > 0) glassGrid(ctx, -50, y + 6, 100, 18, 6, 1, '#7d98a6', VISUAL.litWindowShare + 0.1);
        box(ctx, -60, y + 29, 120, 3, '#3d6fa3');
      }
      glassGrid(ctx, -40, -26, 52, 26, 4, 1, '#a8c5da', 1);
      door(ctx, 18, 0, 22, 26, '#3d6fa3');
      roundBox(ctx, -60, -152, 120, 22, 3, '#3d6fa3');
      glowText(ctx, buildingName(seed, 'healthcare').toUpperCase(), 0, -141, 112, 13, '#fffaf0');
      banner(ctx, -56, -100, 52, 14, STRINGS.art.tests, '#c8553d');
      crossSign(ctx, 46, -114, 8);
      for (let i = 0; i < 3; i++) standingPerson(ctx, -56 - i * 8, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(0)) ac(ctx, 58, -60);
      if (s(1)) ac(ctx, 58, -90);
      if (s(2)) pottedPalm(ctx, 50, 0);
      if (s(3)) standingPerson(ctx, -80, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(4)) waterTank(ctx, 20, -152);
    },
  };
}

// Tier 4: Specialized Hospital. 8 beds, 2 lifts, 1 working.
function hospital(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const s = show(seed, b.level);
  return {
    halfW: 76,
    height: 212,
    draw(ctx) {
      const floors = 6;
      for (let f = 0; f < floors; f++) {
        const y = -30 - (f + 1) * 28;
        box(ctx, -62, y, 100, 28, pick(rng, WHITE_WALLS));
        for (let x = -56; x < 30; x += 18) windowUnit(ctx, x, y + 6, 13, 14, { grill: 'none', grillColor: '#3a2e25', curtain: f % 2 ? MINT : null });
        box(ctx, -64, y + 25, 104, 3, SLAB);
      }
      // the lift shaft: two glass lifts, one taped off
      box(ctx, 38, -198, 28, 198, '#cfe3ea');
      box(ctx, 40, -120, 11, 16, '#e9c46a');
      box(ctx, 53, -60, 11, 16, '#9aa0a6');
      line(ctx, 52, -62, 64, -46, '#c8553d', 2);
      line(ctx, 64, -62, 52, -46, '#c8553d', 2);
      fitText(ctx, STRINGS.art.outOfOrder, 58, -36, 18, 4, '#c8553d');
      // ground floor emergency
      box(ctx, -62, -30, 100, 30, '#f5efe2');
      roundBox(ctx, -56, -28, 56, 10, 2, '#c8553d');
      glowText(ctx, STRINGS.art.emergency, -28, -23, 50, 8, '#fffaf0');
      door(ctx, -50, 0, 30, 18, '#2f3338');
      door(ctx, 8, 0, 18, 24, '#3d6fa3');
      roundBox(ctx, -60, -222, 120, 20, 3, '#f5efe2');
      fitText(ctx, buildingName(seed, 'healthcare'), 0, -212, 112, 12, '#3d6fa3');
      crossSign(ctx, -50, -212, 7, '#c8553d');
      if (s(0)) ac(ctx, -76, -80);
      if (s(1)) ac(ctx, -76, -140);
      if (s(2)) standingPerson(ctx, -14, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(3)) pottedPalm(ctx, 30, 0);
      if (s(4)) waterTank(ctx, -40, -198);
    },
  };
}

// Tier 5: Super Specialty Hospital. VIP wing, an ambulance parked forever.
function superSpecialty(b: Building, seed: number): Design {
  const rng = slotRng(seed, 0);
  const s = show(seed, b.level);
  return {
    halfW: 80,
    height: 268,
    draw(ctx) {
      // tower
      glassGrid(ctx, -60, -240, 92, 200, 6, 12, '#7d98a6', VISUAL.litWindowShare);
      box(ctx, -62, -244, 96, 6, '#f5efe2');
      // the VIP wing: gold band floors near the top
      box(ctx, -60, -224, 92, 30, '#e9d6a0');
      for (let x = -54; x < 30; x += 16) box(ctx, x, -218, 12, 18, GOLD);
      fitText(ctx, STRINGS.art.vip, -14, -230, 60, 7, '#7a5236');
      // podium and entrance
      box(ctx, -70, -40, 140, 40, '#f5efe2');
      glassGrid(ctx, -50, -32, 70, 32, 5, 1, '#a8c5da', 1);
      roundBox(ctx, -66, -262, 132, 18, 3, '#3d6fa3');
      glowText(ctx, buildingName(seed, 'healthcare').toUpperCase(), 0, -253, 124, 12, '#fffaf0');
      crossSign(ctx, 52, -140, 12, '#c8553d');
      // the ambulance parked forever: flat tyre, a creeper growing up its side
      roundBox(ctx, 26, -26, 44, 22, 4, '#fffaf0');
      box(ctx, 26, -16, 44, 3, '#c8553d');
      crossSign(ctx, 46, -21, 3, '#c8553d');
      ellipse(ctx, 34, -4, 5, 3, '#3a3a40');
      circle(ctx, 62, -4, 4.5, '#3a3a40');
      for (let i = 0; i < 4; i++) circle(ctx, 28 + i * 3, -6 - i * 4, 2.4, '#7aa95c', false);
      if (s(0)) pottedPalm(ctx, -76, 0);
      if (s(1)) standingPerson(ctx, -10, 0, pick(rng, CLOTHES), pick(rng, SKIN));
      if (s(2)) ac(ctx, 36, -180);
      if (s(3)) line(ctx, 20, -244, 20, -266, '#3a2e25', 1.4);
      if (s(4)) standingPerson(ctx, 0, 0, '#f5efe2', pick(rng, SKIN), '#f5efe2');
    },
  };
}
