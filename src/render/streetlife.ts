// Street life rules: density and the lane traffic model. Pure (no DOM), so it is unit-tested.
import { VISUAL } from '../config/balance';

export type VehicleKind = 'rickshaw' | 'cng' | 'car' | 'bus' | 'suv';

/** Vehicle length (world units) and cruising speed (world units per second). */
export const VEHICLE_SPECS: Record<VehicleKind, { len: number; speed: number }> = {
  rickshaw: { len: 50, speed: 24 },
  cng: { len: 42, speed: 52 },
  car: { len: 56, speed: 66 },
  bus: { len: 112, speed: 42 },
  suv: { len: 60, speed: 70 },
};

/** Gap kept to the vehicle in front, in world units. */
export const MIN_GAP = 8;
/** Average space one vehicle takes in a full lane. */
const AVG_SLOT = 58 + MIN_GAP;

export interface Vehicle {
  kind: VehicleKind;
  /** Position of the rear along the lane's direction of travel, in [0, laneLength). */
  s: number;
  v: number;
  len: number;
  desired: number;
  variant: number;
}

/** Share of lane capacity in use for an income per second (above 1 means a jam). */
export function trafficFill(incomePerSec: number): number {
  const f = VISUAL.trafficFillMin + VISUAL.trafficFillPerDecade * Math.log10(Math.max(0, incomePerSec) + 1);
  return Math.min(VISUAL.trafficFillMax, f);
}

/** Vehicles wanted in one lane of the given length. */
export function laneTarget(incomePerSec: number, laneLength: number): number {
  return Math.max(1, Math.round(trafficFill(incomePerSec) * (laneLength / AVG_SLOT)));
}

/** Pedestrians on the footpath for a number of buildings. */
export function peopleTarget(buildings: number): number {
  return Math.min(VISUAL.peopleMax, Math.round(VISUAL.peopleBase + VISUAL.peoplePerBuilding * buildings));
}

/** Distance from the front of `a` to the rear of the next vehicle ahead on a ring lane. */
function gapAhead(a: Vehicle, ahead: Vehicle, laneLength: number): number {
  return (((ahead.s - (a.s + a.len)) % laneLength) + laneLength) % laneLength;
}

/**
 * Advance one lane (a ring, so vehicles leaving one end re-enter at the other). Each vehicle slows
 * to keep MIN_GAP to the one ahead, so a full lane turns into a slow stop-go jam. Mutates in place.
 */
export function stepLane(lane: Vehicle[], dt: number, laneLength: number, timeSec: number): void {
  if (lane.length === 0) return;
  lane.sort((a, b) => a.s - b.s);
  const n = lane.length;
  const targets = lane.map((veh, i) => {
    if (n === 1) return veh.desired;
    const gap = gapAhead(veh, lane[(i + 1) % n]!, laneLength);
    const room = Math.max(0, gap - MIN_GAP);
    // a little per-vehicle rhythm so a jam creeps in waves instead of freezing
    const creep = room > 1 ? VISUAL.jamCrawl * (0.6 + 0.4 * Math.sin(timeSec * 1.7 + veh.variant * 2.3)) : 0;
    return Math.min(veh.desired, Math.max(room * 1.6, creep));
  });
  for (let i = 0; i < n; i++) {
    const veh = lane[i]!;
    const t = targets[i]!;
    veh.v += (t - veh.v) * Math.min(1, dt * (t < veh.v ? 6 : 2));
    if (n > 1) {
      // never move into the vehicle ahead, whatever the smoothing says
      const gap = gapAhead(veh, lane[(i + 1) % n]!, laneLength);
      veh.v = Math.min(veh.v, Math.max(0, gap - 0.5) / Math.max(dt, 1e-6));
    }
    veh.s = (veh.s + veh.v * dt) % laneLength;
  }
}
