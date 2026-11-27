export const OPEN_ORDER_STATUSES = ['Pending Payment', 'Pending Verification', 'Paid', 'Refund Required', 'Rejected', 'Pending'];
export const CANCELLABLE_UNPAID_STATUSES = ['Pending Payment', 'Pending Verification', 'Rejected', 'Pending'];

export function validateEventTimes({ date, startTime, endTime }) {
  if (startTime && endTime && endTime <= startTime) return 'End time must be after the start time.';
  if (date && endTime) {
    const eventEnd = eventDateTime(date, endTime);
    const dayAfter = new Date(date);
    // Event dates are stored as UTC midnight for a Manila calendar date.
    // Manila's end of day is therefore 15:59:59.999 UTC.
    dayAfter.setUTCHours(15, 59, 59, 999);
    if (eventEnd > dayAfter) return 'End time must be on the event date and after the start time.';
  }
  return '';
}

export function eventDateTime(date, time) {
  const result = new Date(date);
  if (time && /^\d{2}:\d{2}$/.test(time)) {
    const [hours, minutes] = time.split(':').map(Number);
    result.setUTCHours(hours - 8, minutes, 0, 0);
  } else result.setUTCHours(15, 59, 59, 999);
  return result;
}

export function validateTicketType(ticket, { eventDate, startTime } = {}) {
  const name = String(ticket?.name || '').trim();
  if (!name) return 'Ticket type name is required.';
  if (!Number.isFinite(Number(ticket.price)) || Number(ticket.price) < 0) return 'Ticket price must be zero or greater.';
  if (!Number.isInteger(Number(ticket.quantity)) || Number(ticket.quantity) < 1) return 'Ticket quantity must be a whole number of at least 1.';
  if (!Number.isInteger(Number(ticket.maxPerOrder)) || Number(ticket.maxPerOrder) < 1 || Number(ticket.maxPerOrder) > Number(ticket.quantity)) {
    return 'Maximum per order must be a whole number between 1 and the ticket quantity.';
  }
  const start = ticket.salesStart ? new Date(ticket.salesStart) : null;
  const end = ticket.salesEnd ? new Date(ticket.salesEnd) : null;
  if (start && Number.isNaN(start.getTime())) return 'Ticket sales start date is invalid.';
  if (end && Number.isNaN(end.getTime())) return 'Ticket sales end date is invalid.';
  if (start && end && start >= end) return 'Ticket sales must start before they end.';
  if (end && eventDate && end > eventDateTime(eventDate, startTime)) return 'Ticket sales must end by the event start date and time.';
  return '';
}

export function validateTicketTypes(tickets, capacity, { eventDate, startTime } = {}) {
  if (!Array.isArray(tickets)) return 'Ticket types must be an array.';
  if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) return 'Event capacity must be a whole number of at least 1.';
  const total = tickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
  if (total > Number(capacity)) return 'The total ticket quantities cannot exceed event capacity.';
  const names = new Set();
  for (const ticket of tickets) {
    const nameError = validateTicketType(ticket, { eventDate, startTime });
    if (nameError) return nameError;
    const key = String(ticket.name).trim().toLocaleLowerCase();
    if (names.has(key)) return 'Ticket type names must be unique within an event.';
    names.add(key);
  }
  return '';
}

export function isEventInPast(event, now = new Date()) {
  const date = new Date(event.date);
  if (!event.startTime) { date.setUTCHours(15, 59, 59, 999); return date <= now; }
  return eventDateTime(event.date, event.startTime) <= now;
}
