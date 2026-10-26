import { useState } from 'react';
import { Link } from 'react-router-dom';
import style from './index.module.css';
import SiteNav from '../../components/SiteNav';

// ============================================================
// DATA — replace with your real projects
// ============================================================

const projects = [
  {
    id: 'portfolio',
    name: 'This Portfolio',
    category: 'Frontend / DevOps',
    type: 'Frontend',
    year: '2026',
    tagline: 'The site you are reading right now.',
    stack: ['React', 'Vite', 'CSS Modules', 'GitHub Actions', 'Vercel'],
    status: 'live',
    repo: 'https://github.com/example-org/website',
    live: 'https://example.com',
    problem:
      'Every portfolio claims to be "built with modern tools" and then is a template. I wanted a portfolio that also demonstrates the deployment patterns it claims to know — GitOps, CI/CD, reproducible builds — without pretending to be a product.',
    what: [
      'Single-page React app with 15+ routed pages, all static-rendered by Vite',
      'Custom CSS Modules design system — no UI library, no Tailwind, no CSS-in-JS',
      'Every deployment guide on this site is written from a real manifest',
      'CI pipeline builds and deploys on every push to main',
    ],
    learned:
      'The hard part of a portfolio is not code — it is admitting which parts are illustrative and which are real. I chose to be explicit about which deployments run in production and which are templates.',
  },
  {
    id: 'cluster',
    name: 'K3s Home Cluster',
    category: 'DevOps / Platform Engineering',
    type: 'DevOps',
    year: '2024–present',
    tagline: 'A three-node K3s cluster running in a spare room.',
    stack: ['K3s', 'WireGuard', 'Traefik', 'Longhorn', 'Velero', 'Argo CD', 'Vault'],
    status: 'live',
    repo: null,
    live: null,
    problem:
      'I wanted a cluster I actually own — not a free-tier managed one — where I could break things at 2 AM and learn from the failure without involving anyone else. That meant designing for real power loss, real disk failure, and real operator mistakes.',
    what: [
      'K3s with WireGuard as the Flannel backend — every pod-to-pod packet encrypted',
      'Argo CD watching a GitOps repo — manual edits are reverted within seconds',
      'Longhorn for persistent volumes, Velero for cluster backups to a separate machine',
      'Traefik + cert-manager for TLS on every Ingress',
      'HashiCorp Vault for every secret — nothing sensitive in Git',
    ],
    learned:
      'A cluster is not "done" when it comes up. It is done when you have lost power to it once, recovered a volume from backup, and debugged a failed upgrade. None of those lessons are in the installation docs.',
  },
  {
    id: 'docs',
    name: 'Deployment Guides',
    category: 'Documentation / Writing',
    type: 'Writing',
    year: '2025–present',
    tagline: 'Seventeen deployment patterns, each with its own gotchas.',
    stack: ['Markdown', 'React', 'Kubernetes', 'Helm', 'Argo CD'],
    status: 'live',
    repo: 'https://github.com/example-org/deployment-guides',
    live: '/deployment-guides',
    problem:
      'Most deployment documentation explains what to do and stops there. The failures happen in the gap between "the official docs" and "the thing that actually runs in my cluster." I wanted to write the guide that sits in that gap.',
    what: [
      'Every guide links to the tool\'s official documentation — but also to the specific gotcha',
      'Each guide ends with a "what will break" section, not a summary',
      'The series is ordered so a reader can build the whole platform from scratch',
      'Covers the tools I actually use, not the tools that are trendy',
    ],
    learned:
      'Writing documentation is the fastest way to find out what you do not actually understand. Half the gotchas in these guides are things I hit while writing them.',
  },
  {
    id: 'incident-logs',
    name: 'Incident Logs',
    category: 'Documentation / Operations',
    type: 'Writing',
    year: '2024–present',
    tagline: 'The post-incident write-ups nobody asked for.',
    stack: ['Markdown', 'Git', 'Postgres', 'Redis'],
    status: 'live',
    repo: null,
    live: null,
    problem:
      'The instinct after fixing an incident is to move on. The result is that the same incident happens again six months later, and this time it takes twice as long to diagnose because the previous fix was not written down.',
    what: [
      'One markdown file per production incident in the GitOps repo',
      'Structured the same way each time: what happened, root cause, remediation, prevention',
      'Written for the future operator — not for the person who was on call',
      'Includes the command that would have caught it earlier',
    ],
    learned:
      'Incident reports are not administrative overhead. They are the only artefact that makes the next incident cheaper than this one.',
  },
  {
    id: 'sherehe',
    name: 'Sherehe Backend',
    category: 'Backend Engineering',
    type: 'Backend',
    year: '2025–2026',
    tagline: 'Event management backend with async media handling.',
    stack: ['Node.js', 'Express', 'PostgreSQL', 'S3', 'BullMQ'],
    status: 'contributor',
    repo: null,
    live: null,
    problem:
      'Organizers needed a backend that could handle event discovery, attendee management, and image uploads without blocking on any of them. Uploads and thumbnails could not run in the request path.',
    what: [
      'REST API for events, organizers, and attendees',
      'Async media pipeline — uploads go to S3, thumbnail generation runs in BullMQ workers',
      'Role-based access control between organizers and attendees',
      'Every endpoint documented in the OpenAPI spec',
    ],
    learned:
      'A good API contract is worth more than three clever optimizations. The version of this backend that ran was the boring one — the interesting versions were rewritten twice.',
  },
  {
    id: 'academia',
    name: 'Academia Platform',
    category: 'Backend / Distributed Systems',
    type: 'Distributed Systems',
    year: '2025–2026',
    tagline: 'Ticketing and QR validation with async notifications.',
    stack: ['Node.js', 'RabbitMQ', 'PostgreSQL'],
    status: 'contributor',
    repo: null,
    live: null,
    problem:
      'Ticket validation and notification delivery could not share a request lifecycle. A slow SMTP server should not slow down a QR scan, and a failed notification should not void a ticket.',
    what: [
      'Ticket lifecycle with QR-code validation',
      'RabbitMQ for async notification delivery and cross-service events',
      'Idempotent handlers so a duplicate scan does not issue two notifications',
      'Dead-letter queue for failed notifications with a retry policy',
    ],
    learned:
      'Message queues are the tool that separates a toy backend from a real one. Once you have a queue, you stop writing retry logic in every handler and start writing it once.',
  },
];

