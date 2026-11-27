import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEventTimes, validateTicketType, validateTicketTypes, isEventInPast, eventDateTime, OPEN_ORDER_STATUSES } from '../services/eventRules.js';

const future = new Date(Date.now() + 7 * 86400000);

test('event capacity must be a positive integer and ticket quantities fit inside it', () => {
  const tiers = [{ name: 'General', price: 0, quantity: 3, maxPerOrder: 2 }, { name: 'VIP', price: 100, quantity: 2, maxPerOrder: 2 }];
  assert.equal(validateTicketTypes(tiers, 5, { eventDate: future }), '');
  assert.match(validateTicketTypes(tiers, 4, { eventDate: future }), /cannot exceed event capacity/);
  assert.match(validateTicketTypes(tiers, 5.5, { eventDate: future }), /whole number/);
});

test('ticket type validates required unique names, nonnegative prices, integer quantity and order max', () => {
  assert.match(validateTicketType({ name: ' ', price: 0, quantity: 2, maxPerOrder: 1 }), /name is required/);
  assert.match(validateTicketType({ name: 'VIP', price: -1, quantity: 2, maxPerOrder: 1 }), /price must be zero or greater/);
  assert.match(validateTicketType({ name: 'VIP', price: 1, quantity: 2.5, maxPerOrder: 1 }), /quantity must be a whole number/);
  assert.match(validateTicketType({ name: 'VIP', price: 1, quantity: 2, maxPerOrder: 3 }), /Maximum per order/);
  assert.match(validateTicketTypes([{ name: 'VIP', price: 1, quantity: 2, maxPerOrder: 2 }, { name: 'vip', price: 2, quantity: 2, maxPerOrder: 2 }], 4), /unique/);
});

test('ticket sales windows must be ordered and end by the event start', () => {
  const eventDate = new Date('2030-05-20T00:00:00Z');
  assert.match(validateTicketType({ name: 'GA', price: 1, quantity: 2, maxPerOrder: 1, salesStart: '2030-05-10', salesEnd: '2030-05-09' }, { eventDate }), /start before they end/);
  assert.match(validateTicketType({ name: 'GA', price: 1, quantity: 2, maxPerOrder: 1, salesEnd: '2030-05-21' }, { eventDate }), /end by the event/);
  assert.equal(validateEventTimes({ date: eventDate, startTime: '18:00', endTime: '17:00' }), 'End time must be after the start time.');
});

test('past events are detected while legacy order statuses remain included in reservations', () => {
  assert.equal(isEventInPast({ date: new Date('2020-01-01T00:00:00Z') }), true);
  assert.ok(OPEN_ORDER_STATUSES.includes('Pending'));
  assert.ok(OPEN_ORDER_STATUSES.includes('Pending Payment'));
  assert.ok(OPEN_ORDER_STATUSES.includes('Paid'));
});

test('event times use the Manila calendar day, including events later today', () => {
  const date = new Date('2030-05-20T00:00:00Z');
  assert.equal(eventDateTime(date, '18:00').toISOString(), '2030-05-20T10:00:00.000Z');
  assert.equal(isEventInPast({ date, startTime: '18:00' }, new Date('2030-05-20T09:00:00Z')), false);
  assert.equal(isEventInPast({ date, startTime: '18:00' }, new Date('2030-05-20T11:00:00Z')), true);
  assert.equal(validateEventTimes({ date, startTime: '09:00', endTime: '23:59' }), '');
});
