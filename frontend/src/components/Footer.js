import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import './Footer.css';

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <p>
            {t('footer.about')}
          </p>
          <p>{t('footer.rights')}</p>
        </div>

        <div className="footer-links">
          <div className="footer-column">
            <a href="#">{t('footer.main')}</a>
            <a href="#">{t('footer.early')}</a>
            <a href="#">{t('footer.how')}</a>
          </div>
          <div className="footer-column">
            <a href="#">{t('footer.features')}</a>
            <a href="#">{t('footer.faq')}</a>
            <a href="#">{t('footer.privacy')}</a>
            <a href="#">{t('footer.terms')}</a>
          </div>
        </div>

        <div className="footer-right">
          <p className="footer-contact-text">{t('footer.contact')}</p>
          <a
            className="email-link"
            href="mailto:rajsagarsaroj17@gmail.com?subject=Skin%20Diseases%20Detection%20Support"
          >
            rajsagarsaroj17@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
