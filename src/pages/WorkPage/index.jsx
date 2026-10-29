import { useState } from 'react';
import { Link } from 'react-router-dom';
import style from './index.module.css';
import SiteNav from '../../components/SiteNav';

// ============================================================
// DATA
// ============================================================

const roles = [
  {
    id: 'loomlights',
    company: 'Loomlights',
    role: 'Backend & DevOps Engineer',
    period: 'July 2026 – Present',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    summary: 'Running the infrastructure I used to just consume.',
    owned: [
      'Backend services and APIs for application workflows',
      'Kubernetes infrastructure and GitOps deployment pipelines',
      'Monitoring, logging, and backup workflows',
      'Application releases and production operations',
    ],
    shipped: [
      'GitOps pipeline: GitHub Actions → GHCR → Argo CD → K3s',
      'Vault-backed secrets for every service, zero secrets in Git',
      'Longhorn + Velero backup workflow with documented restore',
    ],
    stack: ['Go', 'Node.js', 'K3s', 'Argo CD', 'Vault', 'Longhorn', 'Velero'],
    relatedProjects: ['cluster', 'docs', 'incident-logs'],
  },
  {
    id: 'cray',
    company: 'Cray Group',
    role: 'DevOps Engineer',
    period: 'September 2024 – Present',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    summary: 'First real cluster. First 2 AM page. First restore that was not documented.',
    owned: [
      'K3s infrastructure and automated application deployments',
      'Argo CD, GitHub Actions, and containerized workloads',
      'Android release automation and infrastructure backups',
      'Monitoring and operational tooling',
    ],
    shipped: [
      'Multi-node K3s cluster with WireGuard as the Flannel backend',
      'Traefik + cert-manager for TLS on every Ingress',
      'Mailu mail stack, RabbitMQ, Redis, and MinIO running in-cluster',
      'Incident reports for every production incident, written in the GitOps repo',
    ],
    stack: ['K3s', 'WireGuard', 'Traefik', 'Argo CD', 'Helm', 'Mailu', 'RabbitMQ', 'Redis', 'MinIO'],
    relatedProjects: ['cluster', 'incident-logs'],
  },
  {
    id: 'opencrafts',
    company: 'OpenCrafts',
    role: 'Backend Contributor',
    period: 'May 2025 – Present',
    location: 'Remote',
    type: 'Contract',
    summary: 'Two backend systems, both about async work that cannot block the request.',
    owned: [
      'Backend services for Sherehe and Academia',
      'API features, data workflows, and integrations',
      'Async pipelines for media and notifications',
    ],
    shipped: [
      'Sherehe: REST API for events, organizers, attendees, S3 media pipeline',
      'Academia: ticketing, QR validation, RabbitMQ notification delivery',
      'Idempotent handlers so a duplicate scan does not issue two notifications',
    ],
    stack: ['Node.js', 'Express', 'PostgreSQL', 'RabbitMQ', 'BullMQ', 'S3'],
    relatedProjects: ['sherehe', 'academia'],
  },
];

const timelineEntries = [
  {
    id: 'portfolio-launch',
    date: '2026',
    title: 'Portfolio rebuilt as a DevOps reference',
    company: 'Personal',
    type: 'side-project',
    body: 'The third rewrite of this site. The first two were portfolios; this one is a documented system — 17 deployment guides, a stack page that lists what was ruled out, and a GitOps repo structure that the guides live inside.',
    relatedProjects: ['portfolio', 'docs'],
  },
  {
    id: 'cluster',
    date: '2024 – present',
    title: 'Three-node K3s cluster',
    company: 'Personal',
    type: 'side-project',
    body: 'A cluster I actually own — not a free-tier managed one. Designed for real power loss, real disk failure, and real operator mistakes. It has survived all three.',
    relatedProjects: ['cluster'],
  },
  {
    id: 'graduation',
    date: '2024',
    title: 'BSc Applied Computer Science',
    company: 'Daystar University',
    type: 'education',
    body: 'Focused on backend systems and networking. Learned how a request actually travels from a socket to a handler — and how much of a system you cannot see until it fails.',
    relatedProjects: [],
  },
];

const stats = [
  { value: '3', label: 'Roles held' },
  { value: '2+', label: 'Years in production' },
  { value: '2', label: 'Concurrent side projects' },
  { value: '0', label: 'Secrets in Git' },
];

const typeLabels = {
  'Full-time': 'Full-time',
  'Contract': 'Contract',
  'side-project': 'Side project',
  'education': 'Education',
};

// ============================================================
// COMPONENTS
// ============================================================

function TypeBadge({ type }) {
  return (
    <span className={`${style.badge} ${style[`badge${type.replace('-', '')}`] || ''}`}>
      {typeLabels[type] || type}
    </span>
  );
}

