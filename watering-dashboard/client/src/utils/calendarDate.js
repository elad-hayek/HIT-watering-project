export function toCalendarDate(value) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatCalendarDate(value) {
  const calendarDate = toCalendarDate(value);
  if (!calendarDate) return "";

  const [year, month, day] = calendarDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}
