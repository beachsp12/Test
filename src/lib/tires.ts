export const TIRE_POSITIONS = [
  "front_left",
  "front_right",
  "rear_left",
  "rear_right",
  "spare",
] as const;

export type TirePosition = (typeof TIRE_POSITIONS)[number];

export const MAIN_TIRES: TirePosition[] = [
  "front_left",
  "front_right",
  "rear_left",
  "rear_right",
];

export const TIRE_LABELS: Record<TirePosition, string> = {
  front_left: "Front left",
  front_right: "Front right",
  rear_left: "Rear left",
  rear_right: "Rear right",
  spare: "Spare",
};

/** Extra context for the model so it knows where on the car the tire sits. */
export const TIRE_DESCRIPTIONS: Record<TirePosition, string> = {
  front_left: "front axle, driver's side in left-hand-drive countries",
  front_right: "front axle, passenger's side in left-hand-drive countries",
  rear_left: "rear axle, driver's side in left-hand-drive countries",
  rear_right: "rear axle, passenger's side in left-hand-drive countries",
  spare: "the spare tire (may be mounted, in the trunk, or under the car)",
};

export function isTirePosition(value: unknown): value is TirePosition {
  return (
    typeof value === "string" &&
    (TIRE_POSITIONS as readonly string[]).includes(value)
  );
}
