import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LocationAutoComplete } from '../../components/ui/LocationAutoComplete';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { useLocations } from '../../hooks/useLocations';
import bus1 from '../../assets/gallery/mannt-bus-1.png';
import bus2 from '../../assets/gallery/mannt-bus-2.png';
import video1 from '../../assets/gallery/mannt-video.mp4';

const iconProps = {
  className: 'w-6 h-6',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.8,
} as const;

function SupportIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function CancellationIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h4V6M3 10a9 9 0 1015-6.7M3 10l3.5-3.5" />
    </svg>
  );
}

function VerifiedIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M3 7a1 1 0 011-1h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7zM7 15h3"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  );
}

function SeatIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 9V7a2 2 0 012-2h10a2 2 0 012 2v2M5 9a2 2 0 00-2 2v3a2 2 0 002 2h1v3h2v-3h8v3h2v-3h1a2 2 0 002-2v-3a2 2 0 00-2-2M5 9h14"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg {...iconProps}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V7z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" d="M9 5v14" />
    </svg>
  );
}

const STEPS = [
  { title: '1. Search', description: 'Enter your from, to, and travel date to find available trips.', icon: SearchIcon },
  { title: '2. Select seats', description: 'Pick your preferred seats from a real-time seat map.', icon: SeatIcon },
  { title: '3. Pay & travel', description: 'Pay securely online and get your booking confirmed instantly.', icon: TicketIcon },
];

const SEARVICES = [
  {
    title: '24/7 Support',
    description: 'Reach us anytime, day or night, for help with your booking.',
    icon: SupportIcon,
  },
  {
    title: 'Eazy Cancellation',
    description: 'Cancel up to 2 hours before departure and get refunded.',
    icon: CancellationIcon,
  },
  {
    title: 'Varified Drivers',
    description: 'Every driver on our platform is background-checked and verified.',
    icon: VerifiedIcon,
  },
  {
    title: 'Online Payment',
    description: 'Pay securely online with UPI, cards, or net banking via Razorpay.',
    icon: PaymentIcon,
  },
];

const CONTACT_ITEMS = [
  { label: 'Phone', icon: PhoneIcon, lines: ['+91 9419230057', '+91 8713905555'] },
  { label: 'Email', icon: MailIcon, lines: ['support@mannattravels.com'] },
  { label: 'Address', icon: MapPinIcon, lines: ['Jammu, IN'] },
];

const GALLERY_SLOTS: { type: 'photo' | 'video'; src: string; label: string }[] = [
  { type: 'photo', src: bus1, label: 'Our bus fleet' },
  { type: 'photo', src: bus2, label: 'Comfortable interiors' },
  { type: 'video', src: video1, label: 'On the road' },
];

const FAQS = [
  {
    q: 'Do I need an account to book?',
    a: 'No — you can book as a guest with just your name and email. You can save a password to manage your booking later if you want.',
  },
  {
    q: 'Can I cancel my booking?',
    a: 'Yes, free cancellation up to 2 hours before departure from My Bookings. Refunds are initiated immediately to your original payment method.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'UPI, credit/debit cards, and net banking, all processed securely via Razorpay.',
  },
  {
    q: 'How will I know my booking is confirmed?',
    a: "You'll see it instantly on the confirmation page, and we'll also send you a confirmation email.",
  },
  {
    q: 'What ID do I need to carry?',
    a: 'Carry the ID you provided during booking (Aadhar, PAN, Passport, or Driving License) — the driver may verify it at boarding.',
  },
];


export function HomePage() {
  const navigate = useNavigate();
  const { data: locations } = useLocations();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [searchError, setSearchError] = useState('');

  function handleSearch(e: FormEvent) {
    e.preventDefault();

    if (!from || !to) {
      setSearchError('Please select both a departure and destination city.');
      return;
    }

    setSearchError('');
    const params = new URLSearchParams();
    params.set('startLocation', from);
    params.set('endLocation', to);
    if (date) params.set('date', date);
    navigate(`/trips?${params}`);
  }

  return (
    <div>
      {/* Hero + search */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white">
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" aria-hidden="true">
          <defs>
            <pattern id="hero-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">Book your bus, hassle-free</h1>
          <p className="text-brand-100 mt-3">
            Search trips across our network and book in minutes.
          </p>

          <form
            onSubmit={handleSearch}
            className="mt-8 mb-8 bg-white rounded-xl p-4 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-left"
          >
            <LocationAutoComplete
              id="home-from"
              label="From"
              placeholder="Mumbai"
              value={from}
              onChange={setFrom}
              locations={locations ?? []}
            />
            <LocationAutoComplete
              id="home-to"
              label="To"
              placeholder="Pune"
              value={to}
              onChange={setTo}
              locations={locations ?? []}
            />
            <Input
              id="home-date"
              type="date"
              label="Date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
            />

            {searchError && (
              <div className="sm:col-span-3">
                <Alert variant="error">{searchError}</Alert>
              </div>
            )}

            <div className="sm:col-span-3">
              <Button type="submit" size="lg" className="w-full">Search trips</Button>
            </div>
          </form>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.title} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-50 text-brand-600 mb-4">
                  <step.icon />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">
            Why book with us
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SEARVICES.map((service) => (
              <div
                key={service.title}
                className="bg-white rounded-xl border border-slate-100 shadow-card hover:shadow-card-hover transition-shadow p-6 text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 text-brand-600 mb-4">
                  <service.icon />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{service.title}</h3>
                <p className="text-sm text-slate-500">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">See us on the road</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {GALLERY_SLOTS.map((slot) => (
              <div key={slot.label} className="relative w-full h-48 rounded-xl overflow-hidden bg-slate-100">
                {slot.type === 'photo' ? (
                  <img src={slot.src} alt={slot.label} className="w-full h-full object-cover" />
                ) : (
                  <video src={slot.src} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular destinations — real data, grows as more trips are added */}
      {locations && locations.length > 0 && (
        <section className="bg-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Popular destinations</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {locations.map((city) => (
                <Link
                  key={city}
                  to={`/trips?endLocation=${encodeURIComponent(city)}`}
                  className="px-5 py-2.5 rounded-full border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:border-brand-300 hover:text-brand-600 hover:shadow-card transition-all"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">About us</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Mannat Travels is a leading bus operator across the country. Our mission is to make bus travel convenient, safe, and affordable for everyone. With a user-friendly interface, real-time seat availability, and secure payment options, we strive to provide the best booking experience for our customers.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((item) => (
              <div key={item.q} className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
                <p className="font-semibold text-slate-900 mb-1">{item.q}</p>
                <p className="text-sm text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Contact us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {CONTACT_ITEMS.map((item) => (
              <div key={item.label}>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 text-brand-600 mb-3">
                  <item.icon />
                </div>
                <p className="font-semibold text-slate-900">{item.label}</p>
                {item.lines.map((line) => (
                  <p key={line} className="text-sm text-slate-600">{line}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
