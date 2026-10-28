const zones = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
] as const;

export function TimezoneSelect({ value = "America/Denver" }: { value?: string }) {
  return (
    <label>
      Time zone
      <select name="timezone" defaultValue={value}>
        {zones.map(([zone, label]) => (
          <option key={zone} value={zone}>
            {label} ({zone.replace("_", " ")})
          </option>
        ))}
      </select>
    </label>
  );
}
