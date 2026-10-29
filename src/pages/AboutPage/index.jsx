import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import style from './index.module.css';
import SiteNav from '../../components/SiteNav';

// ============================================================
// DATA
// ============================================================

const typedLines = [
  'I break things on purpose so they do not break by accident.',
  'I read the source code of tools I depend on.',
  'I write incident reports nobody asked for.',
  'I prefer the boring solution that works.',
];

const manifesto = [
  {
    title: 'Systems over stacks',
    body: 'The framework changes every two years. The property I care about — does the system stay up under load, does it recover, does it tell you why it broke — does not.',
  },
  {
    title: 'Documentation is part of the work',
    body: 'Every deployment on this site has a gotcha section. Every incident on the cluster has a markdown file in the GitOps repo. The docs are the memory of the system.',
  },
  {
    title: 'Boring is correct',
    body: 'A Postgres database in a single Debian VM will out-perform a badly-tuned distributed system for most workloads. Kubernetes is deployed here because the environment needs it, not because it is interesting.',
  },
  {
    title: 'One step before it is on fire',
    body: 'Most of DevOps is not fixing outages — it is making sure nothing silently drifts into one. Health probes, backup verification, drift detection. Boring, invisible, and the reason the interesting work happens.',
  },
];

const timeline = [
  { year: '2024', title: 'Applied Computer Science, Daystar', body: 'Graduated. Learned how a request actually travels from a socket to a handler — and how much of a system you cannot see until it fails.' },
  { year: '2024', title: 'DevOps Engineer, Cray Group', body: 'First real K3s cluster. First 2 AM page. First time a backup was needed and the restore procedure was not actually documented.' },
  { year: '2025', title: 'Backend Contributor, OpenCrafts', body: 'Sherehe and Academia — event management, ticketing, QR validation, async notification pipelines. Learned that a good API contract beats three clever optimizations.' },
  { year: '2026', title: 'Backend & DevOps Engineer, Loomlights', body: 'Running infrastructure I used to just consume. GitOps end to end, Vault for every secret, Longhorn and Velero for every backup.' },
];

const marqueeItems = [
  'Backend Engineering',
  'DevOps',
  'Platform Engineering',
  'Distributed Systems',
  'Kubernetes',
  'GitOps',
  'Argo CD',
  'Vault',
  'Go',
  'Node.js',
  'PostgreSQL',
  'Observability',
  'Incident Response',
  'Documentation',
];

const stats = [
  { value: '3+', label: 'Years in production' },
  { value: '17', label: 'Deployment guides written' },
  { value: '1', label: 'Cluster, still running' },
  { value: '0', label: 'Secrets in Git' },
];

const currently = [
  'Building the GitOps pipeline documented on this site',
  'Writing Go services other services can depend on',
  'Improving recovery time from simulated cluster-loss',
  'Reading the Kubernetes API server source, slowly',
];

const notCurrently = [
  'Writing microservices that could be one binary',
  'Adding a service mesh to a two-node cluster',
  'Claiming "100% uptime" without measurement',
  'Treating kubectl apply as a deployment strategy',
];

// ============================================================
// COMPONENT — typing effect
// ============================================================

function TypingLine({ lines }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = lines[lineIndex];
    const speed = deleting ? 30 : 55;
    const pause = deleting ? 20 : 1800;

    if (!deleting && charIndex === current.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }

    if (deleting && charIndex === 0) {
      setDeleting(false);
      setLineIndex((lineIndex + 1) % lines.length);
      return;
    }

    const t = setTimeout(() => {
      setCharIndex(c => c + (deleting ? -1 : 1));
    }, speed);

    return () => clearTimeout(t);
  }, [charIndex, deleting, lineIndex, lines]);

  return (
    <span>
      {lines[lineIndex].substring(0, charIndex)}
      <span className={style.cursor} />
    </span>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function AboutPage() {
  return (
    <div className={style.page}>

      <SiteNav variant="devops" />

      {/* ===== OPENING ===== */}
      <section className={style.opening}>
        <p className={style.label}>[ ABOUT / FIELD NOTES ]</p>

        <h1 className={style.openingType}>
          <TypingLine lines={typedLines} />
        </h1>

        <p className={style.openingSub}>
          That sentence is not a résumé line. It is the shape of how I work.
          Read on if it interests you. Skip to{' '}
          <a href="#work-together" className={style.inlineLink}>the end</a> if
          you already know.
        </p>
      </section>

      {/* ===== MARQUEE ===== */}
      <section className={style.marqueeSection}>
        <div className={style.marquee}>
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className={style.marqueeItem}>
              {item}
              <span className={style.marqueeDot}>·</span>
            </span>
          ))}
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className={style.section}>
        <p className={style.label}>// IN NUMBERS</p>
        <h2 className={style.h2}>The dashboard.</h2>

        <div className={style.statsGrid}>
          {stats.map(s => (
            <div key={s.label} className={style.statCard}>
              <span className={style.statValue}>{s.value}</span>
              <span className={style.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== MANIFESTO ===== */}
      <section className={style.section}>
        <p className={style.label}>// HOW I THINK ABOUT THIS WORK</p>
        <h2 className={style.h2}>Four things I actually believe.</h2>

        <div className={style.manifestoList}>
          {manifesto.map((m, i) => (
            <article key={m.title} className={style.manifestoItem}>
              <div className={style.manifestoNum}>{String(i + 1).padStart(2, '0')}</div>
              <div className={style.manifestoBody}>
                <h3 className={style.manifestoTitle}>{m.title}</h3>
                <p className={style.manifestoText}>{m.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== TIMELINE ===== */}
      <section className={style.section}>
        <p className={style.label}>// HOW I GOT HERE</p>
        <h2 className={style.h2}>The long version, compressed.</h2>

        <div className={style.timeline}>
          {timeline.map(t => (
            <div key={t.year + t.title} className={style.timelineItem}>
              <div className={style.timelineYear}>{t.year}</div>
              <div className={style.timelineBody}>
                <h3 className={style.timelineTitle}>{t.title}</h3>
                <p className={style.timelineText}>{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== STATUS ===== */}
      <section className={style.section}>
        <p className={style.label}>// CURRENT STATUS</p>
        <h2 className={style.h2}>Doing. And deliberately not doing.</h2>

        <div className={style.statusGrid}>
          <div className={style.statusColumn}>
            <p className={style.statusLabel}>
              <span className={style.statusMark}>+</span> Doing
            </p>
            <ul className={style.statusList}>
              {currently.map(c => <li key={c}>{c}</li>)}
            </ul>
          </div>

          <div className={style.statusColumn}>
            <p className={style.statusLabel}>
              <span className={style.statusMarkMuted}>−</span> Not doing
            </p>
            <ul className={style.statusList}>
              {notCurrently.map(c => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== CLOSING ===== */}
      <section className={`${style.section} ${style.sectionLast}`} id="work-together">
        <p className={style.label}>// END OF FILE</p>
        <h2 className={style.h2}>If you want to talk systems,<br />the inbox is open.</h2>
        <p className={style.lede}>
          Backend engineering, infrastructure, distributed systems —
          or something you are trying to figure out and cannot quite
          name yet.
        </p>

        <div className={style.actions}>
          <a href="mailto:princeben9312@gmail.com" className={style.btn}>
            princeben9312@gmail.com →
          </a>
          <Link to="/devops" className={`${style.btn} ${style.btnGhost}`}>
            See how I ship code →
          </Link>
        </div>
      </section>
    </div>
  );
}