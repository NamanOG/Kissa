/**
 * Where the tonearm's stylus meets the record, worked out from the drawing itself: the arm's pivot,
 * the stylus tip, the cartridge's axis, and the record's centre and radius, all in screen pixels
 * as laid out. Pure, so it can be tested; TonearmAssembly measures the live layout and asks here.
 *
 * Angles are the arm's CSS rotation in degrees (clockwise on screen, 0 = parked on the rest).
 */

type Vec = [number, number]

export interface ArmGeometry {
  /** The arm's pivot (its transform origin). */
  pivot: Vec
  /** The stylus tip with the arm at 0°. */
  tip0: Vec
  /** The cartridge's long axis with the arm at 0° (unit vector, pointing from the arm to the tip). */
  axis0: Vec
  /** The record's centre and its radius. */
  centre: Vec
  radius: number
}

/** The tip's place on the record at the start of a song: just inside the lead-in ring (0.952). */
export const LEAD_IN_SHARE = 0.935
/** At the end of a song: in the run-out, just outside the label (label edge 0.28 of the radius). */
export const RUN_OUT_SHARE = 0.31

/** The arm drawing (TonearmAssembly's SVG, viewBox 0 0 160 420). */
export const ARM_VIEWBOX: Vec = [160, 420]
/** Pivot: the transform origin, 72 % / 8.5 % of the arm's box. */
export const ARM_PIVOT_SHARE: Vec = [0.72, 0.085]
/**
 * The headshell's offset in the drawing (rotate(37 46 360)): chosen so the cartridge stays within
 * about 2° of the groove's tangent across a side (4.6° in the run-out), like a real arm's offset,
 * and so it continues the line of the tube's last bend. (At 22° it sat 13-21° across the groove.)
 */
export const HEADSHELL_DEG = 37
export const HEADSHELL_PIVOT_SVG: Vec = [46, 360]
/** The stylus tip in the headshell's own (unrotated) drawing. */
export const STYLUS_TIP_LOCAL: Vec = [44.45, 400.9]
/** The stylus tip in the arm's drawing, after the headshell's rotation. */
export const ARM_TIP_SVG: Vec = (() => {
  const c = Math.cos((HEADSHELL_DEG * Math.PI) / 180)
  const s = Math.sin((HEADSHELL_DEG * Math.PI) / 180)
  const dx = STYLUS_TIP_LOCAL[0] - HEADSHELL_PIVOT_SVG[0]
  const dy = STYLUS_TIP_LOCAL[1] - HEADSHELL_PIVOT_SVG[1]
  return [HEADSHELL_PIVOT_SVG[0] + dx * c - dy * s, HEADSHELL_PIVOT_SVG[1] + dx * s + dy * c] as Vec
})()

const rad = (deg: number): number => (deg * Math.PI) / 180
const rotate = ([x, y]: Vec, deg: number): Vec => {
  const c = Math.cos(rad(deg))
  const s = Math.sin(rad(deg))
  return [x * c - y * s, x * s + y * c]
}

/** The stylus tip with the arm at `deg`. */
export function tipAt(g: ArmGeometry, deg: number): Vec {
  const v = rotate([g.tip0[0] - g.pivot[0], g.tip0[1] - g.pivot[1]], deg)
  return [g.pivot[0] + v[0], g.pivot[1] + v[1]]
}

/** The tip's distance from the spindle as a share of the record's radius. */
export function tipShare(g: ArmGeometry, deg: number): number {
  const t = tipAt(g, deg)
  return Math.hypot(t[0] - g.centre[0], t[1] - g.centre[1]) / g.radius
}

/**
 * The arm angle that puts the tip at `share` of the record's radius. The tip moves inward as the
 * arm swings in, so a bisection between the rest and the inner stop finds it.
 */
export function angleForShare(g: ArmGeometry, share: number, lo = 0, hi = 45): number {
  let a = lo
  let b = hi
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2
    if (tipShare(g, m) > share) a = m
    else b = m
  }
  return (a + b) / 2
}

/**
 * How far the cartridge must turn (degrees, clockwise positive) for its axis to lie along the
 * groove under the stylus: a real arm's offset keeps the cartridge close to tangent across the
 * record; this keeps the drawing honest at every place the arm can stand.
 */
export function tangentError(g: ArmGeometry, deg: number): number {
  const t = tipAt(g, deg)
  const r: Vec = [t[0] - g.centre[0], t[1] - g.centre[1]]
  const axis = rotate(g.axis0, deg)
  // The groove's tangent: perpendicular to the radius, in the direction closest to the axis.
  let tan: Vec = [-r[1], r[0]]
  if (tan[0] * axis[0] + tan[1] * axis[1] < 0) tan = [r[1], -r[0]]
  const err = Math.atan2(axis[0] * tan[1] - axis[1] * tan[0], axis[0] * tan[0] + axis[1] * tan[1])
  return (err * 180) / Math.PI
}

/**
 * Builds the geometry from laid-out boxes: the arm's (unrotated) box and the record's box. The arm
 * drawing keeps its aspect inside its box (SVG "meet"), centred.
 */
export function geometryFromBoxes(
  arm: { left: number; top: number; width: number; height: number },
  record: { left: number; top: number; width: number; height: number }
): ArmGeometry | null {
  if (arm.width <= 0 || arm.height <= 0 || record.width <= 0) return null
  const s = Math.min(arm.width / ARM_VIEWBOX[0], arm.height / ARM_VIEWBOX[1])
  const ox = arm.left + (arm.width - ARM_VIEWBOX[0] * s) / 2
  const oy = arm.top + (arm.height - ARM_VIEWBOX[1] * s) / 2
  const axisDeg = HEADSHELL_DEG
  return {
    pivot: [arm.left + ARM_PIVOT_SHARE[0] * arm.width, arm.top + ARM_PIVOT_SHARE[1] * arm.height],
    tip0: [ox + ARM_TIP_SVG[0] * s, oy + ARM_TIP_SVG[1] * s],
    // Straight down in the drawing, turned by the headshell's 22°.
    axis0: rotate([0, 1], axisDeg),
    centre: [record.left + record.width / 2, record.top + record.height / 2],
    radius: Math.min(record.width, record.height) / 2
  }
}

/** The arm's angles for a deck: lead-in and run-out, and the cartridge's turn at each. */
export function grooveAngles(g: ArmGeometry): { outer: number; inner: number } {
  return { outer: angleForShare(g, LEAD_IN_SHARE), inner: angleForShare(g, RUN_OUT_SHARE) }
}
