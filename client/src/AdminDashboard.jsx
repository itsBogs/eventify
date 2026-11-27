import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign, Search, ShieldAlert, Trash2, Users, X } from 'lucide-react';
import api from './api';

const date = value => value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const quickReasons = ['Inappropriate or obscene content', 'Scam or fraud', 'Illegal activity', 'Misleading information', 'Copyright violation'];

export default function AdminDashboard({ user, notify }) {
  const nav = useNavigate();
  const [tab, setTab] = useState('events');
  const [stats, setStats] = useState(null);
  const [result, setResult] = useState({ events: [], page: 1, pages: 0, total: 0 });
  const [logs, setLogs] = useState({ logs: [], page: 1, pages: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [moderationStatus, setModerationStatus] = useState('');
  const [category, setCategory] = useState('');
  const [host, setHost] = useState('');
  const [sortValue, setSortValue] = useState('createdAt:desc');
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logError, setLogError] = useState('');
  const [removing, setRemoving] = useState(null);
  const [reason, setReason] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStats = useCallback(async () => {
    const response = await api.get('/admin/stats');
    setStats(response.data);
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sort, order] = sortValue.split(':');
      const response = await api.get('/admin/events', { params: { page, limit: 10, search: search || undefined, status: status || undefined, moderationStatus: moderationStatus || undefined, category: category || undefined, host: host || undefined, sort, order } });
      setResult(response.data);
    } catch (e) { setError(e.message || 'Could not load events.'); }
    finally { setLoading(false); }
  }, [page, search, status, moderationStatus, category, host, sortValue]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true); setLogError('');
    try { const response = await api.get('/admin/logs', { params: { page: logPage, limit: 15 } }); setLogs(response.data); }
    catch (e) { setLogError(e.message || 'Could not load activity log.'); }
    finally { setLogsLoading(false); }
  }, [logPage]);

  useEffect(() => { if (user?.role !== 'admin') { nav('/', { replace: true }); return; } loadStats().catch(e => setError(e.message || 'Could not load admin statistics.')); }, [user, nav, loadStats]);
  useEffect(() => { if (user?.role === 'admin' && tab === 'events') loadEvents(); }, [user, tab, loadEvents]);
  useEffect(() => { if (user?.role === 'admin' && tab === 'logs') loadLogs(); }, [user, tab, loadLogs]);

  async function refresh() { await Promise.all([loadStats(), loadEvents(), tab === 'logs' ? loadLogs() : Promise.resolve()]); }
  async function removeEvent(e) {
    if (reason.trim().length < 5) return;
    setBusy(true);
    try { await api.patch(`/admin/events/${removing._id}/remove`, { reason: reason.trim(), adminNote: adminNote.trim() }); notify('Event removed from public listings.'); setRemoving(null); setReason(''); setAdminNote(''); await refresh(); }
    catch (e) { notify(e.message || 'Could not remove event.'); }
    finally { setBusy(false); }
  }
  async function restoreEvent(event) {
    setBusy(true);
    try { await api.patch(`/admin/events/${event._id}/restore`); notify('Event restored.'); await refresh(); }
    catch (e) { notify(e.message || 'Could not restore event.'); }
    finally { setBusy(false); }
  }
  async function deleteEvent() {
    if (confirmTitle !== deleting?.title) return;
    setBusy(true);
    try { await api.delete(`/admin/events/${deleting._id}`, { data: { confirmTitle } }); notify('Event permanently deleted.'); setDeleting(null); setConfirmTitle(''); await refresh(); }
    catch (e) { notify(e.message || 'Could not permanently delete event.'); }
    finally { setBusy(false); }
  }

  if (user?.role !== 'admin') return null;
  const statCards = [
    ['Total events', stats?.totalEvents, <CalendarDays/>], ['Active events', stats?.activeEvents, <Check/>], ['Removed events', stats?.removedEvents, <ShieldAlert/>],
    ['Total users', stats?.totalUsers, <Users/>], ['Hosts', stats?.hosts, <Users/>], ['Orders', stats?.orders, <CircleDollarSign/>],
  ];

  return <section className="dashboard section-wrap admin-page">
    <div className="admin-heading"><div><span className="eyebrow muted"><ShieldAlert size={14}/> SUPER ADMIN</span><h1>Moderation center</h1><p className="page-subtitle">Review event listings and keep Eventify safe for everyone.</p></div></div>
    <div className="admin-stat-grid">{statCards.map(([label, value, icon]) => <article className="admin-stat-card" key={label}><span>{icon}</span><small>{label}</small><b>{value ?? '—'}</b></article>)}</div>
    <div className="admin-tabs"><button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}><CalendarDays size={16}/> Events</button><button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}><Activity size={16}/> Activity log</button></div>
    {tab === 'events' ? <section className="panel admin-panel"><div className="admin-toolbar"><div className="admin-search"><Search size={17}/><input aria-label="Search events or hosts" placeholder="Search event, venue, or host" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></div><input aria-label="Filter host" placeholder="Host name or email" value={host} onChange={e => { setHost(e.target.value); setPage(1); }}/><select aria-label="Filter event status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All event statuses</option>{['Draft','Published','Completed','Cancelled'].map(x => <option key={x}>{x}</option>)}</select><select aria-label="Filter moderation" value={moderationStatus} onChange={e => { setModerationStatus(e.target.value); setPage(1); }}><option value="">All moderation</option><option value="active">Active</option><option value="removed">Removed</option></select><select aria-label="Filter category" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option value="">All categories</option>{['Music','Concert','Seminar','Conference','Workshop','Sports','Festival','Educational','Other'].map(x => <option key={x}>{x}</option>)}</select><select aria-label="Sort events" value={sortValue} onChange={e => { setSortValue(e.target.value); setPage(1); }}><option value="createdAt:desc">Newest added</option><option value="createdAt:asc">Oldest added</option><option value="date:asc">Event date: soonest</option><option value="date:desc">Event date: latest</option><option value="title:asc">Title: A to Z</option><option value="title:desc">Title: Z to A</option></select></div>
      {loading ? <div className="admin-empty">Loading events…</div> : error ? <div className="admin-empty admin-error">{error}<button className="button button-light" onClick={loadEvents}>Retry</button></div> : result.events.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Event</th><th>Host</th><th>Category</th><th>Date</th><th>Status</th><th>Moderation</th><th>Actions</th></tr></thead><tbody>{result.events.map(event => <tr key={event._id}><td><div className="admin-event-cell">{event.image ? <img src={event.image} alt=""/> : <span className="admin-event-placeholder"><CalendarDays size={16}/></span>}<b>{event.title}</b></div></td><td>{event.organizer?.name || 'Unknown'}<small>{event.organizer?.email}</small></td><td>{event.category}</td><td>{date(event.date)}</td><td>{event.status}</td><td><span className={`moderation-badge ${event.moderation?.status === 'removed' ? 'removed' : 'active'}`}>{event.moderation?.status === 'removed' ? 'Removed' : 'Active'}</span></td><td><div className="admin-row-actions"><Link className="button button-light button-sm" to={`/events/${event._id}`}>View</Link>{event.moderation?.status === 'removed' ? <><button className="button button-light button-sm" disabled={busy} onClick={() => restoreEvent(event)}>Restore</button><button className="button button-danger button-sm" disabled={busy} onClick={() => { setDeleting(event); setConfirmTitle(''); }}>Delete permanently</button></> : <button className="button button-danger button-sm" disabled={busy} onClick={() => { setRemoving(event); setReason(''); setAdminNote(''); }}>Remove</button>}</div></td></tr>)}</tbody></table></div> : <div className="admin-empty">No events match these filters.</div>}
      <div className="admin-pagination"><span>{result.total || 0} events · Page {result.page || page} of {Math.max(result.pages || 0, 1)}</span><button className="button button-light button-sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}><ChevronLeft size={15}/> Previous</button><button className="button button-light button-sm" disabled={page >= (result.pages || 1) || loading} onClick={() => setPage(page + 1)}>Next <ChevronRight size={15}/></button></div>
    </section> : <section className="panel admin-panel"><div className="panel-heading"><div><span className="eyebrow muted">AUDIT TRAIL</span><h2>Admin activity</h2></div><span className="pill">{logs.total} records</span></div>{logsLoading?<div className="admin-empty">Loading activity…</div>:logError?<div className="admin-empty admin-error">{logError}<button className="button button-light" onClick={loadLogs}>Retry</button></div>:logs.logs.length ? <div className="admin-log-list">{logs.logs.map(log => <article key={log._id}><span className={`moderation-badge ${log.action === 'remove' ? 'removed' : 'active'}`}>{log.action}</span><div><b>{log.targetTitle}</b><small>{log.admin?.name || 'Admin'} · {new Date(log.createdAt).toLocaleString('en-PH')}</small>{log.reason && <p>{log.reason}</p>}</div></article>)}</div> : <div className="admin-empty">No moderation actions recorded yet.</div>}<div className="admin-pagination"><span>{logs.total} records · Page {logs.page || logPage} of {Math.max(logs.pages || 0, 1)}</span><button className="button button-light button-sm" disabled={logPage <= 1||logsLoading} onClick={() => setLogPage(logPage - 1)}><ChevronLeft size={15}/> Previous</button><button className="button button-light button-sm" disabled={logPage >= (logs.pages || 1)||logsLoading} onClick={() => setLogPage(logPage + 1)}>Next <ChevronRight size={15}/></button></div></section>}
    {removing && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setRemoving(null); }}><section className="create-modal pro-modal admin-modal"><button className="modal-close" onClick={() => setRemoving(null)} aria-label="Close"><X/></button><span className="eyebrow muted">EVENT MODERATION</span><h2>Remove “{removing.title}”?</h2><p>This hides the event and disables its tickets. Existing orders and ticket history stay saved.</p><div className="admin-reason-picks">{quickReasons.map(item => <button type="button" key={item} className={reason === item ? 'selected' : ''} onClick={() => setReason(item)}>{item}</button>)}</div><label>Removal reason<textarea rows="3" minLength="5" maxLength="500" required value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this event is being removed."/></label><label>Private admin note (optional)<textarea rows="2" maxLength="1000" value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Internal note for the moderation record."/></label><div className="modal-actions"><button className="button button-light" onClick={() => setRemoving(null)}>Cancel</button><button className="button button-danger" disabled={busy || reason.trim().length < 5} onClick={removeEvent}>{busy ? 'Removing…' : 'Remove event'}</button></div></section></div>}
    {deleting && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setDeleting(null); }}><section className="create-modal pro-modal admin-modal"><button className="modal-close" onClick={() => setDeleting(null)} aria-label="Close"><X/></button><span className="eyebrow muted">PERMANENT DELETE</span><h2>Delete “{deleting.title}” permanently?</h2><p>This cannot be undone. Deletion is blocked while order or ticket records exist. Type the event title exactly to confirm.</p><label>Event title<input value={confirmTitle} onChange={e => setConfirmTitle(e.target.value)} placeholder={deleting.title}/></label><div className="modal-actions"><button className="button button-light" onClick={() => setDeleting(null)}>Cancel</button><button className="button button-danger" disabled={busy || confirmTitle !== deleting.title} onClick={deleteEvent}>{busy ? 'Deleting…' : <><Trash2 size={15}/> Delete permanently</>}</button></div></section></div>}
  </section>;
}
