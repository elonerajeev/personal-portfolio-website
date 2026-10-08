const monthFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2025-10" -> "Oct 2025" */
export function formatYearMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return monthFormat.format(new Date(Date.UTC(year, month - 1)));
}

/** "Oct 2025 – Present" or "May 2024 – Jul 2024" */
export function formatRange(start: string, end?: string): string {
  return `${formatYearMonth(start)} – ${end ? formatYearMonth(end) : 'Present'}`;
}
