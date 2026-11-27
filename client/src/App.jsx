import React, { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, CalendarDays, MapPin, Search, Ticket, UserRound,
  Plus, LayoutDashboard, LogOut, Menu, X, Users, ChartNoAxesCombined, Check,
  Clock3, Sparkles, ChevronDown, Music2, Compass, CircleDollarSign, ShieldCheck,
  QrCode, ArrowLeft, ChevronUp, Eye, EyeOff, Zap, Heart, Star, Globe2,
  Headphones, GraduationCap, Trophy, PartyPopper, Presentation, AlertCircle, Loader2, Share2, CalendarPlus
} from 'lucide-react';
import api from './api';
import HeroCarousel from './HeroCarousel.jsx';
import ManageEventPro from './ManageEventPro.jsx';
import EventPhotoPicker from './EventPhotoPicker.jsx';
import eventifyMark from './assets/eventify-mark.svg';
import eventifyLogo from './assets/logo.png';
import { POSTER_THEMES, getPosterTheme, posterGallery } from './posterThemes.js';
import PaymentInstructionsEditor from './PaymentInstructionsEditor.jsx';
import AdminDashboard from './AdminDashboard.jsx';

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
          <Route path="/checkout/:id" element={<CheckoutPage />} />
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/manage/:id" element={<ManageEventPro />} />
          <Route path="/admin" element={<AdminDashboard user={user} notify={notify} />} />
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
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const sectionId = decodeURIComponent(location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

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
          <Link to="/#discover" onClick={() => setMobile(false)}>Discover</Link>
          <Link to="/#browse-categories" onClick={() => setMobile(false)}>Categories</Link>
          {user?.role === 'organizer' && <Link to="/dashboard">Organizer dashboard</Link>}
          {user?.role === 'admin' && <Link to="/admin" className={location.pathname.startsWith('/admin') ? 'active' : ''}>Admin</Link>}
          {user?.role === 'attendee' && (
            <>
              <Link to="/orders" className={`client-nav-link${location.pathname === '/orders' ? ' active' : ''}`}>My orders</Link>
              <Link to="/tickets" className={`client-nav-link${location.pathname === '/tickets' ? ' active' : ''}`}>My tickets</Link>
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
                  {user.role === 'admin' && <Link to="/admin" className="dropdown-item" onClick={() => setDropdown(false)}><ShieldCheck size={15} /> Admin dashboard</Link>}
                  <div className="dropdown-divider" />
                  <button className="dropdown-item dropdown-logout" onClick={() => { logout(); setDropdown(false); }}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className="button button-dark button-sm" to="/register">
              Buy ticket <ArrowRight size={15} />
            </Link>
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
            <Link to="/#discover">Browse Events</Link>
            <Link to="/#browse-categories">Categories</Link>
            <Link to="/register">Create Account</Link>
          </div>
          <div className="footer-col">
            <h4>Organizers</h4>
            <Link to="/register">Start Hosting</Link>
            <Link to="/#how-it-works">How It Works</Link>
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
  const { notify } = useAuth();
  const [events, setEvents] = useState([]);
  const [eventMeta, setEventMeta] = useState({ total: 0, page: 1, totalPages: 0, hasNext: false });
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All events');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('date');
  const [upcoming, setUpcoming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [quickEvent, setQuickEvent] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem('eventify:favorites') || '[]'); } catch { return []; } });

  useEffect(() => {
    setLoading(true);
    let t = setTimeout(
      () =>
        api.get('/events', {
          params: {
            search: q || undefined,
            category: category === 'All events' ? undefined : category,
            dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
            minPrice: minPrice || undefined, maxPrice: maxPrice || undefined,
            sort, upcoming: upcoming ? 'true' : undefined, page: 1, limit: 12,
          },
        })
          .then(x => { setEvents(x.data); setEventMeta(x.meta || { total: x.data.length, page: 1, totalPages: 1, hasNext: false }); })
          .catch(() => { setEvents([]); setEventMeta({ total: 0, page: 1, totalPages: 0, hasNext: false }); })
          .finally(() => setLoading(false)),
      180
    );
    return () => clearTimeout(t);
  }, [q, category, dateFrom, dateTo, minPrice, maxPrice, sort, upcoming]);

  async function loadMoreEvents() {
    if (!eventMeta.hasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await api.get('/events', { params: { search: q || undefined, category: category === 'All events' ? undefined : category, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, minPrice: minPrice || undefined, maxPrice: maxPrice || undefined, sort, upcoming: upcoming ? 'true' : undefined, page: eventMeta.page + 1, limit: 12 } });
      setEvents(current => [...current, ...result.data]);
      setEventMeta(result.meta || eventMeta);
    } catch (error) { notify(err(error)); }
    finally { setLoadingMore(false); }
  }

  useEffect(() => {
    const id = searchParams.get('event');
    if (!id) { setQuickEvent(null); return; }
    setQuickLoading(true);
    api.get(`/events/${id}`).then(x => setQuickEvent(x.data)).catch(() => { setSearchParams({}, { replace: true }); }).finally(() => setQuickLoading(false));
  }, [searchParams, setSearchParams]);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && searchParams.has('event')) setSearchParams({}, { replace: true }); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [searchParams, setSearchParams]);
  const toggleFavorite = id => setFavorites(old => { const next = old.includes(id) ? old.filter(x => x !== id) : [...old, id]; localStorage.setItem('eventify:favorites', JSON.stringify(next)); return next; });

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

        <div className="discover-filter-controls">
          <label>Date from<input aria-label="Filter events from date" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></label>
          <label>Date to<input aria-label="Filter events through date" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></label>
          <label>Min price<input aria-label="Minimum ticket price" type="number" min="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="₱0" /></label>
          <label>Max price<input aria-label="Maximum ticket price" type="number" min="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Any" /></label>
          <label>Sort<select aria-label="Sort events" value={sort} onChange={e => setSort(e.target.value)}><option value="date">Soonest</option><option value="date-desc">Latest date</option><option value="newest">Recently added</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>
          <label className="upcoming-filter"><input type="checkbox" checked={upcoming} onChange={e => setUpcoming(e.target.checked)} /> Upcoming only</label>
        </div>

        <div className="results-label">
          <span>
            {loading ? 'Finding events' : `${eventMeta.total} ${eventMeta.total === 1 ? 'event' : 'events'} to get into`}
          </span>
          <span className="sort-label">Page {eventMeta.page} of {Math.max(1, eventMeta.totalPages)}</span>
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
              <EventCard key={e._id} event={e} index={i} favorite={favorites.includes(e._id)} onFavorite={toggleFavorite} onOpen={() => setSearchParams({ event: e._id })} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon"><CalendarDays /></span>
            <h3>No plans just yet</h3>
            <p>Try another search or category. Something good will turn up.</p>
            <button className="button button-light" onClick={() => { setQ(''); setCategory('All events'); setDateFrom(''); setDateTo(''); setMinPrice(''); setMaxPrice(''); setSort('date'); setUpcoming(false); }}>
              Clear filters
            </button>
          </div>
        )}
        {!loading && eventMeta.hasNext && <div className="load-more-events"><button className="button button-light" onClick={loadMoreEvents} disabled={loadingMore}>{loadingMore ? 'Loading events…' : 'Load more events'}</button></div>}
      </section>

      {(quickEvent || quickLoading) && <EventQuickView event={quickEvent} loading={quickLoading} close={() => setSearchParams({}, { replace: true })} favorite={quickEvent && favorites.includes(quickEvent._id)} onFavorite={toggleFavorite} />}

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

