// Horizontal side-scrolling camera. World units are CSS pixels at zoom 1.

export interface Camera {
  x: number;
  zoom: number;
  viewW: number;
  viewH: number;
}

export function createCamera(): Camera {
  return { x: 0, zoom: 1, viewW: 0, viewH: 0 };
}

export function clampCamera(cam: Camera, worldW: number): void {
  const visible = cam.viewW / cam.zoom;
  const maxX = Math.max(0, worldW - visible);
  cam.x = Math.min(maxX, Math.max(0, cam.x));
}

export function screenToWorldX(cam: Camera, sx: number): number {
  return cam.x + sx / cam.zoom;
}
