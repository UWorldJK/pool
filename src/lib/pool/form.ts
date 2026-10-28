// Small FormData readers. The database validates again; these keep obviously
// bad input from reaching it and give clearer messages.

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function text(form: FormData, name: string, max: number): string {
  const value = String(form.get(name) ?? "").trim();
  return value.slice(0, max);
}

export function uuid(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? "");
  return uuidPattern.test(value) ? value : null;
}

export function uuids(form: FormData, name: string): string[] {
  return form
    .getAll(name)
    .map(String)
    .filter((value) => uuidPattern.test(value));
}

export function checked(form: FormData, name: string): boolean {
  const value = form.get(name);
  return value === "on" || value === "true" || value === "yes";
}

export function integer(form: FormData, name: string, min: number, max: number, fallback: number): number {
  const value = Number.parseInt(String(form.get(name) ?? ""), 10);
  if (Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Accepts a full invite link or a bare token. */
export function inviteToken(input: string): string | null {
  const match = /([0-9a-f]{64})/i.exec(input.trim());
  return match ? match[1].toLowerCase() : null;
}
