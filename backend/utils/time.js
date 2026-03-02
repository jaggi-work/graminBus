export function timeToMinutes(t) {
  // t like "05:00:00"
  if (!t) return null;
  const [hh, mm, ss] = t.split(":").map(Number);
  return hh * 60 + mm;
}