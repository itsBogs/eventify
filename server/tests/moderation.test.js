import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Event from '../models/Event.js';
import { requireAdmin } from '../middleware/auth.js';
import { markEventRemoved, restoreEventModeration, disableTicketsForRemovedEvent, restoreTicketsAfterEventRestored } from '../services/eventModeration.js';

test('requireAdmin rejects an authenticated non-admin with 403', async () => {
  const oldSecret = process.env.JWT_SECRET;
  const oldFindById = User.findById;
  process.env.JWT_SECRET = 'moderation-test-secret';
  User.findById = async () => ({ role: 'attendee' });
  let statusCode;
  let nextCalled = false;
  const res = { status(code) { statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  try {
    await requireAdmin({ cookies: { token: jwt.sign({ id: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET) }, headers: {} }, res, () => { nextCalled = true; });
    assert.equal(statusCode, 403);
    assert.equal(res.body.success, false);
    assert.equal(nextCalled, false);
  } finally {
    User.findById = oldFindById;
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  }
});

test('removing an event disables its tickets and restoring it reinstates their prior states', () => {
  const event = new Event({ title: 'Test event', description: 'Test', date: new Date(Date.now() + 86400000), venue: 'Hall', capacity: 5, organizer: '507f1f77bcf86cd799439011' });
  const tickets = [{ status: 'Valid' }, { status: 'Checked In' }, { status: 'Cancelled' }];
  markEventRemoved(event, { adminId: '507f1f77bcf86cd799439012', reason: 'Scam or fraud', adminNote: '', now: new Date('2026-01-01T00:00:00Z') });
  disableTicketsForRemovedEvent(tickets);
  assert.equal(event.moderation.status, 'removed');
  assert.equal(event.moderation.reason, 'Scam or fraud');
  assert.deepEqual(tickets.map(ticket => ticket.status), ['Event Removed', 'Event Removed', 'Event Removed']);
  assert.equal(restoreEventModeration(event), 'Scam or fraud');
  restoreTicketsAfterEventRestored(tickets);
  assert.equal(event.moderation.status, 'active');
  assert.deepEqual(tickets.map(ticket => ticket.status), ['Valid', 'Checked In', 'Cancelled']);
});
