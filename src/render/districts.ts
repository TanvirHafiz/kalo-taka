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
];

export function skyStyle(district: number): SkyStyle {
  return STYLES[Math.min(district, STYLES.length - 1)]!;
}
