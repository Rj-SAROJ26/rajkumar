import { Link } from 'react-router-dom';
import skin from '../assets/skinvision.webp';
import car from '../assets/rash.png';
import Footer from './Footer';
import { useLanguage } from '../context/LanguageContext';
import './Home.css';

function HomePage() {
  const { t } = useLanguage();
  const diseaseGroups = [
    {
      title: t('home.groups.fungal'),
      accent: 'fungal',
      items: [
        { name: "Athlete's Foot", symptoms: ['Itching', 'Burning', 'Cracks', 'Peeling skin'] },
        { name: 'Nail Fungus', symptoms: ['Discoloration', 'Thickened nails', 'Brittle nails', 'Odor'] },
        { name: 'Ringworm', symptoms: ['Circular rash', 'Scaly skin', 'Itching', 'Inflammation'] },
      ],
    },
    {
      title: t('home.groups.bacterial'),
      accent: 'bacterial',
      items: [
        { name: 'Cellulitis', symptoms: ['Redness', 'Swelling', 'Warm skin', 'Fever'] },
        { name: 'Impetigo', symptoms: ['Blisters', 'Sores', 'Crusting', 'Itching'] },
      ],
    },
    {
      title: t('home.groups.viral'),
      accent: 'viral',
      items: [
        { name: 'Chickenpox', symptoms: ['Fever', 'Rashes', 'Blisters', 'Tiredness'] },
        { name: 'Shingles', symptoms: ['Burning pain', 'Rash', 'Blisters', 'Nerve pain'] },
      ],
    },
    {
      title: t('home.groups.parasitic'),
      accent: 'parasitic',
      items: [
        { name: 'Cutaneous Larva Migrans', symptoms: ['Red tracks', 'Itching', 'Rashes', 'Swelling'] },
      ],
    },
  ];

  const quickStats = [
    { label: t('home.stats.covered'), value: '8' },
    { label: t('home.stats.fast'), value: '< 1 min' },
  ];

  return (
    <div className="home-page">
      <section className="home-hero-shell">
        <div className="home-hero-panel">
          <div className="home-hero-visual hero-visual-left">
            <div className="home-hero-grid" />
            <img src={car} alt="Skin condition illustration" className="hero-rash-illustration" />
          </div>

          <div className="home-hero-copy">
            <span className="hero-kicker">{t('home.kicker')}</span>
            <h1>{t('home.title')}</h1>
            <p>{t('home.description')}</p>
            <div className="hero-actions">
              <Link to="/upload" className="hero-primary-link hero-primary-button">
                {t('home.cta')}
              </Link>
              <Link to="/chatbot" className="hero-primary-link hero-primary-button">
                {t('home.chatCta')}
              </Link>
              <a
                href="https://rajkumar-8.onrender.com"
                className="hero-primary-link hero-primary-button"
                target="_blank"
                rel="noreferrer"
              >
                Live Link
              </a>
            </div>
            <p className="hero-disclaimer">{t('home.disclaimer')}</p>
          </div>

          <div className="home-hero-visual hero-visual-right">
            <div className="hero-preview-frame">
              <img src={skin} alt="Mobile skin scan preview" className="hero-phone-preview" />
              <div className="hero-orb hero-orb-one" />
              <div className="hero-orb hero-orb-two" />
            </div>
          </div>
        </div>
      </section>

      <section className="home-stats">
        {quickStats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="home-diseases">
        <div className="section-heading">
          <span className="section-kicker">{t('home.sectionKicker')}</span>
          <h2>{t('home.sectionTitle')}</h2>
          <p>{t('home.sectionDescription')}</p>
        </div>

        <div className="disease-grid">
          {diseaseGroups.map((group) => (
            <article key={group.title} className={`disease-group-card ${group.accent}`}>
              <div className="group-header">
                <span className="group-badge">{group.title}</span>
                <span className="group-count">{group.items.length} {t('home.conditions')}</span>
              </div>

              <div className="group-tiles">
                {group.items.map((item) => (
                  <div key={item.name} className="disease-tile">
                    <h3>{item.name}</h3>
                    <p>{t('home.commonSigns')}</p>
                    <ul>
                      {item.symptoms.map((symptom) => (
                        <li key={symptom}>{symptom}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default HomePage;
