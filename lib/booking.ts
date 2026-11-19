/**
 * Ride request form: field options, the action's state shape and the validation rules.
 * Shared by the form (client) and the server action, so both agree on every rule; the
 * server always re-validates, since an action is a public POST endpoint.
 */
import { SERVICES } from "./site";

export const SERVICE_OPTIONS = [...SERVICES.map((s) => s.name), "Other / not sure"] as const;

export const MOBILITY = [
  { value: "ambulatory", label: "Walks", hint: "with or without help" },
  { value: "wheelchair", label: "Wheelchair", hint: "manual or power" },
  { value: "unsure", label: "Not sure", hint: "we’ll ask on the call" },
] as const;

export type Field =
  | "riderName"
  | "phone"
  | "email"
  | "contactName"
  | "service"
  | "mobility"
  | "date"
  | "time"
  | "pickup"
  | "dropoff"
  | "roundTrip"
  | "returnTime"
  | "notes";

export type BookingState = {
  status: "idle" | "error" | "success";
  /** Shown above the form (errors) or in the confirmation (success). */
  message?: string;
  errors?: Partial<Record<Field, string>>;
  /** What was submitted, so the form can be refilled after React resets it. */
  values?: Partial<Record<Field, string>>;
};

export const initialBookingState: BookingState = { status: "idle" };

export type RideRequest = {
  riderName: string;
  phone: string;
  email?: string;
  contactName?: string;
  service: string;
  mobility: (typeof MOBILITY)[number]["value"];
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  roundTrip: boolean;
  returnTime?: string;
  notes?: string;
};

/** Today's date in Los Angeles (YYYY-MM-DD): the service area's calendar, not the server's. */
export function todayInLA(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
}

const clean = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "");

/** US numbers: 10 digits, or 11 starting with 1. Returns "(310) 387-0183" or null. */
export function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return null;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function validateRideRequest(form: FormData, now = new Date()) {
  const v = {
    riderName: clean(form.get("riderName")),
    phone: clean(form.get("phone")),
    email: clean(form.get("email")),
    contactName: clean(form.get("contactName")),
    service: clean(form.get("service")),
    mobility: clean(form.get("mobility")),
    date: clean(form.get("date")),
    time: clean(form.get("time")),
    pickup: clean(form.get("pickup")),
    dropoff: clean(form.get("dropoff")),
    roundTrip: form.get("roundTrip") ? "on" : "",
    returnTime: clean(form.get("returnTime")),
    notes: (typeof form.get("notes") === "string" ? (form.get("notes") as string) : "").trim(),
  } satisfies Record<Field, string>;

  const errors: Partial<Record<Field, string>> = {};
  const len = (s: string, min: number, max: number) => s.length >= min && s.length <= max;

  if (!len(v.riderName, 2, 80)) errors.riderName = "Enter the rider’s full name.";
  const phone = formatPhone(v.phone);
  if (!phone) errors.phone = "Enter a 10-digit US phone number so we can call to confirm.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.email = "Check the email address, or leave it blank.";
  if (v.contactName.length > 80) errors.contactName = "Keep this under 80 characters.";
  if (!(SERVICE_OPTIONS as readonly string[]).includes(v.service)) errors.service = "Choose the kind of ride.";
  if (!MOBILITY.some((m) => m.value === v.mobility)) errors.mobility = "Tell us how the rider gets around.";

  const today = todayInLA(now);
  const maxDate = todayInLA(new Date(now.getTime() + 366 * 864e5));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) errors.date = "Choose the date of the ride.";
  else if (v.date < today) errors.date = "That date has passed. Choose today or a later date.";
  else if (v.date > maxDate) errors.date = "We take requests up to a year ahead.";

  const isTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  if (!isTime(v.time)) errors.time = "Enter the appointment time.";
  if (v.roundTrip && v.returnTime && !isTime(v.returnTime)) errors.returnTime = "Enter a time, or leave it blank.";

  if (!len(v.pickup, 5, 200)) errors.pickup = "Enter the full pickup address.";
  if (!len(v.dropoff, 5, 200)) errors.dropoff = "Enter the destination’s name or address.";
  if (v.notes.length > 600) errors.notes = "Keep notes under 600 characters.";

  if (Object.keys(errors).length) return { ok: false as const, errors, values: v };

  const request: RideRequest = {
    riderName: v.riderName,
    phone: phone!,
    email: v.email || undefined,
    contactName: v.contactName || undefined,
    service: v.service,
    mobility: v.mobility as RideRequest["mobility"],
    date: v.date,
    time: v.time,
    pickup: v.pickup,
    dropoff: v.dropoff,
    roundTrip: Boolean(v.roundTrip),
    returnTime: v.roundTrip ? v.returnTime || undefined : undefined,
    notes: v.notes || undefined,
  };
  return { ok: true as const, request, values: v };
}

/** "Tue, Nov 25, 2026 at 9:30 AM" for the email and the confirmation. */
export function describeWhen(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(y, m - 1, d),
  );
  return `${day} at ${formatTime(hh, mm)}`;
}

export function formatTime(hh: number, mm: number) {
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
}
