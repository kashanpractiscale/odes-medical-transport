/**
 * Reference vehicle: Ford Transit 148" WB Extended-Length (EL) High Roof.
 *
 * Published figures (Ford 2026 Transit specifications sheet + Ford body data):
 *   - overall length 263.9 in, wheelbase 147.6 in, body width 81.3 in (excl. mirrors)
 *   - high-roof overall height ≈ 110.1–110.4 in (varies by model year / GVWR)
 * Values marked "≈" are derived from the published figures or typical for the
 * configuration (e.g. 235/65R16C tyres). Verify them against the spec sheet for
 * the exact upfitted vehicle before treating the model as dimensionally exact.
 *
 * Units: metres. Axes: +X forward, +Y up, +Z vehicle right (US curb side).
 */
const IN = 0.0254;

export const SPEC = {
  length: 263.9 * IN, // 6.703 m
  wheelbase: 147.6 * IN, // 3.749 m
  width: 81.3 * IN, // 2.065 m
  height: 110.2 * IN, // 2.799 m
  frontOverhang: 39.0 * IN, // ≈ 0.991 m (length − wheelbase − rear overhang)
  tyreRadius: 0.356, // 235/65R16C ≈ 712 mm diameter
  tyreWidth: 0.235,
  trackFront: 1.734, // ≈
  trackRear: 1.7, // ≈
  sideDoorOpening: { width: 51.2 * IN, height: 70.0 * IN }, // ≈
  rearDoorOpening: { width: 61.9 * IN, height: 75.2 * IN }, // ≈
  loadFloor: 0.7, // ≈ RWD load-floor height
} as const;

export const L = SPEC.length;
export const XR = -L / 2; // rear face
export const XF = L / 2; // front of bumper
export const AX_F = XF - SPEC.frontOverhang;
export const AX_R = AX_F - SPEC.wheelbase;
export const HALF_W = SPEC.width / 2;
export const ROOF = SPEC.height;
export const WHEEL_Y = 0.345; // loaded radius
export const ARCH_R = 0.43;

// Body landmarks (side profile)
export const NOSE_X = 3.3; // grille face; bumper reaches XF
export const CAP_X = 1.05; // high-roof front cap begins to fall
export const HEADER_X = 1.78; // windshield header
export const BASE_X = 2.56; // windshield base / cowl
export const HOOD_X = 3.2; // hood front edge
export const BELT = 1.28; // beltline crease
export const LEAN = 0.072; // tumblehome above the beltline (dz/dy)
export const REAR_R = 0.06; // rear edge rounding

// Glass & openings
export const WIN_Y0 = 1.32;
export const WIN_Y1 = 1.93;
export const WS_X0 = 1.8;
export const WS_X1 = 2.545;
export const COWL_X1 = 2.64;
export const CABWIN_X0 = 1.56;
export const BPIL_X0 = 1.44;
export const DOOR = { x0: 0.2, x1: 1.5, y0: 0.47, y1: 2.38 }; // right-side sliding door
export const REAR_DOOR = {
  halfW: SPEC.rearDoorOpening.width / 2,
  y0: SPEC.loadFloor,
  y1: SPEC.loadFloor + SPEC.rearDoorOpening.height,
};
export const PATIENT_WINDOWS = {
  right: [
    [-2.55, -1.2],
    [-1.05, 0.05],
  ],
  left: [
    [-2.55, -1.2],
    [-1.05, 0.05],
    [0.3, 1.4],
  ],
} as const;
export const DOOR_WINDOW = { x0: 0.3, x1: 1.4 };