function EventCard({ event: e, index = 0, favorite, onFavorite, onOpen }) {
  const cover = e.image || `https://images.unsplash.com/${photos[index % photos.length]}?auto=format&fit=crop&w=850&q=80`;
  const tickets = e.tickets || [];
  const activeTickets = tickets.filter(t => t.active);
  const totalSold = tickets.reduce((n, t) => n + (Number(t.sold) || 0), 0);
  const totalQty = tickets.reduce((n, t) => n + (Number(t.quantity) || 0), 0);
  const minPrice = activeTickets.length ? Math.min(...activeTickets.map(t => Number(t.price) || 0)) : null;
  const isFree = minPrice === 0;
  const isSoldOut = totalQty > 0 && totalSold >= totalQty;
  const fewLeft = !isSoldOut && totalQty > 0 && (totalQty - totalSold) <= 10;

  const theme = getPosterTheme(e);
  return <article className={`poster-card theme-${theme.id}`} style={{'--poster-accent':theme.accent,'--poster-font':`'${theme.font}', sans-serif`}}>
    <button className="poster-open" type="button" onClick={onOpen} aria-label={`View ${e.title} event details`}>
      <img loading="lazy" src={cover} alt={`${e.title} event poster`} />
      <span className="poster-shade" />
      <span className="poster-top"><span className="poster-category">{e.category}</span>{(isSoldOut||fewLeft||isFree)&&<span className={`poster-stock ${isSoldOut?'sold-out':fewLeft?'few-left':'free-badge'}`}>{isSoldOut?'Sold out':fewLeft?'Few left':'Free'}</span>}</span>
      <span className="poster-content"><span className="poster-date"><CalendarDays size={14}/>{date(e.date)}{e.startTime&&` · ${e.startTime}`}</span><strong>{e.title}</strong><span className="poster-venue"><MapPin size={14}/>{e.venue}</span><span className="poster-footer"><b>{minPrice===null?'Tickets unavailable':isFree?'Free':`From ${money(e.discount?.percent?Math.round(minPrice*(1-e.discount.percent/100)):minPrice)}`}</b><small><Users size={13}/>{totalSold} going</small></span></span>
    </button>
    <button className={`poster-favorite ${favorite?'saved':''}`} type="button" aria-label={favorite?'Remove from saved events':'Save event'} aria-pressed={favorite} onClick={()=>onFavorite(e._id)}><Heart size={17} fill={favorite?'currentColor':'none'}/></button>
  </article>;
}

