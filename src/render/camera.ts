// Side-scrolling camera. World units are CSS pixels at zoom 1. `y` is a vertical pan in screen
// pixels (positive = looking higher), used when tall buildings do not fit, mostly in portrait.

export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 1.5;

export interface Camera {
  x: number;
  zoom: number;
  viewW: number;
  viewH: number;
  y: number;
}

export function createCamera(): Camera {
  return { x: 0, zoom: 1, viewW: 0, viewH: 0, y: 0 };
}

export function clampCamera(cam: Camera, worldW: number): void {
  const visible = cam.viewW / cam.zoom;
  const maxX = Math.max(0, worldW - visible);
  cam.x = Math.min(maxX, Math.max(0, cam.x));
}

/** Keep the vertical pan between the street (0) and `maxY` screen pixels up. */
export function clampCameraY(cam: Camera, maxY: number): void {
  cam.y = Math.min(Math.max(0, maxY), Math.max(0, cam.y));
}

export function screenToWorldX(cam: Camera, sx: number): number {
  return cam.x + sx / cam.zoom;
}