function RoleCard({ role, index }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={`${style.roleCard} ${open ? style.roleCardOpen : ''}`}>
      <button
        type="button"
        className={style.roleHeader}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={style.roleNum}>{String(index + 1).padStart(2, '0')}</span>
        <div className={style.roleHeaderMain}>
          <div className={style.roleTitleRow}>
            <h3 className={style.roleTitle}>{role.role}</h3>
            <TypeBadge type={role.type} />
          </div>
          <p className={style.roleCompany}>
            {role.company}
            {role.location && <span className={style.roleSep}> · </span>}
            {role.location && <span>{role.location}</span>}
          </p>
          <p className={style.roleSummary}>{role.summary}</p>
        </div>
        <div className={style.roleHeaderRight}>
          <span className={style.rolePeriod}>{role.period}</span>
          <span className={style.roleToggle}>{open ? '−' : '+'}</span>
        </div>
      </button>

      <div className={`${style.roleBody} ${open ? style.roleBodyOpen : ''}`}>
        <div className={style.roleBodyInner}>
          <div className={style.roleSection}>
            <p className={style.roleSectionLabel}>// WHAT I OWNED</p>
            <ul className={style.roleList}>
              {role.owned.map(o => <li key={o}>{o}</li>)}
            </ul>
          </div>

          <div className={style.roleSection}>
            <p className={style.roleSectionLabel}>// WHAT SHIPPED</p>
            <ul className={style.roleList}>
              {role.shipped.map(s => <li key={s}>{s}</li>)}
            </ul>
          </div>

          <div className={style.roleSection}>
            <p className={style.roleSectionLabel}>// STACK</p>
            <div className={style.roleStack}>
              {role.stack.map(s => (
                <span key={s} className={style.stackChip}>{s}</span>
              ))}
            </div>
          </div>

          {role.relatedProjects.length > 0 && (
            <div className={style.roleSection}>
              <p className={style.roleSectionLabel}>// RELATED PROJECTS</p>
              <div className={style.relatedLinks}>
                {role.relatedProjects.map(p => (
                  <Link key={p} to="/projects" className={style.relatedLink}>
                    {p} →
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function WorkPage() {
  return (
    <div className={style.page}>

      <SiteNav variant="devops" />

      {/* ===== HERO ===== */}
      <section className={style.hero}>
        <p className={style.label}>[ WORK / THE FULL ARC ]</p>
        <h1 className={style.title}>
          WHERE I'VE<br />
          <span className={style.titleMuted}>BEEN, WHAT SHIPPED</span>
        </h1>
        <p className={style.sub}>
          A résumé lists titles. This lists what each role actually owned and
          what shipped under it. Three roles, two concurrent side projects, and
          the timeline that connects them.
        </p>
        <div className={style.meta}>
          <span>3 roles</span>
          <span>2 side projects</span>
          <span>Nairobi · KE</span>
          <span>Remote-friendly</span>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className={style.statsBar}>
        {stats.map(s => (
          <div key={s.label} className={style.statItem}>
            <span className={style.statValue}>{s.value}</span>
            <span className={style.statLabel}>{s.label}</span>
          </div>
        ))}
      </section>

      {/* ===== ROLES ===== */}
      <section className={style.section}>
        <p className={style.label}>// ROLES</p>
        <h2 className={style.h2}>What each role owned and shipped.</h2>
        <p className={style.lede}>
          Click any role to expand the details — what was actually owned, what
          actually shipped, and which projects came out of it.
        </p>

        <div className={style.roleList}>
          {roles.map((role, i) => (
            <RoleCard key={role.id} role={role} index={i} />
          ))}
        </div>
      </section>

      {/* ===== TIMELINE ===== */}
      <section className={style.section}>
        <p className={style.label}>// TIMELINE</p>
        <h2 className={style.h2}>The short version.</h2>
        <p className={style.lede}>
          Education, first role, the side projects — in the order they happened.
        </p>

        <div className={style.timeline}>
          {timelineEntries.map(t => (
            <div key={t.id} className={style.timelineItem}>
              <div className={style.timelineLeft}>
                <span className={style.timelineDate}>{t.date}</span>
                <TypeBadge type={t.type} />
              </div>
              <div className={style.timelineBody}>
                <h3 className={style.timelineTitle}>{t.title}</h3>
                <p className={style.timelineCompany}>{t.company}</p>
                <p className={style.timelineText}>{t.body}</p>
                {t.relatedProjects.length > 0 && (
                  <div className={style.timelineLinks}>
                    {t.relatedProjects.map(p => (
                      <Link key={p} to="/projects" className={style.timelineLink}>
                        {p} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CLOSING ===== */}
      <section className={`${style.section} ${style.sectionLast}`}>
        <p className={style.label}>// END OF TIMELINE</p>
        <h2 className={style.h2}>Want the longer version?</h2>
        <p className={style.lede}>
          The projects page expands each of these into a case study — problem,
          build, lesson. The DevOps page goes deeper into how the infrastructure
          behind them actually works.
        </p>
        <div className={style.actions}>
          <Link to="/projects" className={style.btn}>
            Open the projects →
          </Link>
          <Link to="/devops" className={`${style.btn} ${style.btnGhost}`}>
            Explore DevOps →
          </Link>
          <a href="mailto:princeben9312@gmail.com" className={`${style.btn} ${style.btnGhost}`}>
            princeben9312@gmail.com
          </a>
        </div>
      </section>
    </div>
  );
}