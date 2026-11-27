export function markEventRemoved(event, { adminId, reason, adminNote = '', now = new Date() }) {
  event.moderation = { status: 'removed', reason: reason.trim(), removedBy: adminId, removedAt: now, adminNote: adminNote.trim() };
  return event;
}

export function restoreEventModeration(event) {
  const reason = event.moderation?.reason || '';
  event.moderation = { status: 'active', reason: '', removedBy: null, removedAt: null, adminNote: '' };
  return reason;
}

export function disableTicketsForRemovedEvent(tickets) {
  for (const ticket of tickets) {
    if (ticket.status === 'Event Removed') continue;
    ticket.statusBeforeRemoval = ticket.status;
    ticket.status = 'Event Removed';
  }
  return tickets;
}

export function restoreTicketsAfterEventRestored(tickets) {
  for (const ticket of tickets) {
    ticket.status = ticket.statusBeforeRemoval || 'Valid';
    ticket.statusBeforeRemoval = undefined;
  }
  return tickets;
}