function EventQuickView({event,loading,close,favorite,onFavorite}) {
  const {user,notify}=useAuth(),nav=useNavigate(),[qty,setQty]=useState({}),[busy,setBusy]=useState(false),[slide,setSlide]=useState(0),[zoom,setZoom]=useState(false),[copied,setCopied]=useState(false),[ticketPicker,setTicketPicker]=useState(false),dialog=React.useRef(null),priorFocus=React.useRef(document.activeElement);
  const theme=getPosterTheme(event||{}),gallery=posterGallery(event||{}),images=gallery.length?gallery:[event?.image].filter(Boolean),discount=event?.discount?.percent&&(!event.discount.endsAt||new Date(event.discount.endsAt)>new Date())?event.discount:null;
  useEffect(()=>{const old=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.focus();const trap=e=>{if(e.key!=='Tab'||!dialog.current)return;const nodes=[...dialog.current.querySelectorAll('button,a,input,select,[tabindex="0"]')].filter(x=>!x.disabled);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};document.addEventListener('keydown',trap);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',trap);priorFocus.current?.focus?.()}},[]);
  useEffect(()=>{dialog.current?.focus()},[loading]);
  if(loading||!event)return <div className="poster-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className="poster-modal poster-loading" role="dialog" aria-modal="true" aria-label="Loading event details" tabIndex="-1">Loading event…</section></div>;
  const left=(t)=>Math.max(0,Number(t.quantity)-Number(t.sold)),price=t=>discount?Math.round(Number(t.price)*(1-discount.percent/100)*100)/100:Number(t.price);
  async function buy(t){if(!user){nav('/login');return}if(user.role!=='attendee'){notify('Attendee accounts can purchase tickets.');return}setBusy(true);try{const o=await api.post('/orders',{eventId:event._id,ticketTypeId:t._id,quantity:qty[t._id]||1});if(o.data.status==='Paid'){notify('Your free tickets are confirmed.');nav('/tickets')}else nav(`/checkout/${o.data._id}`)}catch(e){notify(err(e))}finally{setBusy(false)}}
  async function share(){try{await navigator.clipboard.writeText(`${location.origin}/?event=${event._id}`);setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{notify('Unable to copy the event link.')}}
  function calendar(){const start=new Date(event.date);const end=new Date(start.getTime()+2*60*60*1000);const fmt=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const link=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent(event.venue)}&details=${encodeURIComponent(event.description)}`;window.open(link,'_blank','noopener,noreferrer')}
  const cover=images[slide]||'';
  return <div className="poster-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section ref={dialog} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="quick-event-title" className={`poster-modal theme-${theme.id}`} style={{'--poster-accent':theme.accent,'--poster-font':`'${theme.font}', sans-serif`}}>
    <button className="poster-modal-close" onClick={close} aria-label="Close event details"><X/></button>
    <div className="quick-gallery"><div className="quick-cover" onTouchStart={e=>{dialog.current.dataset.touchX=e.touches[0].clientX}} onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-Number(dialog.current.dataset.touchX||0);if(Math.abs(dx)>45&&images.length>1)setSlide((slide+(dx<0?1:images.length-1))%images.length)}}>{cover?<img src={cover} alt={`${event.title} photo ${slide+1}`} onClick={()=>setZoom(true)}/>:<div className="quick-no-image"><CalendarDays size={40}/><span>{event.category}</span></div>}{images.length>1&&<><button className="quick-arrow left" onClick={()=>setSlide((slide+images.length-1)%images.length)} aria-label="Previous photo"><ArrowLeft/></button><button className="quick-arrow right" onClick={()=>setSlide((slide+1)%images.length)} aria-label="Next photo"><ArrowRight/></button><span className="quick-count">{slide+1} / {images.length}</span></>}</div>{images.length>1&&<div className="quick-thumbs">{images.map((im,i)=><button key={i} className={i===slide?'active':''} onClick={()=>setSlide(i)} aria-label={`Show photo ${i+1}`}><img src={im} alt=""/></button>)}</div>}</div>
    <div className="quick-details"><div className="quick-actions"><button className="quick-ticket-trigger" onClick={()=>setTicketPicker(true)}><Ticket size={16}/>Choose your ticket</button><button onClick={share}><Share2 size={16}/>{copied?'Copied':'Share'}</button><button onClick={()=>onFavorite(event._id)} aria-pressed={favorite}><Heart size={16} fill={favorite?'currentColor':'none'}/>{favorite?'Saved':'Save'}</button><button onClick={calendar}><CalendarPlus size={16}/>Calendar</button></div>
      <span className="quick-category">{event.category}</span><h2 id="quick-event-title">{event.title}</h2><p className="quick-host">Hosted by {event.organizer?.organization||event.organizer?.name||'Event organizer'}</p><div className="quick-facts"><span><CalendarDays/>{date(event.date)} · {event.startTime||'Time TBA'}</span><span><MapPin/>{event.venue}{event.address?`, ${event.address}`:''}</span><span><Users/>{event.tickets?.reduce((n,t)=>n+Number(t.sold||0),0)||0} going · Capacity {event.capacity}</span></div><h3>About this event</h3><p className="quick-description">{event.description}</p>

    </div>
    {zoom&&<div className="poster-lightbox" onClick={()=>setZoom(false)}><button aria-label="Close photo"><X/></button><img src={cover} alt={`${event.title} full size photo`}/></div>}
    {ticketPicker&&<div className="ticket-picker-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setTicketPicker(false)}}><section className="ticket-picker" role="dialog" aria-modal="true" aria-labelledby="ticket-picker-title"><button autoFocus className="poster-modal-close" onClick={()=>setTicketPicker(false)} aria-label="Close ticket choices"><X/></button><span className="quick-category">{event.category}</span><h2 id="ticket-picker-title">Choose your ticket</h2>{discount&&<p className="ticket-picker-deal">{discount.label||'Special offer'} · Save {discount.percent}%</p>}<div className="quick-ticket-list">{event.tickets?.filter(t=>t.active).map(t=>{const remaining=left(t),n=qty[t._id]||1;return <article className="quick-ticket" key={t._id}><div className="quick-ticket-top"><div><b>{t.name}</b>{t.description&&<small>{t.description}</small>}</div><strong>{discount&&<del>{money(t.price)}</del>}{money(price(t))}</strong></div>{(t.tags||[]).length>0&&<div className="quick-tags">{t.tags.map(x=><span key={x}>{x}</span>)}</div>}{(t.perks||[]).length>0&&<ul>{t.perks.map(x=><li key={x}>{x}</li>)}</ul>}<div className="quick-ticket-bottom"><span>{remaining} spots left{remaining<=10&&remaining>0?' · Few remaining':''}</span><label>Qty<select value={n} disabled={!remaining} onChange={e=>setQty({...qty,[t._id]:Number(e.target.value)})}>{Array.from({length:Math.max(1,Math.min(Number(t.maxPerOrder)||5,remaining,10))},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label></div><div className="quick-total">Estimated total <b>{money(Math.round((price(t)*n+Math.round(price(t)*n*.05*100)/100)*100)/100)} <small>includes service fee</small></b></div><button className="quick-buy" disabled={busy||!remaining||new Date(event.date)<new Date()} onClick={()=>buy(t)}>{busy?'Processing…':'Get tickets'}<ArrowRight size={16}/></button></article>})}{!event.tickets?.some(t=>t.active)&&<p className="quick-description">Tickets are not available for this event yet.</p>}</div></section></div>}
  </section></div>;
}

function EventPhotoGallery({ event, fallback }) {
  const eventImages = [...new Set([...(event.gallery || []), event.image, ...(event.images || [])].filter(Boolean))];
  const gallery = eventImages.length ? eventImages : [fallback];
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (gallery.length < 2) return undefined;
    const timer = setInterval(() => setActive(index => (index + 1) % gallery.length), 4000);
    return () => clearInterval(timer);
  }, [gallery.length]);
  const show = next => setActive((next + gallery.length) % gallery.length);

  return (
    <div className="event-gallery" aria-label={`${event.title} photos`}>
      <img className="detail-image" src={gallery[active]} alt={`${event.title} photo ${active + 1}`} />
      {gallery.length > 1 && <>
        <span className="gallery-count">{String(active + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}</span>
        <button className="gallery-arrow gallery-previous" type="button" aria-label="Previous event photo" onClick={() => show(active - 1)}><ArrowLeft size={18} /></button>
        <button className="gallery-arrow gallery-next" type="button" aria-label="Next event photo" onClick={() => show(active + 1)}><ArrowRight size={18} /></button>
        <div className="gallery-dots" aria-label="Select event photo">
          {gallery.map((image, index) => <button key={`${index}-${image.slice(0, 24)}`} type="button" className={active === index ? 'active' : ''} aria-label={`Show event photo ${index + 1}`} aria-current={active === index} onClick={() => show(index)} />)}
        </div>
      </>}
    </div>
  );
}

function EventPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [qty, setQty] = useState({});
  const [busy, setBusy] = useState(false);
  const { user, notify } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(x => setEvent(x.data))
      .catch(e => { if (e.status === 404 || /no longer available|event not found/i.test(err(e))) setUnavailable(true); else notify(err(e)); });
  }, [id]);

  if (!event && unavailable) return <section className="dashboard section-wrap"><div className="empty-state"><span className="empty-icon"><ShieldCheck/></span><h2>This event is no longer available</h2><p>It may have been removed or is no longer published.</p><Link className="button button-dark" to="/">Browse events <ArrowRight size={15}/></Link></div></section>;
  if (!event) return <div className="loading">Loading event...</div>;

  async function buy(ticket) {
    if (!user) { nav('/login'); return; }
    if (user.role !== 'attendee') { notify('Attendee accounts can purchase tickets.'); return; }
    setBusy(true);
    try {
      const o = await api.post('/orders', { eventId: id, ticketTypeId: ticket._id, quantity: qty[ticket._id] || 1 });
      if(o.data.status==='Paid'){notify('Your free tickets are confirmed.');nav('/tickets')}
      else nav(`/checkout/${o.data._id}`);
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
          <EventPhotoGallery key={event._id} event={event} fallback={`https://images.unsplash.com/${photos[0]}?auto=format&fit=crop&w=1400&q=85`} />
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
  const [eventsMeta, setEventsMeta] = useState({ total: 0, page: 1, totalPages: 0, hasNext: false });
  const [loadingMoreEvents, setLoadingMoreEvents] = useState(false);
  const [stats, setStats] = useState({});
  const [adminNotices, setAdminNotices] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    images: [],
    gallery: [], theme: '', discount: { label: '', percent: '', endsAt: '' },
    paymentInstructions: { methods: [], note: '' },
    tickets: [
      { name: 'Regular', price: 350, quantity: 100, maxPerOrder: 5 },
      { name: 'VIP', price: 700, quantity: 30, maxPerOrder: 3 },
    ],
    vipEnabled: true,
    category: 'Music',
    status: 'Draft',
    capacity: 130,
  });
  const nav = useNavigate();
  const enabledTickets = form.tickets.filter(ticket => ticket.name !== 'VIP' || form.vipEnabled);
  const ticketQuantity = enabledTickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);

  useEffect(() => {
    if (!user) { nav('/login'); return; }
    if (user.role !== 'organizer') { nav('/'); return; }
    api.get('/events/mine', { params: { page: 1, limit: 10 } }).then(x => { setEvents(x.data); setEventsMeta(x.meta || { total: x.data.length, page: 1, totalPages: 1, hasNext: false }); });
    api.get('/organizer/dashboard').then(x => setStats(x.data)).catch(() => {});
    api.get('/notifications/mine').then(x => setAdminNotices(x.data)).catch(() => {});
  }, [user]);

  async function loadMoreOrganizerEvents() {
    if (!eventsMeta.hasNext || loadingMoreEvents) return;
    setLoadingMoreEvents(true);
    try {
      const result = await api.get('/events/mine', { params: { page: eventsMeta.page + 1, limit: 10 } });
      setEvents(current => [...current, ...result.data]);
      setEventsMeta(result.meta || eventsMeta);
    } catch (error) { notify(err(error)); }
    finally { setLoadingMoreEvents(false); }
  }

  async function create(e) {
    e.preventDefault();
    if (ticketQuantity > Number(form.capacity)) {
      notify(`Ticket quantities total ${ticketQuantity}, which exceeds the event capacity of ${form.capacity}.`);
      return;
    }
    try {
      const methods=form.paymentInstructions?.methods||[];
      const created=await api.post('/events', {
        ...form,
        image: form.images?.[0] || form.image || '',
        images: form.images || [],
        gallery: form.images || [], theme: form.theme || '',
        discount: Number(form.discount?.percent) > 0 ? { ...form.discount, percent: Number(form.discount.percent), endsAt: form.discount.endsAt || undefined } : null,
        paymentInstructions: { ...form.paymentInstructions, methods: methods.map(({qrFile,...method})=>method) },
        date: new Date(form.date),
        capacity: Number(form.capacity),
        tickets: enabledTickets.map(t => ({ ...t, price: Number(t.price), quantity: Number(t.quantity), maxPerOrder: Number(t.maxPerOrder) })),
      });
      let qrUploadIssue=false;try{await Promise.all(methods.map(async(method,index)=>{if(!method.qrFile)return;const upload=new FormData();upload.append('qrImage',method.qrFile);upload.append('methodIndex',String(index));await api.post(`/events/${created.data._id}/payment-qr`,upload,{headers:{'Content-Type':'multipart/form-data'}})}))}catch{qrUploadIssue=true}
      notify(qrUploadIssue?'Event created, but a payment QR failed to upload. Add it from Edit event.':'Event created. Add details and publish when ready.');
      setModal(false);
      api.get('/events/mine', { params: { page: 1, limit: 10 } }).then(x => { setEvents(x.data); setEventsMeta(x.meta || { total: x.data.length, page: 1, totalPages: 1, hasNext: false }); });
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

      {adminNotices.length > 0 && <div className="admin-notification-list" aria-label="Event moderation notifications">{adminNotices.map(item => <article key={item._id} className={item.type === 'event_removed' ? 'removed' : 'restored'}><div><b>{item.type === 'event_removed' ? 'Event removed by admin' : 'Event restored by admin'} · {item.eventTitle}</b><span>{item.reason || (item.type === 'event_removed' ? 'This event is hidden from buyers and is read-only.' : 'This event is active again.')}</span></div>{item.event && <Link to={`/manage/${item.event}`}>View event <ArrowRight size={14}/></Link>}</article>)}</div>}

      <div className="dashboard-section-title">
        <div>
          <h2>Your events</h2>
          <p>Manage your lineup and see how each event is doing.</p>
        </div>
        <span className="pill">{eventsMeta.total} total</span>
      </div>

      {events.length ? (
        <div className="manage-list">
          {events.map((e, i) => (
            <Link className={`manage-row${e.moderation?.status === 'removed' ? ' moderation-removed' : ''}`} to={`/manage/${e._id}`} key={e._id}>
              <img src={e.image || `https://images.unsplash.com/${photos[i % photos.length]}?auto=format&fit=crop&w=160&q=70`} />
              <div className="manage-event">
                <b>{e.title}</b>
                <span><CalendarDays size={14} />{date(e.date)} <i> | </i> <MapPin size={14} />{e.venue}</span>
                {e.moderation?.status === 'removed' && <small className="removed-event-reason">Reason: {e.moderation.reason}</small>}
              </div>
              {e.moderation?.status === 'removed' ? <span className="moderation-badge removed">Removed by admin</span> : <span className={`status ${e.status.toLowerCase()}`}>{e.status}</span>}
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
      {eventsMeta.hasNext && <div className="load-more-events"><button className="button button-light" onClick={loadMoreOrganizerEvents} disabled={loadingMoreEvents}>{loadingMoreEvents ? 'Loading events…' : 'Load more events'}</button></div>}

      {modal && (
        <div className="modal-backdrop create-event-backdrop" onClick={() => setModal(false)}>
          <form className="create-modal create-event-modal" onSubmit={create} onClick={e => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setModal(false)}><X /></button>
            <header className="create-event-heading"><div className="eyebrow muted">EVENT SETUP</div><h2>Create an event</h2><p>Add the key details, photos, and checkout information.</p></header>
            <div className="create-event-grid">
              <div className="create-event-column">
                <label>Event name<input required value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sunday Sessions" /></label>
                <div className="create-event-pair"><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['Music', 'Concert', 'Seminar', 'Conference', 'Workshop', 'Sports', 'Festival', 'Educational', 'Other'].map(x => <option key={x}>{x}</option>)}</select></label><label>Date<input required type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} /></label></div>
                <div className="create-event-pair"><label>Venue<input required value={form.venue || ''} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="Venue name" /></label><label>Capacity<input required type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></label></div>
                <div className="create-event-pair"><label>Start time<input type="time" value={form.startTime || ''} onChange={e => setForm({ ...form, startTime: e.target.value })} /></label><label>End time<input type="time" value={form.endTime || ''} onChange={e => setForm({ ...form, endTime: e.target.value })} /></label></div>
                <label className="create-event-description">Description<textarea required rows="3" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What makes this one special?" /></label>
              </div>
              <div className="create-event-column create-event-media-column">
                <EventPhotoPicker images={form.images || []} onChange={images => setForm(current => ({ ...current, images, image: images[0] || '' }))} />
                <label>Poster theme<select value={form.theme||''} onChange={e=>setForm({...form,theme:e.target.value})}><option value="">Choose automatically</option>{POSTER_THEMES.map(t=><option value={t.id} key={t.id}>{t.label}</option>)}</select></label>
                <div className="create-event-pair"><label>Offer label (optional)<input value={form.discount?.label||''} onChange={e=>setForm({...form,discount:{...form.discount,label:e.target.value}})} placeholder="Early bird"/></label><label>Discount percent<input type="number" min="1" max="90" value={form.discount?.percent||''} onChange={e=>setForm({...form,discount:{...form.discount,percent:e.target.value}})} placeholder="20"/></label></div>
                <label>Offer ends (optional)<input type="date" value={form.discount?.endsAt||""} onChange={e=>setForm({...form,discount:{...form.discount,endsAt:e.target.value}})}/></label>
                <section className="create-ticket-types" aria-label="Ticket types and quantities">
                  <div className="create-ticket-heading"><div><b>Ticket types</b><small>Set prices and ticket quantities. Their total must fit event capacity.</small></div><span>{ticketQuantity} / {Number(form.capacity) || 0}</span></div>
                  {enabledTickets.map(ticket => <div className="create-ticket-row" key={ticket.name}>
                    <b>{ticket.name}</b>
                    <label>Price (₱)<input required type="number" min="0" step="0.01" value={ticket.price} onChange={e => setForm(current => ({ ...current, tickets: current.tickets.map(item => item.name === ticket.name ? { ...item, price: e.target.value } : item) }))} /></label>
                    <label>Quantity<input required type="number" min="1" step="1" value={ticket.quantity} onChange={e => setForm(current => ({ ...current, tickets: current.tickets.map(item => item.name === ticket.name ? { ...item, quantity: e.target.value } : item) }))} /></label>
                    <label>Max/order<input required type="number" min="1" step="1" value={ticket.maxPerOrder} onChange={e => setForm(current => ({ ...current, tickets: current.tickets.map(item => item.name === ticket.name ? { ...item, maxPerOrder: e.target.value } : item) }))} /></label>
                  </div>)}
                  <label className="create-vip-toggle"><input type="checkbox" checked={form.vipEnabled} onChange={e => setForm(current => ({ ...current, vipEnabled: e.target.checked }))} /> Offer VIP tickets</label>
                  {enabledTickets.some(ticket => Number(ticket.maxPerOrder) > Number(ticket.quantity)) && <small className="create-ticket-warning">Max per order cannot be greater than that ticket type's quantity.</small>}
                  {ticketQuantity > Number(form.capacity) && <small className="create-ticket-warning">Ticket quantities exceed event capacity. Reduce a ticket quantity or increase capacity.</small>}
                </section>
              </div>
              <div className="create-event-column create-event-payment-column"><PaymentInstructionsEditor value={form.paymentInstructions} onChange={paymentInstructions=>setForm(current=>({...current,paymentInstructions}))}/></div>
            </div>
            <footer className="create-event-actions"><span>Event will be saved as a draft. You can publish it from event management.</span><button className="button button-dark">Create draft <ArrowRight size={16} /></button></footer>
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

function CheckoutPage() {
  const { id } = useParams(), { user, notify } = useAuth(), nav = useNavigate();
  const [order, setOrder] = useState(null), [method, setMethod] = useState(''), [referenceNumber, setReferenceNumber] = useState(''), [receipt, setReceipt] = useState(null), [preview, setPreview] = useState(''), [busy, setBusy] = useState(false), [remaining, setRemaining] = useState('');
  useEffect(() => { if (!user) { nav('/login'); return; } api.get(`/orders/${id}`).then(x => { setOrder(x.data); setMethod(x.data.event?.paymentInstructions?.methods?.[0]?.type || 'Other'); }).catch(e => notify(err(e))); }, [id, user]);
  useEffect(() => { if (!receipt) { setPreview(''); return; } const url=URL.createObjectURL(receipt); setPreview(url); return ()=>URL.revokeObjectURL(url); }, [receipt]);
  useEffect(() => { if (!order?.expiresAt) return; const timer=window.setInterval(()=>{const ms=Math.max(0,new Date(order.expiresAt)-Date.now()),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);setRemaining(ms?`${h}h ${m}m ${s}s`:'Expired');},1000);return()=>clearInterval(timer); },[order?.expiresAt]);
  if (!order) return <div className="loading">Loading checkout…</div>;
  const instructions=order.event?.paymentInstructions||{methods:[]};
  async function submit(e){e.preventDefault();if(!receipt){notify('Please upload a payment receipt image.');return;}setBusy(true);try{const data=new FormData();data.append('receipt',receipt);data.append('method',method);data.append('referenceNumber',referenceNumber);const result=await api.post(`/orders/${id}/payment`,data,{headers:{'Content-Type':'multipart/form-data'}});setOrder(result.data);notify('Your payment is under review. The host will confirm it soon.');nav('/orders');}catch(error){notify(err(error));}finally{setBusy(false)}}
  if(order.status==='Paid')return <section className="dashboard section-wrap"><div className="payment-state success"><Check/><h1>Payment confirmed</h1><p>Your tickets are ready in My Tickets.</p><Link className="button button-dark" to="/tickets">View my tickets <ArrowRight size={16}/></Link></div></section>;
  if(['Expired','Cancelled'].includes(order.status))return <section className="dashboard section-wrap"><div className="payment-state"><h1>Order {order.status.toLowerCase()}</h1><p>This reservation is no longer active. Choose the event again to place a new order.</p><Link className="button button-dark" to="/">Browse events</Link></div></section>;
  if(order.event?.moderation?.status==='removed')return <section className="dashboard section-wrap"><div className="payment-state pending"><ShieldCheck/><h1>Event no longer available</h1><p>This event was removed by the administrator. Your order remains saved for support and refund follow-up.</p>{order.event.moderation.reason&&<div className="client-event-removed"><b>Removal reason</b><span>{order.event.moderation.reason}</span></div>}<Link to="/orders" className="button button-light">View my orders</Link></div></section>;
  if(order.status==='Pending Verification')return <section className="dashboard section-wrap"><div className="payment-state pending"><Clock3/><h1>Payment under review</h1><p>Your payment is under review. The host will confirm it soon.</p><Link to="/orders" className="button button-light">View my orders</Link></div></section>;
  const methodList=instructions.methods?.length?instructions.methods:[{type:'Other',accountName:'',accountNumber:''}];
  return <section className="dashboard section-wrap checkout-page"><Link className="back-link" to="/orders"><ArrowLeft size={16}/> My orders</Link><div className="checkout-layout"><main className="panel checkout-main"><span className="eyebrow muted">COMPLETE YOUR ORDER</span><h1>Submit payment</h1><p className="page-subtitle">Pay the event host, then upload your receipt for review.</p><div className="checkout-summary"><img src={order.event?.image||`https://images.unsplash.com/${photos[0]}?auto=format&fit=crop&w=180&q=70`} alt=""/><div><b>{order.event?.title||'Event'}</b><small>{order.items?.map(x=>`${x.name} × ${x.quantity}`).join(', ')}</small></div><strong>{money(order.total)}</strong></div>
    <div className="host-payment"><div className="host-payment-head"><div><span className="eyebrow muted">PAYMENT INSTRUCTIONS</span><h2>Pay the event host</h2></div><span className="payment-deadline"><Clock3 size={15}/> {remaining||'24h'}</span></div>{instructions.note&&<p>{instructions.note}</p>}{methodList.map((m,i)=><article className={`host-payment-method ${method===m.type?'selected':''}`} key={`${m.type}-${i}`}><div><b>{m.type}</b><small>{m.accountName||'Account name not provided'}</small><span>{m.accountNumber||'Ask the event organizer for account details'}</span></div>{m.accountNumber&&<button type="button" className="button button-light" onClick={()=>navigator.clipboard?.writeText(m.accountNumber).then(()=>notify('Account number copied.'))}>Copy number</button>}{m.qrImageUrl&&<img src={m.qrImageUrl} alt={`${m.type} payment QR`}/>}</article>)}{!instructions.methods?.length&&<p className="payment-warning">The organizer has not added payment details yet. You can still submit your transfer receipt and the host will review it.</p>}<div className="checkout-amount"><span>Exact amount to pay</span><b>{money(order.total)}</b></div></div>
    <form className="pro-form payment-submit-form" onSubmit={submit}><label>Payment method<select required value={method} onChange={e=>setMethod(e.target.value)}>{methodList.map((m,i)=><option key={i} value={m.type}>{m.type}</option>)}</select></label><label>Reference number<input required value={referenceNumber} onChange={e=>setReferenceNumber(e.target.value)} placeholder="Reference number from your payment" maxLength={100}/></label><label>Payment receipt (JPG, PNG, WEBP; max 3 MB)<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file&&(file.size>3*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))){notify("Use a JPG, PNG, or WEBP image up to 3 MB.");e.target.value="";setReceipt(null)}else setReceipt(file||null)}}/></label>{preview&&<img className="receipt-preview" src={preview} alt="Receipt preview"/>}<button className="button button-dark" disabled={busy}>{busy?'Uploading receipt…':'Submit payment'} <ArrowRight size={16}/></button></form></main>
    <aside className="panel checkout-aside"><span className="eyebrow muted">RESERVATION</span><h2>Held for you</h2><p>Your selected tickets are reserved until payment deadline.</p><div><span>Order total</span><b>{money(order.total)}</b></div><div><span>Expires in</span><b>{remaining||'24 hours'}</b></div><small>Tickets and QR codes will be issued after the organizer verifies your receipt.</small></aside></div></section>;
}

function MyOrders() {
  const { user, notify } = useAuth(), nav=useNavigate();
  const [orders,setOrders]=useState([]),[selected,setSelected]=useState(null);
  useEffect(()=>{if(!user){nav('/login');return}let active=true;const refresh=(initial=false)=>api.get('/orders/my-orders').then(x=>{if(active){setOrders(x.data);setSelected(current=>current?x.data.find(order=>order._id===current._id)||current:null)}}).catch(e=>{if(active&&initial)notify(err(e))});refresh(true);const timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},10000);return()=>{active=false;clearInterval(timer)}},[user]);
  return <section className="dashboard section-wrap"><div className="eyebrow muted">YOUR EVENT TRAIL</div><h1>My orders</h1><p className="page-subtitle">Payment status and tickets for your event orders.</p>{orders.length?<div className="manage-list">{orders.map(o=><button type="button" className="manage-row order-row" key={o._id} onClick={()=>setSelected(o)}><img src={o.event?.image||`https://images.unsplash.com/${photos[0]}?auto=format&fit=crop&w=160&q=70`} alt=""/><div className="manage-event"><b>{o.event?.title||'Event'}</b><span><CalendarDays size={14}/>{date(o.event?.date)} <i> | </i>{o.items?.reduce((n,x)=>n+x.quantity,0)} ticket(s)</span>{o.event?.moderation?.status==='removed'&&<small className="removed-event-reason">This event was removed by the administrator. {o.event.moderation.reason}</small>}</div><span className={`order-status status-${o.status.toLowerCase().replaceAll(' ','-')}`}>{o.status==='Pending'?'Pending Payment':o.status}</span><b>{money(o.total)}</b><ArrowRight size={16}/></button>)}</div>:<div className="empty-state"><span className="empty-icon"><Ticket/></span><h3>Your next good plan is out there</h3><p>Find an event that feels like you.</p><Link className="button button-dark" to="/">Explore events <ArrowRight size={15}/></Link></div>}
    {selected&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="create-modal pro-modal order-detail-modal"><button className="modal-close" onClick={()=>setSelected(null)} aria-label="Close order details"><X/></button><header className="order-detail-header"><span className="eyebrow muted">ORDER DETAILS</span><h2>{selected.event?.title||'Event order'}</h2><span className={`order-status status-${selected.status.toLowerCase().replaceAll(' ','-')}`}>{selected.status==='Pending'?'Pending Payment':selected.status}</span>{selected.event?.status==='Cancelled'&&<div className="event-cancelled-notice"><b>Event cancelled</b><span>{selected.event.cancellationReason||'The organizer cancelled this event.'}</span></div>}{selected.status==='Refund Required'&&<div className="event-cancelled-notice"><b>Refund follow-up needed</b><span>The event was cancelled after your payment. Contact the organizer about your refund.</span></div>}{selected.event?.moderation?.status==='removed'&&<div className="client-event-removed"><b>This event was removed by the administrator.</b><span>{selected.event.moderation.reason||'Contact Eventify support for information about your order.'}</span></div>}</header><div className="order-detail-layout"><div className="order-detail-main"><div className="order-detail-summary">{selected.items?.map((item,i)=><p key={i}>{item.name} x {item.quantity} <b>{money(item.unitPrice*item.quantity)}</b></p>)}<p>Service fee <b>{money(selected.fees)}</b></p><p className="order-total">Total <b>{money(selected.total)}</b></p></div>{selected.payment?.referenceNumber&&<p className="order-reference"><b>Reference:</b> {selected.payment.referenceNumber}</p>}{selected.payment?.receiptUrl&&<a className="order-receipt-link" href={selected.payment.receiptUrl} target="_blank" rel="noreferrer"><img className="order-receipt-thumb" src={selected.payment.receiptUrl} alt="Submitted payment receipt"/></a>}{selected.payment?.rejectionReason&&<div className="rejection-note"><b>Host feedback</b><p>{selected.payment.rejectionReason}</p></div>}{['Pending Payment','Rejected','Pending'].includes(selected.status)&&<Link className="button button-dark" to={`/checkout/${selected._id}`} onClick={()=>setSelected(null)}>{selected.status==='Rejected'?'Re-upload receipt':'Upload receipt'} <ArrowRight size={16}/></Link>}{selected.status==='Pending Verification'&&<p className="payment-review-note">Your payment is under review. The host will confirm it soon.</p>}{selected.status==='Paid'&&<Link className="button button-dark" to="/tickets" onClick={()=>setSelected(null)}>View issued tickets <Ticket size={16}/></Link>}</div><div className="order-timeline"><h3>Status history</h3>{selected.statusHistory?.map((h,i)=><div key={i}><span className={`timeline-dot status-${h.status.toLowerCase().replaceAll(' ','-')}`}/><span><b>{h.status}</b><small>{new Date(h.at).toLocaleString('en-PH')}{h.note?` - ${h.note}`:''}</small></span></div>)}</div></div></section></div>}
  </section>;
}

function MyTickets() {
  const { user, notify } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    if (!user) { location.href = '/login'; return; }
    let active = true;
    const refresh = (initial = false) => api.get('/tickets/my-tickets').then(x => { if (active) setTickets(x.data); }).catch(e => { if (active && initial) notify(err(e)); });
    refresh(true);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 5000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [user]);

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
                <img src={t.event?.image || `https://images.unsplash.com/${photos[1]}?auto=format&fit=crop&w=650&q=80`} alt={`${t.event?.title||'Event'} ticket`} />
                <span className={`client-ticket-status ${t.status==='Event Removed'?'cancelled':t.status==='Checked In'?'checked-in':t.status==='Cancelled'?'cancelled':'ready'}`}>{t.status==='Event Removed'?'Event removed':t.status==='Checked In'?'✓ Checked in':t.status==='Cancelled'?'Cancelled':'Ready to use'}</span>
              </div>
              <div className="ticket-card-body">
                <span className="eyebrow muted">{t.ticketType}</span>
                <h3>{t.event?.title}</h3>
                <p><CalendarDays size={14} />{date(t.event?.date)}</p>
                <p><MapPin size={14} />{t.event?.venue}</p>
                {t.status==='Event Removed'&&<div className="client-event-removed"><b>This event was removed by the administrator.</b><span>{t.event?.moderation?.reason||'Contact Eventify support for information about your order.'}</span></div>}
                {t.event?.status==='Cancelled'&&<div className="event-cancelled-notice"><b>Event cancelled</b><span>{t.event.cancellationReason||'The organizer cancelled this event.'}{t.order?.status==='Refund Required'?' Contact the organizer about your refund.':''}</span></div>}
                <div className="ticket-code">{t.code}</div>
                <button className="button button-light" onClick={() => show(t)} disabled={t.status!=='Valid'}>
                  {t.status==='Checked In'?<Check size={16}/>:<QrCode size={16} />} {t.status==='Event Removed'?'Ticket disabled':t.status==='Checked In'?'Already checked in':t.status==='Cancelled'?'Ticket cancelled':'View QR ticket'}
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
            {(()=>{const latest=tickets.find(t=>t._id===qr.t._id)||qr.t;return <><div className="eyebrow muted">{latest.status==='Checked In'?'ENTRY CONFIRMED':'YOUR PASS IS READY'}</div><h2>{latest.event?.title}</h2>{latest.status==='Checked In'?<div className="qr-used-indicator"><Check size={22}/><b>Already checked in</b><span>{latest.checkedInAt?new Date(latest.checkedInAt).toLocaleString('en-PH'):'Entry recorded by the organizer'}</span></div>:<><img src={qr.qr} alt="Ticket QR code"/><b>{qr.code}</b><p>Show this code to the event organizer at check-in.</p></>}</>})()}
          </div>
        </div>
      )}
    </section>
  );
}

export default App;
