import './ab.css';
import rgt from '../assets/arrow_r_to_l.png';
import sim from '../assets/simp.png';
import ar from '../assets/arrow_l_to_r.png';
import acc from '../assets/access.png';
import { useLanguage } from '../context/LanguageContext';

function Apage() {
  const { t } = useLanguage();
  const simpleLines = t('about.simpleLines');
  const accessLines = t('about.accessLines');

  return (
    <div className='about-container'>
      <div className="title-div">
        <h1 id="title-text">{t('about.title')}</h1>
      </div>
      <h1 id='h1'>{t('about.heading')}</h1>
      <div>
        <p id='p'>{t('about.intro1')}</p>
        <p id='p'>{t('about.intro2')}</p>
      </div>
      <h1 id='h2'>{t('about.sectionTitle')}</h1>
      <div className='sna-div'>
        <div className='sh1'>
          <div className='sh1-image'>
            <h2 className='hehe'>{t('about.simpleTitle')}</h2>
            <div className='sh1-image2'>
              <div className='sa'>
                <img src={sim} alt='' width="150"></img>
              </div>
              <div className='arr'>
                <img src={ar} alt='' width='100'></img>
              </div>
            </div>
          </div>
          <div className='sh1-content'>
            <div className='circle-l'>
              <div>
                {simpleLines.map((line) => (
                  <p key={line} className='para'>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className='sh2'>
          <div className='sh2-content'>
            <div className='circle-r'>
              <div>
                {accessLines.map((line) => (
                  <p key={line} className='para'>{line}</p>
                ))}
              </div>
            </div>
          </div>
          <div className='sh2-image'>
            <h2 className="jee">{t('about.accessTitle')}</h2>
            <div className='sh2-image2'>
              <div className='arc'>
                <img src={rgt} alt='' width='100'></img>
              </div>
              <div className='pic1'>
                <img src={acc} alt='' width='150'></img>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Apage;
