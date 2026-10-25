import { describe, expect, it } from 'vitest';
import { VISUAL } from '../src/config/balance';
import { MIN_GAP, VEHICLE_SPECS, laneTarget, peopleTarget, stepLane, trafficFill, type Vehicle } from '../src/render/streetlife';
import { dayPhase, nightness } from '../src/sim/daycycle';

describe('day cycle', () => {
  it('wraps every dayLengthMs and starts at midnight', () => {
    expect(dayPhase(0)).toBe(0);
    expect(dayPhase(VISUAL.dayLengthMs / 2)).toBeCloseTo(0.5);
    expect(dayPhase(VISUAL.dayLengthMs * 3 + VISUAL.dayLengthMs / 4)).toBeCloseTo(0.25);
    expect(dayPhase(-VISUAL.dayLengthMs / 4)).toBeCloseTo(0.75);
  });

  it('is dark at midnight, light at noon, half-lit at dawn and dusk', () => {
    expect(nightness(0)).toBe(1);
    expect(nightness(0.5)).toBe(0);
    expect(nightness(VISUAL.dawnPhase)).toBeCloseTo(0.5);
    expect(nightness(VISUAL.duskPhase)).toBeCloseTo(0.5);
  });

  it('changes smoothly (no jumps bigger than a few percent per 1/360 of a day)', () => {
    let prev = nightness(0);
    for (let i = 1; i <= 360; i++) {
      const n = nightness(i / 360);
      expect(Math.abs(n - prev)).toBeLessThan(0.08);
      prev = n;
    }
  });
});

describe('street life density', () => {
  it('traffic fill grows with income and caps above full', () => {
    expect(trafficFill(0)).toBeCloseTo(VISUAL.trafficFillMin);
    expect(trafficFill(1e5)).toBeGreaterThan(trafficFill(1e2));
    expect(trafficFill(1e30)).toBe(VISUAL.trafficFillMax);
    expect(VISUAL.trafficFillMax).toBeGreaterThan(1);
    expect(laneTarget(1e30, 2000)).toBeGreaterThan(laneTarget(10, 2000));
  });

  it('pedestrians grow with buildings and cap', () => {
    expect(peopleTarget(0)).toBe(VISUAL.peopleBase);
    expect(peopleTarget(4)).toBeGreaterThan(peopleTarget(1));
    expect(peopleTarget(1000)).toBe(VISUAL.peopleMax);
  });
});

function lane(count: number, laneLength: number): Vehicle[] {
  const spec = VEHICLE_SPECS.car;
  return Array.from({ length: count }, (_, i) => ({ kind: 'car' as const, s: (i * laneLength) / count, v: 0, len: spec.len, desired: spec.speed, variant: i }));
}

function run(l: Vehicle[], laneLength: number, seconds: number): void {
  for (let t = 0; t < seconds; t += 1 / 60) stepLane(l, 1 / 60, laneLength, t);
}

describe('lane traffic model', () => {
  it('a light lane flows near cruising speed', () => {
    const L = 2000;
    const l = lane(3, L);
    run(l, L, 20);
    const avg = l.reduce((a, v) => a + v.v, 0) / l.length;
    expect(avg).toBeGreaterThan(VEHICLE_SPECS.car.speed * 0.8);
  });

  it('a full lane jams: slow, never overlapping', () => {
    const L = 2000;
    const l = lane(laneTarget(1e30, L), L);
    run(l, L, 20);
    const avg = l.reduce((a, v) => a + v.v, 0) / l.length;
    expect(avg).toBeLessThan(VEHICLE_SPECS.car.speed * 0.25);
    // with no overlaps, the gaps between neighbours add up to exactly the free road length
    l.sort((a, b) => a.s - b.s);
    let gaps = 0;
    for (let i = 0; i < l.length; i++) {
      const a = l[i]!, b = l[(i + 1) % l.length]!;
      gaps += (((b.s - (a.s + a.len)) % L) + L) % L;
    }
    const free = L - l.reduce((sum, v) => sum + v.len, 0);
    expect(gaps).toBeCloseTo(free, 3);
    expect(MIN_GAP).toBeGreaterThan(0);
  });
});
