// Visual style of each district's backdrop. Names and unlock rules live in config/buildings.ts.
import { SKYLINE_FAR, SKYLINE_NEAR, SKYLINE_NEAR_WIN, SKY_BAND } from './palette';

export interface SkyStyle {
  id: string;
  far: string;
  near: string;
  nearWin: string;
  band: string;
  /** Height multiplier for skyline blocks. */
  tall: number;
  /** A lake strip along the horizon. */
  lake: boolean;
}

const STYLES: readonly SkyStyle[] = [
  // Mirpara: dense, low, tin and concrete
  { id: 'mirpara', far: SKYLINE_FAR, near: SKYLINE_NEAR, nearWin: SKYLINE_NEAR_WIN, band: SKY_BAND, tall: 0.85, lake: false },
  // Dhanpur: trees, a lake, cafes
  { id: 'dhanpur', far: '#b4c9bf', near: '#8fae9c', nearWin: '#c3d8cb', band: '#dcebd9', tall: 0.95, lake: true },
  // Gulmohor: wide roads, glass towers
  { id: 'gulmohor', far: '#a9bdd6', near: '#7f9cc0', nearWin: '#c9dcf0', band: '#d9e6f2', tall: 1.35, lake: false },
  // Purbopur: a new town on sand, half-built and far apart
  { id: 'purbopur', far: '#d8c7a4', near: '#bfa982', nearWin: '#e8dcc2', band: '#efe3c8', tall: 0.7, lake: false },
  // Notun Char: a river island that did not exist last year
  { id: 'notunchar', far: '#b9c7c4', near: '#93a8a3', nearWin: '#d2dfdb', band: '#d8e7ea', tall: 0.55, lake: true },
];

export function skyStyle(district: number): SkyStyle {
  return STYLES[Math.min(district, STYLES.length - 1)]!;
}
