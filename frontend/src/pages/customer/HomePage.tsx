import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocationAutoComplete } from '../../components/ui/LocationAutoComplete';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useLocations } from '../../hooks/useLocations';

const SEARVICES = [
  {
    title: '24/7 Support',
    description: 'Reach us anytime, day or night, for help with your booking.',
  },
  {
    title: 'Eazy Cancellation',
    description: 'Cancel up to 2 hours before departure and get refunded.',
  },
  {
    title: 'Varified Drivers',
    description: 'Every driver on our platform is background-checked and verified.',
  },
  {
    title: 'Online Payment',
    description: 'Pay securely online with UPI, cards, or net banking via Razorpay.',
  }
];

export function HomePage() {
  const navigate = useNavigate();
  const { data: locations } = useLocations();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('startLocation', from);
    if (to) params.set('endLocation', to);
    if (date) params.set('date', date);
    navigate(`/trips/search?${params}`);
  }

  return (
    <div>
      {/* Hero + search */}
      <section className="bg-brand-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold">Book your bus, hassle-free</h1>
          <p className="text-brand-100 mt-3">
            Search trips across our network and book in minutes.
          </p>

          <form
            onSubmit={handleSearch}
            className="mb-8 bg-white rounded-xl p-4 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-left"
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

            <div className="sm:col-span-3">
              <Button type="submit" size="lg" className="w-full">Search trips</Button>
            </div>
          </form>
        </div>
      </section>

      {/* Services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">
          Why book with us
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SEARVICES.map((service) => (
            <div
              key={service.title}
              className="bg-white rounded-xl border border-slate-100 p-6 text-center"
            >
              <h3 className="font-semibold text-slate-900 mb-2">{service.title}</h3>
              <p className="text-sm text-slate-500">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="bg-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">About us</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Mannat Travels is a leading bus operator across the country. Our mission is to make bus travel convenient, safe, and affordable for everyone. With a user-friendly interface, real-time seat availability, and secure payment options, we strive to provide the best booking experience for our customers.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Contact us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-sm text-slate-600">
          <div>
            <p className="font-semibold text-slate-900">Phone</p>
            <p>[Phone number here]</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Email</p>
            <p>[Email address here]</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Address</p>
            <p>[Add office/address]</p>
          </div>
        </div>
      </section>
    </div>
  )
}
