export function overlapInterval(a, b) {
    const start = new Date(Math.max(a.start.getTime(), b.start.getTime()));
    const end = new Date(Math.min(a.end.getTime(), b.end.getTime()));
    if (start >= end) return null;
    return { start, end };
  }
  