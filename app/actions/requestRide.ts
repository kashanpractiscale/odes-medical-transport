"use server";

import { headers } from "next/headers";
import {
  describeWhen,
  formatTime,
  MOBILITY,
  validateRideRequest,
  type BookingState,
  type RideRequest,
} from "@/lib/booking";
import { COMPANY } from "@/lib/site";

/*
 * Ride requests from the website. This is a public POST endpoint, so it trusts nothing:
 * it re-validates every field, drops obvious bots quietly, limits how often one visitor
 * can submit, and only then emails the request to the office.
 *
 * Delivery (environment variables, see .env.example):
 *   RESEND_API_KEY  required in production (https://resend.com)
 *   BOOKING_TO      inbox for requests, defaults to the company email
 *   BOOKING_FROM    verified sender, e.g. "Odes Website <bookings@your-domain>"
 * Without a key in development, requests are printed to the server console instead.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
/** Best effort, per server instance: enough to stop a double-click storm or a basic flood. */
const recent = new Map<string, number[]>();

function rateLimited(key: string, now: number) {
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) recent.clear(); // never grow without bound
  return hits.length > MAX_PER_WINDOW;
}

export async function requestRide(_prev: BookingState, form: FormData): Promise<BookingState> {
  const now = Date.now();

  // Bots: a hidden field humans never see, and a form filled faster than a person can.
  const startedAt = Number(form.get("startedAt"));
  const tooFast = Number.isFinite(startedAt) && now - startedAt < 2500;
  if (String(form.get("website") ?? "") !== "" || tooFast) {
    return { status: "success", message: "Thanks — we’ll be in touch shortly." };
  }

  const result = validateRideRequest(form, new Date(now));
  if (!result.ok) {
    const n = Object.keys(result.errors).length;
    return {
      status: "error",
      message: n === 1 ? "One detail needs fixing before we can send this." : `${n} details need fixing before we can send this.`,
      errors: result.errors,
      values: result.values,
    };
  }

  // only complete requests count toward the limit, so fixing typos never locks anyone out
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  if (rateLimited(ip, now)) {
    return {
      status: "error",
      message: `You’ve sent several requests in a short time. Please call us on ${COMPANY.phone} instead.`,
      values: result.values,
    };
  }

  try {
    await deliver(result.request);
  } catch (err) {
    console.error("[ride request] delivery failed:", err instanceof Error ? err.message : err);
    return {
      status: "error",
      message: `We couldn’t send your request just now. Please call us on ${COMPANY.phone} and we’ll book it with you.`,
      values: result.values,
    };
  }

  const r = result.request;
  return {
    status: "success",
    message: `We’ll call ${r.phone} to confirm ${r.riderName}’s ride on ${describeWhen(r.date, r.time)}.`,
  };
}

// ---------------------------------------------------------------------------

function summary(r: RideRequest) {
  const mobility = MOBILITY.find((m) => m.value === r.mobility)?.label ?? r.mobility;
  const ret = r.roundTrip
    ? `Yes${r.returnTime ? `, pick up for the return at ${formatTime(...(r.returnTime.split(":").map(Number) as [number, number]))}` : " (time to confirm)"}`
    : "No";
  return [
    ["Rider", r.riderName],
    ["Phone", r.phone],
    ["Email", r.email ?? "—"],
    ["Booked by", r.contactName ?? "The rider"],
    ["Service", r.service],
    ["Mobility", mobility],
    ["Appointment", describeWhen(r.date, r.time)],
    ["Pickup", r.pickup],
    ["Destination", r.dropoff],
    ["Ride home", ret],
    ["Notes", r.notes ?? "—"],
  ] as const;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function deliver(r: RideRequest) {
  const rows = summary(r);
  const subject = `Ride request: ${r.riderName}, ${describeWhen(r.date, r.time)}`;
  const text = `New ride request from the website. Call to confirm.\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}`;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.info(`[ride request] (dev: no RESEND_API_KEY, not emailed)\n${subject}\n${text}`);
    return;
  }

  const html = `<!doctype html><body style="font-family:system-ui,sans-serif;color:#071211">
<h2 style="margin:0 0 4px">New ride request</h2>
<p style="margin:0 0 16px;color:#555">From the website. Call the rider to confirm.</p>
<table cellpadding="8" style="border-collapse:collapse;font-size:15px">${rows
    .map(([k, v]) => `<tr><th align="left" style="color:#0f766e;border-bottom:1px solid #eee">${k}</th><td style="border-bottom:1px solid #eee">${esc(v)}</td></tr>`)
    .join("")}</table></body>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.BOOKING_FROM || "Odes Website <onboarding@resend.dev>",
      to: [process.env.BOOKING_TO || COMPANY.email],
      reply_to: r.email,
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
