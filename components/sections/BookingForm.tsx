"use client";

import { useActionState, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { requestRide } from "@/app/actions/requestRide";
import { initialBookingState, MOBILITY, SERVICE_OPTIONS, todayInLA, type BookingState, type Field } from "@/lib/booking";
import { COMPANY } from "@/lib/site";

const INPUT =
  "block h-12 w-full rounded-xl border border-ink/15 bg-white px-4 text-base text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink/35 hover:border-ink/30 focus:border-teal focus:ring-4 focus:ring-teal/15 aria-invalid:border-red-600 aria-invalid:focus:ring-red-600/15";
const LABEL = "mb-2 flex items-baseline justify-between gap-3 font-condensed text-[13px] font-semibold uppercase tracking-[0.16em] text-ink/75";
const LEGEND = "mb-5 flex items-center gap-3 font-display text-xl uppercase leading-none text-ink";

/** Label + control + hint/error, wired with ids so screen readers read them together. */
function Control({
  field,
  label,
  optional,
  hint,
  state,
  children,
}: {
  field: Field;
  label: string;
  optional?: boolean;
  hint?: string;
  state: BookingState;
  children: (p: { id: string; "aria-invalid"?: true; "aria-describedby"?: string; defaultValue?: string }) => ReactNode;
}) {
  const id = `ride-${field}`;
  const error = state.errors?.[field];
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
        {optional && <span className="font-sans text-xs font-normal normal-case tracking-normal text-ink/45">Optional</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": described, defaultValue: state.values?.[field] })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink/50">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5h.01" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function Form({ onDone }: { onDone: (s: BookingState) => void }) {
  const [state, action, pending] = useActionState(requestRide, initialBookingState);
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  // The page is prerendered, so set "today" (in Los Angeles) and the bot timer on the client.
  useEffect(() => {
    const f = formRef.current;
    if (!f) return;
    (f.elements.namedItem("date") as HTMLInputElement).min = todayInLA();
    (f.elements.namedItem("startedAt") as HTMLInputElement).value = String(Date.now());
  }, []);

  useEffect(() => {
    if (state.status === "success") onDone(state);
    if (state.status === "error") {
      // Move focus to the first field that needs fixing (or the message if none).
      const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid]");
      (first ?? summaryRef.current)?.focus();
    }
  }, [state, onDone]);

  return (
    <form ref={formRef} action={action} noValidate className="space-y-10" aria-describedby={`${uid}-note`}>
      {state.status === "error" && state.message && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[15px] font-medium text-red-800 outline-none"
        >
          {state.message}
        </div>
      )}

      {/* bots fill every field; people never see this one */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <input type="hidden" name="startedAt" defaultValue="" />

      <fieldset>
        <legend className={LEGEND}>
          <span className="grid size-7 place-items-center rounded-full bg-gold font-display text-sm text-ink">1</span>
          Who’s riding
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Control field="riderName" label="Rider’s full name" state={state}>
            {(p) => <input {...p} name="riderName" autoComplete="name" required className={INPUT} />}
          </Control>
          <Control field="phone" label="Phone" hint="We’ll call this number to confirm." state={state}>
            {(p) => <input {...p} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(310) 555-0123" required className={INPUT} />}
          </Control>
          <Control field="email" label="Email" optional state={state}>
            {(p) => <input {...p} name="email" type="email" autoComplete="email" className={INPUT} />}
          </Control>
          <Control field="contactName" label="Your name" optional hint="If you’re booking for someone else." state={state}>
            {(p) => <input {...p} name="contactName" autoComplete="off" className={INPUT} />}
          </Control>
        </div>
      </fieldset>

      <fieldset>
        <legend className={LEGEND}>
          <span className="grid size-7 place-items-center rounded-full bg-gold font-display text-sm text-ink">2</span>
          The trip
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Control field="service" label="Kind of ride" state={state}>
              {(p) => (
                <div className="relative">
                  {/* keyed: unlike inputs, a <select> only adopts defaultValue when it mounts,
                      so it must remount to survive React's post-action form reset */}
                  <select
                    key={p.defaultValue ?? ""}
                    {...p}
                    name="service"
                    required
                    defaultValue={p.defaultValue ?? ""}
                    className={`${INPUT} appearance-none pr-11`}
                  >
                    <option value="" disabled>
                      Choose one
                    </option>
                    {SERVICE_OPTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink/50" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </Control>
          </div>

          {/* mobility: big tappable choices rather than a dropdown */}
          <fieldset className="sm:col-span-2" aria-describedby={state.errors?.mobility ? "ride-mobility-error" : undefined}>
            <legend className={LABEL}>How does the rider get around?</legend>
            <div className="grid grid-cols-3 gap-2.5">
              {MOBILITY.map((m) => (
                <label
                  key={m.value}
                  className="relative cursor-pointer rounded-xl border border-ink/15 bg-white px-3 py-3 text-center transition-colors duration-200 hover:border-ink/30 has-checked:border-teal has-checked:bg-teal/[0.06] has-checked:ring-2 has-checked:ring-teal/25 has-focus-visible:ring-4 has-focus-visible:ring-teal/25"
                >
                  <input
                    type="radio"
                    name="mobility"
                    value={m.value}
                    required
                    defaultChecked={state.values?.mobility === m.value}
                    data-invalid={state.errors?.mobility ? "" : undefined}
                    className="peer sr-only"
                  />
                  <span className="block font-condensed text-[15px] font-semibold uppercase tracking-[0.08em] text-ink peer-checked:text-teal">
                    {m.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink/50">{m.hint}</span>
                </label>
              ))}
            </div>
            {state.errors?.mobility && (
              <p id="ride-mobility-error" className="mt-1.5 text-sm font-medium text-red-700">
                {state.errors.mobility}
              </p>
            )}
          </fieldset>

          <Control field="date" label="Date" state={state}>
            {(p) => <input {...p} name="date" type="date" required className={INPUT} />}
          </Control>
          <Control field="time" label="Appointment time" state={state}>
            {(p) => <input {...p} name="time" type="time" step={300} required className={INPUT} />}
          </Control>
          <div className="sm:col-span-2">
            <Control field="pickup" label="Pickup address" state={state}>
              {(p) => <input {...p} name="pickup" autoComplete="street-address" placeholder="Street, city, ZIP" required className={INPUT} />}
            </Control>
          </div>
          <div className="sm:col-span-2">
            <Control field="dropoff" label="Destination" hint="Clinic, hospital or address." state={state}>
              {(p) => <input {...p} name="dropoff" autoComplete="off" required className={INPUT} />}
            </Control>
          </div>

          {/* round trip: the return-time field follows the checkbox in CSS (no state to sync) */}
          <div className="group grid gap-5 sm:col-span-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl sm:col-span-2 border border-ink/15 bg-white px-4 py-3.5 transition-colors duration-200 hover:border-ink/30 has-checked:border-teal has-checked:bg-teal/[0.06]">
              <input
                type="checkbox"
                name="roundTrip"
                defaultChecked={state.values?.roundTrip === "on"}
                className="size-5 shrink-0 accent-teal"
              />
              <span className="text-[15px] font-medium text-ink">I need a ride home too</span>
            </label>
            <div className="hidden sm:col-start-1 group-has-checked:block">
              <Control field="returnTime" label="Pickup time for the ride home" optional hint="Leave blank if you’re not sure yet." state={state}>
                {(p) => <input {...p} name="returnTime" type="time" step={300} className={INPUT} />}
              </Control>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className={LEGEND}>
          <span className="grid size-7 place-items-center rounded-full bg-gold font-display text-sm text-ink">3</span>
          Anything else
        </legend>
        <Control field="notes" label="Notes for the driver" optional hint="Gate codes, building entrance, an escort riding along. Please don’t include medical details." state={state}>
          {(p) => <textarea {...p} name="notes" rows={4} maxLength={600} className={`${INPUT} h-auto resize-y py-3 leading-relaxed`} />}
        </Control>
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-ink/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p id={`${uid}-note`} className="max-w-sm text-sm leading-relaxed text-ink/55">
          This is a request, not a confirmed booking. We’ll call you to confirm the details and time.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex h-14 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-full bg-teal pl-7 pr-2 font-condensed text-base font-semibold uppercase tracking-[0.12em] text-white shadow-[0_18px_40px_-18px_rgb(15_118_110/0.9)] transition-colors duration-200 hover:bg-teal-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal disabled:cursor-wait disabled:opacity-80"
        >
          {pending ? "Sending…" : "Request a ride"}
          <span className="grid size-10 place-items-center rounded-full bg-gold text-ink transition-transform duration-300 group-hover:translate-x-0.5">
            {pending ? (
              <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}

function Confirmation({ state, onAgain }: { state: BookingState; onAgain: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="flex min-h-[28rem] flex-col items-start justify-center outline-none">
      <span className="grid size-16 place-items-center rounded-full bg-teal text-white shadow-[0_0_0_10px_rgb(15_118_110/0.12)]">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h3 className="mt-8 font-display text-[clamp(2.2rem,4vw,3.2rem)] uppercase leading-[0.9]">Request received</h3>
      <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-ink/70">{state.message}</p>
      <p className="mt-3 max-w-md text-pretty text-ink/55">
        Need it sooner, or something’s changed? Call{" "}
        <a href={COMPANY.phoneHref} className="font-semibold text-teal underline-offset-4 hover:underline">
          {COMPANY.phone}
        </a>
        .
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-8 inline-flex h-12 cursor-pointer items-center rounded-full border border-ink/20 px-6 font-condensed text-[15px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 hover:border-teal hover:text-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        Request another ride
      </button>
    </div>
  );
}

/**
 * Online ride request. Sends to the `requestRide` server action, which validates and
 * emails the office; the rider gets a call to confirm (nothing is booked automatically).
 */
export function BookingForm() {
  const [done, setDone] = useState<BookingState | null>(null);
  const [round, setRound] = useState(0); // remounts the form for "request another ride"
  if (done) {
    return (
      <Confirmation
        state={done}
        onAgain={() => {
          setDone(null);
          setRound((r) => r + 1);
        }}
      />
    );
  }
  return <Form key={round} onDone={setDone} />;
}
