import React, { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, CalendarDays, MapPin, Search, Ticket, UserRound,
  Plus, LayoutDashboard, LogOut, Menu, X, Users, ChartNoAxesCombined, Check,
  Clock3, Sparkles, ChevronDown, Music2, Compass, CircleDollarSign, ShieldCheck,
  QrCode, ArrowLeft, ChevronUp, Eye, EyeOff, Zap, Heart, Star, Globe2,
  Headphones, GraduationCap, Trophy, PartyPopper, Presentation, AlertCircle, Loader2
} from 'lucide-react';
import api from './api';
import HeroCarousel from './HeroCarousel.jsx';
import ManageEventPro from './ManageEventPro.jsx';
import eventifyMark from './assets/eventify-mark.svg';
import eventifyLogo from './assets/logo.png';

const C = createContext(null);
const useAuth = () => useContext(C);
const money = n => `\u20B1${Number(n || 0).toLocaleString('en-PH')}`;
const date = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const err = e => e?.message || 'Something went wrong';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(x => setUser(x.data.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function notify(v) {
    setToast(v);
    setTimeout(() => setToast(''), 3200);
  }

  if (loading)
    return (
      <div className="loading">
        <img className="brand-mark" src={eventifyMark} alt="" />
        <span>Loading your next moment...</span>
      </div>
    );

  return (
    <C.Provider value={{ user, setUser, notify }}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/events/:id" element={<EventPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/manage/:id" element={<ManageEventPro />} />
        </Route>
      </Routes>
      {toast && (
        <div className="toast">
          <Check size={16} />
          {toast}
        </div>
      )}
      <button
        className={`back-to-top${showTop ? ' visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <ChevronUp size={20} />
      </button>
    </C.Provider>
  );
}

function Shell() {
  const { user, setUser } = useAuth();
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function logout() {
    await api.post('/auth/logout');
    setUser(null);
    nav('/');
  }

  return (
    <>
      <header className={`topbar${scrolled ? ' scrolled' : ''}`}>
        <div className="topbar-inner">
        <Link className="brand" to="/">
          <img className="brand-logo" src={eventifyLogo} alt="Eventify — Events, Tickets, Memories" />
        </Link>

        <nav id="primary-navigation" className={mobile ? 'nav open' : 'nav'} aria-label="Main navigation">
          <a href="#discover">Discover</a>
          <a href="#browse-categories">Categories</a>
          <a href="#how-it-works">How it Works</a>
          <a href="#organizers">For Organizers</a>
          {user?.role === 'organizer' && <Link to="/dashboard">Organizer dashboard</Link>}
          {user?.role === 'attendee' && (
            <>
              <Link to="/orders">My orders</Link>
              <Link to="/tickets">My tickets</Link>
            </>
          )}
        </nav>

        <div className="header-actions">
          {user ? (
            <div className="user-dropdown-wrap" onMouseLeave={() => setDropdown(false)}>
              <button className="user-trigger" onClick={() => setDropdown(!dropdown)}>
                <div className="avatar">{user.name?.[0]}</div>
                <span className="user-name">{user.name?.split(' ')[0]}</span>
                <ChevronDown size={14} />
              </button>
              {dropdown && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="avatar">{user.name?.[0]}</div>
                    <div>
                      <b>{user.name}</b>
                      <small>{user.email}</small>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  {user.role === 'attendee' && (
                    <>
                      <Link to="/orders" className="dropdown-item" onClick={() => setDropdown(false)}>
                        <Ticket size={15} /> My Orders
                      </Link>
                      <Link to="/tickets" className="dropdown-item" onClick={() => setDropdown(false)}>
                        <QrCode size={15} /> My Tickets
                      </Link>
                    </>
                  )}
                  {user.role === 'organizer' && (
                    <Link to="/dashboard" className="dropdown-item" onClick={() => setDropdown(false)}>
                      <LayoutDashboard size={15} /> Dashboard
                    </Link>
                  )}
                  <div className="dropdown-divider" />
                  <button className="dropdown-item dropdown-logout" onClick={() => { logout(); setDropdown(false); }}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className="sign-link" to="/login">Log in</Link>
              <Link className="button button-dark button-sm" to="/register">
                Buy ticket <ArrowRight size={15} />
              </Link>
            </>
          )}
          <button className="mobile-toggle" onClick={() => setMobile(!mobile)} aria-label={mobile ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobile} aria-controls="primary-navigation">
            {mobile ? <X /> : <Menu />}
          </button>
        </div>
        </div>
      </header>

      <main>
        <RoutesOutlet />
      </main>

      <footer>
        <div className="footer-grid section-wrap">
          <div className="footer-brand">
            <Link className="brand" to="/">
              <img className="brand-logo" src={eventifyLogo} alt="Eventify — Events, Tickets, Memories" />
            </Link>
            <p>Find your people. Make a moment.</p>
            <div className="footer-social">
              <a href="#" aria-label="Twitter"><Globe2 size={18} /></a>
              <a href="#" aria-label="Instagram"><Heart size={18} /></a>
              <a href="#" aria-label="Facebook"><Users size={18} /></a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <a href="#discover">Browse Events</a>
            <a href="#browse-categories">Categories</a>
            <Link to="/register">Create Account</Link>
          </div>
          <div className="footer-col">
            <h4>Organizers</h4>
            <Link to="/register">Start Hosting</Link>
            <a href="#how-it-works">How It Works</a>
            <Link to="/login">Organizer Login</Link>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Contact Us</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom section-wrap">
          <span>(c) 2026 Eventify | Group 8</span>
          <span>Made for moments worth showing up for</span>
        </div>
      </footer>
    </>
  );
}

function RoutesOutlet() {
  return (
    <React.Fragment>
      {/* nested routes are rendered by router outlet */}
      <OutletCompat />
    </React.Fragment>
  );
}

import { Outlet as OutletCompat } from 'react-router-dom';

function Home() {
  const [events, setEvents] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All events');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let t = setTimeout(
      () =>
        api.get('/events', {
          params: {
            search: q || undefined,
            category: category === 'All events' ? undefined : category,
          },
        })
          .then(x => setEvents(x.data))
          .catch(() => setEvents([]))
          .finally(() => setLoading(false)),
      180
    );
    return () => clearTimeout(t);
  }, [q, category]);

  const cats = ['All events', 'Music', 'Conference', 'Workshop', 'Sports', 'Festival', 'Educational'];

  return (
    <div className="eventcon-home">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="pulse" /> YOUR EVENTS. ALL IN ONE PLACE.
          </div>
          <h1>
            Events made<br /><span className="accent-word">easy</span> to plan <span className="serif">and attend.</span>
          </h1>
          <p>
            Discover upcoming events, reserve tickets, and manage attendance through one connected event platform.
          </p>
          <div className="hero-buttons">
            <a href="#discover" className="button button-dark">
              Explore events <ArrowRight size={16} />
            </a>
            <Link to="/register" className="text-button">
              Host an event <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="social-proof">
            <div className="avatar-stack">
              <span>J</span>
              <span>M</span>
              <span>A</span>
              <span>+</span>
            </div>
            <span>Made for moments worth showing up for</span>
          </div>
        </div>
        <HeroCarousel events={events} />
        <div className="hero-orb" />
      </section>

      {/* ── Stats Row ── */}
      <section className="stats-row" aria-label="Event discovery highlights">
        <div className="stats-row-inner section-wrap">
          <div className="stat-pill"><Zap size={18} /><div><b>Discover</b><span>Events for every interest</span></div></div>
          <div className="stat-pill"><Users size={18} /><div><b>Connect</b><span>Meet your community</span></div></div>
          <div className="stat-pill"><Ticket size={18} /><div><b>Reserve</b><span>Tickets in a few steps</span></div></div>
          <div className="stat-pill"><ShieldCheck size={18} /><div><b>Attend</b><span>Simple QR check-in</span></div></div>
        </div>
      </section>

      {/* ── Discover ── */}
      <section className="discover section-wrap" id="discover">
        <div className="section-head">
          <div>
            <div className="eyebrow muted"><Compass size={14} /> DISCOVER EVENTS</div>
            <h2>Find the right <span className="serif">event.</span></h2>
            <p>Browse published events by category, date, and location.</p>
          </div>
          <Link className="text-button desktop-only" to="/">
            View all events <ArrowRight size={15} />
          </Link>
        </div>

        <div className="search-row">
          <div className="search-box">
            <Search size={18} />
            <input
              aria-label="Search events"
              placeholder="Search events, places, or ideas..."
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            <span className="search-shortcut">Ctrl + K</span>
          </div>
          <button
            className="filter-button"
            onClick={() => document.getElementById('categories').scrollIntoView({ behavior: 'smooth' })}
          >
            Filters <ChevronDown size={15} />
          </button>
        </div>

        <div className="category-list" id="categories">
          {cats.map(c => (
            <button
              key={c}
              className={category === c ? 'category active' : 'category'}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c === 'Music' && <Music2 size={14} />} {c}
            </button>
          ))}
        </div>

        <div className="results-label">
          <span>
            {loading ? 'Finding events' : `${events.length} ${events.length === 1 ? 'event' : 'events'} to get into`}
          </span>
          <span className="sort-label">Sorted by event date</span>
        </div>

        {loading ? (
          <div className="event-grid">
            {[1, 2, 3].map(i => (
              <div className="skeleton-card" key={i}>
                <div className="skeleton skeleton-image" />
                <div className="skeleton-body">
                  <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '85%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : events.length ? (
          <div className="event-grid">
            {events.map((e, i) => (
              <EventCard key={e._id} event={e} index={i} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon"><CalendarDays /></span>
            <h3>No plans just yet</h3>
            <p>Try another search or category. Something good will turn up.</p>
            <button className="button button-light" onClick={() => { setQ(''); setCategory('All events'); }}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* ── How It Works ── */}
      <section className="how-it-works" id="how-it-works">
        <div className="how-it-works-inner section-wrap">
          <div className="eyebrow muted"><Sparkles size={14} /> HOW IT WORKS</div>
          <h2>Three steps to your <span className="serif">next moment.</span></h2>
          <p className="how-subtitle">Getting started takes less than a minute.</p>
          <div className="how-steps">
            <div className="how-step">
              <div className="step-icon"><Search size={26} /></div>
              <div className="step-number">STEP 01</div>
              <h3>Discover Events</h3>
              <p>Browse curated events by category, location, or date. Find concerts, workshops, conferences, and more.</p>
            </div>
            <div className="how-step">
              <div className="step-icon"><Ticket size={26} /></div>
              <div className="step-number">STEP 02</div>
              <h3>Reserve Your Spot</h3>
              <p>Choose your ticket type, select your quantity, and complete a quick secure checkout.</p>
            </div>
            <div className="how-step">
              <div className="step-icon"><PartyPopper size={26} /></div>
              <div className="step-number">STEP 03</div>
              <h3>Show Up &amp; Enjoy</h3>
              <p>Get your QR ticket instantly. Present it at the venue for a smooth check-in experience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Browse by Category ── */}
      <section className="browse-categories section-wrap" id="browse-categories">
        <div className="eyebrow muted"><Compass size={14} /> BROWSE BY CATEGORY</div>
        <h2>Find events that <span className="serif">fit you.</span></h2>
        <div className="cat-grid">
          {[
            { icon: <Music2 size={22} />, label: 'Music' },
            { icon: <Presentation size={22} />, label: 'Conference' },
            { icon: <GraduationCap size={22} />, label: 'Workshop' },
            { icon: <Trophy size={22} />, label: 'Sports' },
            { icon: <PartyPopper size={22} />, label: 'Festival' },
            { icon: <Headphones size={22} />, label: 'Educational' },
          ].map(cat => (
            <button
              key={cat.label}
              className="cat-card"
              onClick={() => {
                setCategory(cat.label);
                document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div className="cat-icon">{cat.icon}</div>
              <span>{cat.label}</span>
              <small>Explore events</small>
            </button>
          ))}
        </div>
      </section>

      {/* ── Host Banner ── */}
      <section className="host-banner" id="organizers">
        <div className="banner-orb" />
        <div>
          <div className="eyebrow">EVENT ORGANIZERS</div>
          <h2>
            Manage your event<br />from <span className="serif">start to finish.</span>
          </h2>
          <p>
            Create events, configure ticket types, monitor sales, and coordinate attendee check-in — all in one powerful dashboard.
          </p>
          <div className="host-features">
            <span><Check size={15} /> Easy event creation</span>
            <span><Check size={15} /> Real-time analytics</span>
            <span><Check size={15} /> QR check-in system</span>
          </div>
        </div>
        <Link className="button button-white" to="/register">
          Start hosting <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}

const photos = [
  'photo-1506157786151-b8491531f063',
  'photo-1514525253161-7a46d19cd819',
  'photo-1540575467063-178a50c2df87',
  'photo-1511795409834-ef04bbd61622',
];

function EventCard({ event: e, index = 0 }) {
  const cover = e.image || `https://images.unsplash.com/${photos[index % photos.length]}?auto=format&fit=crop&w=850&q=80`;
  const tickets = e.tickets || [];
  const activeTickets = tickets.filter(t => t.active);
  const totalSold = tickets.reduce((n, t) => n + (Number(t.sold) || 0), 0);
  const totalQty = tickets.reduce((n, t) => n + (Number(t.quantity) || 0), 0);
  const minPrice = activeTickets.length ? Math.min(...activeTickets.map(t => Number(t.price) || 0)) : null;
  const isFree = minPrice === 0;
  const isSoldOut = totalQty > 0 && totalSold >= totalQty;
  const fewLeft = !isSoldOut && totalQty > 0 && (totalQty - totalSold) <= 10;

  return (
    <Link to={`/events/${e._id}`} className="event-card">
      <div className="event-cover">
        <img src={cover} alt={e.title} />
        <span className="cover-category">{e.category}</span>
        {isSoldOut && <span className="cover-badge sold-out">Sold Out</span>}
        {fewLeft && <span className="cover-badge few-left">Few Tickets Left</span>}
        {isFree && !isSoldOut && <span className="cover-badge free-badge">Free</span>}
      </div>
      <div className="event-info">
        <div className="event-date">
          <CalendarDays size={14} />
          {date(e.date)}
          {e.startTime && <span> | {e.startTime}</span>}
        </div>
        <h3>{e.title}</h3>
        <div className="event-location">
          <MapPin size={14} /><span>{e.venue}</span>
        </div>
        <div className="event-bottom">
          <span className="event-price">
            {minPrice === null ? 'Tickets unavailable' : isFree ? 'Free' : `From ${money(minPrice)}`}
          </span>
          <span className="attendee-count">
            <Users size={14} />{totalSold} going
          </span>
        </div>
      </div>
    </Link>
  );
}

function EventPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [qty, setQty] = useState({});
  const [busy, setBusy] = useState(false);
  const { user, notify } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(x => setEvent(x.data))
      .catch(e => notify(err(e)));
  }, [id]);

  if (!event) return <div className="loading">Loading event...</div>;

  async function buy(ticket) {
    if (!user) { nav('/login'); return; }
    if (user.role !== 'attendee') { notify('Attendee accounts can purchase tickets.'); return; }
    setBusy(true);
    try {
      const o = await api.post('/orders', { eventId: id, ticketTypeId: ticket._id, quantity: qty[ticket._id] || 1 });
      const p = await api.post(`/orders/${o.data._id}/demo-payment`);
      notify('Your tickets are confirmed and ready.');
      nav('/tickets');
    } catch (e) {
      notify(err(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="event-detail section-wrap">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> All events</Link>
      <div className="detail-grid">
        <div className="detail-main">
          <img
            className="detail-image"
            src={event.image || `https://images.unsplash.com/${photos[0]}?auto=format&fit=crop&w=1400&q=85`}
            alt={event.title}
          />
          <div className="detail-meta">
            <span className="pill">{event.category}</span>
            <span>Hosted by {event.organizer?.organization || event.organizer?.name || 'Event organizer'}</span>
          </div>
          <h1>{event.title}</h1>
          <div className="detail-facts">
            <span><CalendarDays />{date(event.date)}  |  {event.startTime}-{event.endTime}</span>
            <span><MapPin />{event.venue}{event.address && `, ${event.address}`}</span>
          </div>
          <h3>About this event</h3>
          <p className="detail-description">{event.description}</p>
        </div>

        <aside className="ticket-box">
          <div className="eyebrow muted">SAVE YOUR SPOT</div>
          <h3>Choose your ticket</h3>
          {event.tickets?.filter(t => t.active).map(t => (
            <div className="ticket-option" key={t._id}>
              <div>
                <b>{t.name}</b>
                <small>{t.description || `${Math.max(0, t.quantity - t.sold)} spots left`}</small>
              </div>
              <strong>{money(t.price)}</strong>
              <select
                aria-label={`${t.name} quantity`}
                value={qty[t._id] || 1}
                onChange={e => setQty({ ...qty, [t._id]: Number(e.target.value) })}
              >
                {Array.from(
                  { length: Math.min(5, t.maxPerOrder, Math.max(1, t.quantity - t.sold)) },
                  (_, i) => <option key={i} value={i + 1}>{i + 1}</option>
                )}
              </select>
              <button
                disabled={busy || t.sold >= t.quantity || new Date(event.date) < new Date()}
                onClick={() => buy(t)}
                className="button button-dark buy-button"
              >
                {busy ? 'Working...' : 'Get tickets'} <ArrowRight size={15} />
              </button>
            </div>
          ))}
          <p className="secure-note"><ShieldCheck size={15} /> Secure checkout  |  Demo payment</p>
        </aside>
      </div>
    </section>
  );
}

function AuthPage({ register = false }) {
  const { setUser, notify } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'attendee' });
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const x = await api.post(`/auth/${register ? 'register' : 'login'}`, form);
      setUser(x.data.user);
      notify(register ? 'Welcome to Eventify!' : 'Welcome back!');
      nav(x.data.user.role === 'organizer' ? '/dashboard' : '/');
    } catch (e) {
      notify(err(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-wrap">
      <div className="auth-photo">
        <img src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1100&q=85" />
        <div className="auth-photo-copy">
          <span className="eyebrow">MAKE ROOM FOR MORE</span>
          <h2>The best stories<br />start with <span className="serif">showing up.</span></h2>
        </div>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to discovering</Link>
        <div className="eyebrow muted">{register ? 'YOUR NEXT CHAPTER' : 'GOOD TO SEE YOU'}</div>
        <h1>{register ? 'Join the good stuff.' : 'Welcome back.'}</h1>
        <p>{register ? 'One account. A lot more to look forward to.' : 'Your next great plan is just around the corner.'}</p>
        {register && (
          <>
            <label>
              Your name
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alex Morgan" />
            </label>
            <label>
              I'm here to...
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="attendee">Find great events</option>
                <option value="organizer">Host an event</option>
              </select>
            </label>
          </>
        )}
        <label>
          Email address
          <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        </label>
        <label>
          Password
          <div className="password-wrap">
            <input
              required
              type={showPw ? 'text' : 'password'}
              minLength="8"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
        <button className="button button-dark auth-submit" disabled={busy}>
          {busy ? 'Please wait...' : register ? 'Create your account' : 'Log in'} <ArrowRight size={16} />
        </button>
        <div className="auth-switch">
          {register ? 'Already part of the community?' : 'New around here?'}{' '}
          <Link to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Create an account'}</Link>
        </div>
      </form>
    </section>
  );
}

function Dashboard() {
  const { user, notify } = useAuth();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    tickets: [
      { name: 'General Admission', price: 350, quantity: 100, maxPerOrder: 5 },
      { name: 'VIP', price: 700, quantity: 30, maxPerOrder: 3 },
    ],
    category: 'Music',
    status: 'Draft',
    capacity: 130,
  });
  const nav = useNavigate();

  useEffect(() => {
    if (!user) { nav('/login'); return; }
    if (user.role !== 'organizer') { nav('/'); return; }
    api.get('/events/mine').then(x => setEvents(x.data));
    api.get('/organizer/dashboard').then(x => setStats(x.data)).catch(() => {});
  }, [user]);

  async function create(e) {
    e.preventDefault();
    try {
      await api.post('/events', {
        ...form,
        date: new Date(form.date),
        capacity: Number(form.capacity),
        tickets: form.tickets.map(t => ({ ...t, price: Number(t.price), quantity: Number(t.quantity) })),
      });
      notify('Event created. Add details and publish when ready.');
      setModal(false);
      api.get('/events/mine').then(x => setEvents(x.data));
      api.get('/organizer/dashboard').then(x => setStats(x.data));
    } catch (e) {
      notify(err(e));
    }
  }

  if (!user || user.role !== 'organizer') return null;

  return (
    <section className="dashboard section-wrap">
      <div className="dash-welcome">
        <div>
          <div className="eyebrow muted"><LayoutDashboard size={14} /> ORGANIZER STUDIO</div>
          <h1>Good morning, {user.name?.split(' ')[0]}<span className="brand-dot">.</span></h1>
          <p>Your events are where the good stuff starts.</p>
        </div>
        <button className="button button-dark" onClick={() => setModal(true)}>
          <Plus size={17} /> Create event
        </button>
      </div>

      <div className="stat-grid">
        <Stat icon={<CalendarDays />} label="Total events" value={stats.events || events.length} note="Your event lineup" />
        <Stat icon={<Ticket />} label="Tickets sold" value={stats.tickets || 0} note="Across all your events" />
        <Stat icon={<CircleDollarSign />} label="Ticket revenue" value={money(stats.revenue)} note="From completed orders" />
        <Stat icon={<Clock3 />} label="Coming up" value={stats.upcoming || 0} note="Events on the calendar" />
      </div>

      <div className="dashboard-section-title">
        <div>
          <h2>Your events</h2>
          <p>Manage your lineup and see how each event is doing.</p>
        </div>
        <span className="pill">{events.length} total</span>
      </div>

      {events.length ? (
        <div className="manage-list">
          {events.map((e, i) => (
            <Link className="manage-row" to={`/manage/${e._id}`} key={e._id}>
              <img src={e.image || `https://images.unsplash.com/${photos[i % photos.length]}?auto=format&fit=crop&w=160&q=70`} />
              <div className="manage-event">
                <b>{e.title}</b>
                <span><CalendarDays size={14} />{date(e.date)} <i> | </i> <MapPin size={14} />{e.venue}</span>
              </div>
              <span className={`status ${e.status.toLowerCase()}`}>{e.status}</span>
              <span className="manage-sales">{e.tickets?.reduce((n, t) => n + t.sold, 0) || 0} tickets sold</span>
              <ArrowUpRight size={17} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><CalendarDays /></span>
          <h3>Your first event starts here</h3>
          <p>Give your community something to look forward to.</p>
          <button className="button button-dark" onClick={() => setModal(true)}>
            <Plus size={16} /> Create your first event
          </button>
        </div>
      )}

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <form className="create-modal" onSubmit={create} onClick={e => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setModal(false)}><X /></button>
            <div className="eyebrow muted">THE FIRST STEP</div>
            <h2>Start something good.</h2>
            <p>Tell us the basics. You can polish the details and ticket types later.</p>
            <label>
              Event name
              <input required value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sunday Sessions" />
            </label>
            <div className="form-two">
              <label>
                Category
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {['Music', 'Concert', 'Seminar', 'Conference', 'Workshop', 'Sports', 'Festival', 'Educational', 'Other'].map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input required type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
              </label>
            </div>
            <div className="form-two">
              <label>
                Venue
                <input required value={form.venue || ''} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="Venue name" />
              </label>
              <label>
                Capacity
                <input required type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
              </label>
            </div>
            <label>
              Description
              <textarea required rows="3" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What makes this one special?" />
            </label>
            <div className="form-two">
              <label>
                Start time
                <input type="time" value={form.startTime || ''} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </label>
              <label>
                End time
                <input type="time" value={form.endTime || ''} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </label>
            </div>
            <button className="button button-dark auth-submit">Create draft <ArrowRight size={16} /></button>
          </form>
        </div>
      )}
    </section>
  );
}

function Stat({ icon, label, value, note }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </div>
  );
}

function ManageEvent() {
  const { id } = useParams();
  const { user, notify } = useAuth();
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!user) { location.href = '/login'; return; }
    api.get(`/events/${id}`).then(x => setEvent(x.data)).catch(e => notify(err(e)));
    api.get(`/events/${id}/analytics`).then(x => setAnalytics(x.data)).catch(() => {});
  }, [id]);

  async function status(s) {
    try {
      const x = await api.patch(`/events/${id}/status`, { status: s });
      setEvent(x.data);
      notify(`Event ${s.toLowerCase()}.`);
    } catch (e) {
      notify(err(e));
    }
  }

  async function checkin(e) {
    e.preventDefault();
    try {
      const x = await api.post(`/events/${id}/check-in`, { code });
      setResult({ ok: true, message: `Checked in ${x.data.ticketType} ticket` });
      setCode('');
      api.get(`/events/${id}/analytics`).then(x => setAnalytics(x.data));
    } catch (e) {
      setResult({ ok: false, message: err(e) });
    }
  }

  if (!event) return <div className="loading">Loading event...</div>;

  return (
    <section className="dashboard section-wrap">
      <Link to="/dashboard" className="back-link"><ArrowLeft size={16} /> Organizer dashboard</Link>
      <div className="dash-welcome manage-title">
        <div>
          <div className="eyebrow muted">EVENT MANAGEMENT</div>
          <h1>{event.title}</h1>
          <p><CalendarDays size={15} />{date(event.date)}  |  <MapPin size={15} />{event.venue}</p>
        </div>
        <div className="manage-actions">
          <span className={`status ${event.status.toLowerCase()}`}>{event.status}</span>
          {event.status === 'Published' ? (
            <button onClick={() => status('Draft')} className="button button-light">Unpublish</button>
          ) : (
            <button onClick={() => status('Published')} className="button button-dark">
              Publish event <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <Stat icon={<Ticket />} label="Tickets sold" value={analytics?.sold || 0} note={`${analytics?.remaining ?? event.capacity} spots remaining`} />
        <Stat icon={<CircleDollarSign />} label="Revenue" value={money(analytics?.revenue)} note="Paid ticket sales" />
        <Stat icon={<Check />} label="Checked in" value={analytics?.checkedIn || 0} note="Attendees arrived" />
        <Stat icon={<Users />} label="Capacity" value={event.capacity} note="Maximum attendance" />
      </div>

      <div className="management-grid">
        <div className="panel">
          <h3>Ticket types</h3>
          {event.tickets?.map(t => (
            <div className="ticket-admin" key={t._id}>
              <div>
                <b>{t.name}</b>
                <small>{t.sold} sold  |  {t.quantity} available</small>
              </div>
              <strong>{money(t.price)}</strong>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3>Check in an attendee</h3>
          <p>Enter the unique code from an attendee's ticket.</p>
          <form className="checkin-form" onSubmit={checkin}>
            <input required placeholder="e.g. 7A9C3E18" value={code} onChange={e => setCode(e.target.value.toUpperCase())} />
            <button className="button button-dark"><QrCode size={16} /> Verify</button>
          </form>
          {result && (
            <div className={result.ok ? 'check-result good' : 'check-result bad'}>
              {result.ok ? <Check size={17} /> : <X size={17} />} {result.message}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MyOrders() {
  const { user, notify } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user) { location.href = '/login'; return; }
    api.get('/orders/my-orders')
      .then(x => setOrders(x.data))
      .catch(e => notify(err(e)));
  }, []);

  return (
    <section className="dashboard section-wrap">
      <div className="eyebrow muted">YOUR EVENT TRAIL</div>
      <h1>My orders</h1>
      <p className="page-subtitle">All the plans you've locked in, in one place.</p>
      {orders.length ? (
        <div className="manage-list">
          {orders.map(o => (
            <div className="manage-row" key={o._id}>
              <img src={o.event?.image || `https://images.unsplash.com/${photos[0]}?auto=format&fit=crop&w=160&q=70`} />
              <div className="manage-event">
                <b>{o.event?.title || 'Event'}</b>
                <span><CalendarDays size={14} />{date(o.event?.date)} <i> | </i> {o.items?.reduce((n, x) => n + x.quantity, 0)} ticket(s)</span>
              </div>
              <span className={`status ${o.status.toLowerCase()}`}>{o.status}</span>
              <b>{money(o.total)}</b>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><Ticket /></span>
          <h3>Your next good plan is out there</h3>
          <p>Find an event that feels like you.</p>
          <Link className="button button-dark" to="/">Explore events <ArrowRight size={15} /></Link>
        </div>
      )}
    </section>
  );
}

function MyTickets() {
  const { user, notify } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    if (!user) { location.href = '/login'; return; }
    api.get('/tickets/my-tickets')
      .then(x => setTickets(x.data))
      .catch(e => notify(err(e)));
  }, []);

  async function show(t) {
    try {
      const x = await api.get(`/tickets/${t._id}/qr`);
      setQr({ ...x.data, t });
    } catch (e) {
      notify(err(e));
    }
  }

  return (
    <section className="dashboard section-wrap">
      <div className="eyebrow muted"><Ticket size={14} /> YOUR POCKET TICKETS</div>
      <h1>My tickets</h1>
      <p className="page-subtitle">Your passes for the moments ahead.</p>
      {tickets.length ? (
        <div className="tickets-grid">
          {tickets.map(t => (
            <article className="ticket-card" key={t._id}>
              <div className="ticket-card-image">
                <img src={t.event?.image || `https://images.unsplash.com/${photos[1]}?auto=format&fit=crop&w=650&q=80`} />
                <span className={`status ${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span>
              </div>
              <div className="ticket-card-body">
                <span className="eyebrow muted">{t.ticketType}</span>
                <h3>{t.event?.title}</h3>
                <p><CalendarDays size={14} />{date(t.event?.date)}</p>
                <p><MapPin size={14} />{t.event?.venue}</p>
                <div className="ticket-code">{t.code}</div>
                <button className="button button-light" onClick={() => show(t)}>
                  <QrCode size={16} /> View QR ticket
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon"><Ticket /></span>
          <h3>No tickets in your pocket yet</h3>
          <p>Once you find your next moment, your ticket will be right here.</p>
          <Link className="button button-dark" to="/">Find an event <ArrowRight size={15} /></Link>
        </div>
      )}
      {qr && (
        <div className="modal-backdrop" onClick={() => setQr(null)}>
          <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setQr(null)}><X /></button>
            <div className="eyebrow muted">YOUR PASS IS READY</div>
            <h2>{qr.t.event?.title}</h2>
            <img src={qr.qr} alt="Ticket QR code" />
            <b>{qr.code}</b>
            <p>Show this code to the event organizer at check-in.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default App;
