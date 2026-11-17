const consultationTimes = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
];

const occupiedStatuses = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "COMPLETED"];

function parseAppointmentDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

function calendarDate(now = new Date()) {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function dayBounds(start = calendarDate()) {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function timeRepresentations(time) {
  const [hour, minutes] = time.split(":");
  const value = Number(hour);
  const meridiem = value < 12 ? "AM" : "PM";
  const twelveHour = value % 12 || 12;
  return [...new Set([time, `${twelveHour}:${minutes} ${meridiem}`, `${String(twelveHour).padStart(2, "0")}:${minutes} ${meridiem}`])];
}

module.exports = { timeRepresentations, consultationTimes, occupiedStatuses, parseAppointmentDate, calendarDate, dayBounds };
