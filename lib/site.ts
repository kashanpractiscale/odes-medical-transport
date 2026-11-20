/**
 * Company facts and copy, taken from the previous Odes website (odes-medical-transpo.com:
 * Home, About Us, Contact). Wording is lightly edited for clarity; no facts are added.
 * Not on the old site, so deliberately absent here: street address, opening hours,
 * insurance / Medi-Cal acceptance, testimonials, social accounts.
 */
export const COMPANY = {
  name: "Odes Medical Transportation",
  legalName: "Odes Medical Transportation, LLC",
  phone: "(310) 387-0183",
  phoneHref: "tel:+13103870183",
  email: "odesmedicaltransportation@yahoo.com",
  base: "Gardena, CA 90247",
  serviceArea: "Los Angeles County",
} as const;

/**
 * Canonical origin for metadata, the sitemap and structured data. Set NEXT_PUBLIC_SITE_URL
 * once a custom domain is live; until then Vercel's production domain is used.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

/** Search-result copy: title ≤ 60 characters, description ≤ ~160. */
export const SEO = {
  title: "Non-Emergency Medical Transportation in Los Angeles | Odes",
  description:
    "Safe, on-time non-emergency medical transportation in Los Angeles County. Wheelchair and ambulatory rides to appointments, dialysis and hospital discharge.",
  keywords: [
    "non-emergency medical transportation",
    "NEMT Los Angeles",
    "wheelchair transportation Los Angeles",
    "ambulatory transportation",
    "dialysis transportation",
    "hospital discharge transportation",
    "senior medical transportation",
    "medical rides Gardena CA",
    "Los Angeles County medical transport",
  ],
} as const;

export const MISSION =
  "Odes was founded to remove the barriers that keep patients from the medical care they need. Unreliable transportation is one of the leading causes of missed appointments, so we provide safe, reliable and timely rides — improving health outcomes one ride at a time.";

/** The mission, split for the scroll scene (Home page founding paragraph, lightly edited). */
export const MISSION_SCENE = {
  problem:
    "Unreliable transportation is one of the leading causes of missed doctor appointments and declining health. Odes was founded to remove that barrier.",
  statement:
    "To provide safe, reliable and timely transportation, so every patient can reach their medical care without the stress of logistical challenges.",
  closing: "Improving health outcomes for our community",
} as const;

/** "Why choose us" (About Us page). "Fewer no-shows" had no body text there. */
export const WHY = [
  {
    name: "Reliable access to care",
    body: "We remove barriers to care and get patients to their appointments by giving them access to rides.",
  },
  {
    name: "Fewer no-shows",
    body: "Dependable pickups mean patients make the appointments they booked.",
  },
  {
    name: "Happier patients",
    body: "Direct routes and an enjoyable ride experience make life easier for patients.",
  },
  {
    name: "Easy to book",
    body: "Requesting a ride is simple, and you can book for patients who don’t have a smartphone.",
  },
] as const;

/** About Us, "Our Commitment to Excellence". */
export const COMMITMENT =
  "Our team of experienced drivers and support staff work tirelessly to ensure that you receive the best care and attention throughout your journey.";

/** Home page tagline. */
export const TAGLINE = ["Reliable", "Professional", "Always on time"] as const;

export const SERVICES = [
  {
    name: "Wheelchair transportation",
    body: "Wheelchair-accessible vans with ramps, lifts and secure tie-down systems for manual and power wheelchairs. Trained attendants help with boarding and getting off.",
  },
  {
    name: "Ambulatory transportation",
    body: "Door-to-door rides for patients who can walk but need safe, reliable transport — routine doctor visits, specialist appointments, lab work and outpatient procedures.",
  },
  {
    name: "Medical appointments",
    body: "Scheduled rides to primary care, specialist, dental, vision and mental-health appointments. We plan pickup around your appointment time and coordinate the ride home.",
  },
  {
    name: "Dialysis transportation",
    body: "Dependable rides to and from dialysis appointments.",
  },
  {
    name: "Hospital discharge",
    body: "A safe, comfortable and prompt ride home after a hospital stay, coordinated with the discharge team — including patients recovering from surgery or travelling with IV equipment.",
  },
  {
    name: "Rehabilitation",
    body: "Rides to inpatient and outpatient rehabilitation centers for patients recovering from a stroke, a traumatic injury or major surgery.",
  },
  {
    name: "Senior transportation",
    body: "Unhurried, respectful rides for older patients, with extra time for getting in and out and help with doors and mobility devices.",
  },
] as const;

export const ALSO_AVAILABLE = [
  "Dental visits",
  "Psychiatry & mental health",
  "Radiation & occupational therapy",
  "Pre- & post-operative",
  "Follow-up appointments",
  "Medication pickup",
  "Adult day care centers",
  "Airport",
  "Group activities",
  "Customizable packages",
] as const;

export const VALUES = [
  {
    name: "Excellence",
    body: "The highest standards in everything — from vehicle cleanliness to driver professionalism to scheduling accuracy.",
  },
  {
    name: "Compassion",
    body: "Many riders are going through a difficult time. We meet every one of them with empathy and genuine care.",
  },
  {
    name: "Reliability",
    body: "We show up when we say we will. Dependability is the foundation of everything we do.",
  },
  {
    name: "Safety",
    body: "Passenger safety is our highest priority, kept up through rigorous standards and continuous training.",
  },
] as const;

/** How booking works, from the old site's service copy ("we plan pickup around your
 *  appointment time and coordinate the ride home", "door-to-door rides"). */
export const BOOKING_STEPS = [
  { name: "Call or email us", body: "Tell us who is riding, where they need to be and when." },
  { name: "We plan the pickup", body: "We schedule pickup around the appointment time, with any wheelchair or mobility needs." },
  { name: "Door to door", body: "We get you there safely and on time, and coordinate the ride home." },
] as const;

export const NAV = [
  { label: "Services", href: "#services" },
  { label: "About", href: "#mission" },
  { label: "Why Odes", href: "#why" },
  { label: "Book a ride", href: "#book" },
] as const;
