import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, MapPin, Sparkles } from 'lucide-react';

const photos = ['photo-1506157786151-b8491531f063', 'photo-1540575467063-178a50c2df87', 'photo-1514525253161-7a46d19cd819'];
const imageUrl = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1500&q=88`;
const defaults = [
  { image: photos[0], tag: 'LIVE MUSIC', title: 'Discover live events', caption: 'Find a concert, festival, or community gathering worth showing up for.' },
  { image: photos[1], tag: 'IDEAS & COMMUNITY', title: 'Bring good ideas together', caption: 'Meet curious people at conferences, seminars, and workshops.' },
  { image: photos[2], tag: 'NIGHTS TO REMEMBER', title: 'Make the next moment count', caption: 'Browse upcoming experiences and reserve your place in a few steps.' }
];
const prettyDate = value => value ? new Date(value).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

export default function HeroCarousel({ events = [] }) {
  // Use every event returned by the existing public events request, including events added later.
  const slides = events.length
    ? events.map((event, index) => ({
      id: event._id,
      image: event.image || imageUrl(photos[index % photos.length]),
      tag: (event.category || 'FEATURED EVENT').toUpperCase(),
      title: event.title,
      caption: event.description || 'Explore event details and reserve your tickets.',
      date: prettyDate(event.date),
      venue: event.venue
    }))
    : defaults.map(slide => ({ ...slide, image: imageUrl(slide.image) }));

  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [slides.length]);
  useEffect(() => {
    const timer = setInterval(() => setIndex(current => (current + 1) % slides.length), 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[index] || slides[0];
  const dotStart = Math.max(0, Math.min(index - 2, slides.length - 5));
  const visibleDots = slides.slice(dotStart, dotStart + 5);

  return (
    <div className="hero-carousel" aria-roledescription="carousel" aria-label="Featured events">
      <div
        className="carousel-image"
        key={slide.image}
        style={{ backgroundImage: `linear-gradient(90deg,rgba(12,14,19,.94) 0%,rgba(12,14,19,.65) 44%,rgba(12,14,19,.16) 100%),linear-gradient(0deg,rgba(12,14,19,.50),transparent 70%),url(${slide.image})` }}
      />
      <div className="carousel-top">
        <span><i /> EVENTIFY PRESENTS</span>
        <span>{String(index + 1).padStart(2, '0')} <em>/ {String(slides.length).padStart(2, '0')}</em></span>
      </div>
      <div className="carousel-copy" key={`${slide.title}-${index}`}>
        <span className="carousel-tag">{slide.tag}</span>
        <h2>{slide.title}</h2>
        <p>{slide.caption}</p>
        {(slide.date || slide.venue) && (
          <div className="hero-event-meta">
            {slide.date && <span><CalendarDays size={15} />{slide.date}</span>}
            {slide.venue && <span><MapPin size={15} />{slide.venue}</span>}
          </div>
        )}
        <div className="carousel-controls">
          <div className="carousel-dots" aria-label="Choose featured event">
            {visibleDots.map((item, dotIndex) => {
              const slideIndex = dotStart + dotIndex;
              return (
                <button
                  key={item.id || `${item.title}-${slideIndex}`}
                  aria-label={`Show featured event ${slideIndex + 1}`}
                  aria-current={index === slideIndex}
                  className={index === slideIndex ? 'selected' : ''}
                  onClick={() => setIndex(slideIndex)}
                />
              );
            })}
          </div>
          <div className="carousel-arrows">
            <button aria-label="Previous slide" onClick={() => setIndex(current => (current + slides.length - 1) % slides.length)}><ArrowLeft size={16} /></button>
            <button aria-label="Next slide" onClick={() => setIndex(current => (current + 1) % slides.length)}><ArrowRight size={16} /></button>
          </div>
        </div>
      </div>
      {slide.id ? (
        <Link to={`/events/${slide.id}`} className="carousel-ticket-cta">
          <span><Sparkles size={17} /></span><div><b>Explore this event</b><small>View details and ticket options</small></div><ArrowUpRight size={16} />
        </Link>
      ) : (
        <a href="#discover" className="carousel-ticket-cta">
          <span><Sparkles size={17} /></span><div><b>Browse all events</b><small>Find the right event for you</small></div><ArrowUpRight size={16} />
        </a>
      )}
    </div>
  );
}