const filters = ['All', 'Frontend', 'Backend', 'DevOps', 'Distributed Systems', 'Writing'];

// ============================================================
// COMPONENT — status badge
// ============================================================

function StatusBadge({ status }) {
  const label =
    status === 'live' ? 'LIVE' :
    status === 'contributor' ? 'CONTRIBUTOR' :
    status === 'archived' ? 'ARCHIVED' : status.toUpperCase();

  return (
    <span className={`${style.badge} ${style[`badge${status.charAt(0).toUpperCase()}${status.slice(1)}`]}`}>
      <span className={style.badgeDot} />
      {label}
    </span>
  );
}

// ============================================================
// COMPONENT — project row (expandable)
// ============================================================

function ProjectRow({ project, index }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={`${style.projectRow} ${open ? style.projectRowOpen : ''}`}>
      <button
        type="button"
        className={style.projectHeader}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={style.projectNum}>{String(index + 1).padStart(2, '0')}</span>
        <div className={style.projectHeaderMain}>
          <div className={style.projectTitleRow}>
            <h3 className={style.projectName}>{project.name}</h3>
            <StatusBadge status={project.status} />
          </div>
          <p className={style.projectTagline}>{project.tagline}</p>
          <div className={style.projectMeta}>
            <span className={style.projectCat}>{project.category}</span>
            <span className={style.projectYear}>{project.year}</span>
          </div>
        </div>
        <span className={style.projectToggle}>{open ? '−' : '+'}</span>
      </button>

      <div className={`${style.projectBody} ${open ? style.projectBodyOpen : ''}`}>
        <div className={style.projectBodyInner}>
          <div className={style.projectSection}>
            <p className={style.projectSectionLabel}>// THE PROBLEM</p>
            <p className={style.projectSectionText}>{project.problem}</p>
          </div>

          <div className={style.projectSection}>
            <p className={style.projectSectionLabel}>// WHAT I BUILT</p>
            <ul className={style.projectList}>
              {project.what.map(w => <li key={w}>{w}</li>)}
            </ul>
          </div>

          <div className={style.projectSection}>
            <p className={style.projectSectionLabel}>// WHAT I LEARNED</p>
            <p className={style.projectSectionText}>{project.learned}</p>
          </div>

          <div className={style.projectSection}>
            <p className={style.projectSectionLabel}>// STACK</p>
            <div className={style.projectStack}>
              {project.stack.map(s => (
                <span key={s} className={style.stackChip}>{s}</span>
              ))}
            </div>
          </div>

          {(project.repo || project.live) && (
            <div className={style.projectLinks}>
              {project.repo && (
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${style.btn} ${style.btnGhost}`}
                >
                  Repository ↗
                </a>
              )}
              {project.live && (
                project.live.startsWith('/') ? (
                  <Link to={project.live} className={style.btn}>
                    View live →
                  </Link>
                ) : (
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={style.btn}
                  >
                    View live ↗
                  </a>
                )
              )}
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

export default function ProjectsPage() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = projects.filter(
    p => activeFilter === 'All' || p.type === activeFilter
  );

  return (
    <div className={style.page}>

      <SiteNav variant="devops" />



      {/* ===== HERO ===== */}
      <section className={style.hero}>
        <p className={style.label}>[ PROJECTS / FIELD WORK ]</p>
        <h1 className={style.title}>
          THINGS I<br />
          <span className={style.titleMuted}>ACTUALLY BUILT</span>
        </h1>
        <p className={style.sub}>
          Not a list of technologies. Not a wall of green squares. Six projects
          — some running in production, some written to be read, one that is
          literally this website. Each one is documented in the same structure:
          problem, build, lesson.
        </p>
        <div className={style.meta}>
          <span>{projects.length} projects</span>
          <span>3 live</span>
          <span>2 open source</span>
          <span>1 you are reading</span>
        </div>
      </section>

      {/* ===== FILTERS ===== */}
      <section className={style.filterSection}>
        <p className={style.label}>// FILTER</p>
        <div className={style.filterBar}>
          {filters.map(f => (
            <button
              key={f}
              className={`${style.filterBtn} ${activeFilter === f ? style.filterBtnActive : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      {/* ===== PROJECTS ===== */}
      <section className={`${style.section} ${style.sectionLast}`}>
        <div className={style.projectList}>
          {filtered.length === 0 && (
            <p className={style.emptyState}>
              No projects in this category yet.
            </p>
          )}
          {filtered.map((project, i) => (
            <ProjectRow key={project.id} project={project} index={i} />
          ))}
        </div>
      </section>

      {/* ===== FOOTER CTA ===== */}
      <section className={style.cta}>
        <p className={style.label}>// MORE</p>
        <h2 className={style.h2}>Looking for something specific?</h2>
        <p className={style.lede}>
          Deployment patterns, infrastructure decisions, and the reasoning
          behind each one live in the DevOps section. If you want the
          deeper technical walkthrough, that is where it is.
        </p>
        <div className={style.actions}>
          <Link to="/devops" className={style.btn}>
            Explore DevOps →
          </Link>
          <a href="mailto:prince@ordochao.tech" className={`${style.btn} ${style.btnGhost}`}>
            prince@ordochao.tech
          </a>
        </div>
      </section>
    </div>
  );
}