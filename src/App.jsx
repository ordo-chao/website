import { useState } from 'react';
import './index.css';

// ============ DATA ============

const projects = [
  {
    name: 'Kubernetes Infrastructure & GitOps',
    category: 'DevOps / Platform Engineering',
    type: 'DevOps',
    desc: 'Operate K3s-based application infrastructure with GitHub Actions CI/CD, Argo CD GitOps deployments, centralized observability, and backup workflows using Velero and S3.',
    tag: 'K3s / Argo CD / Docker',
    year: '2026',
    href: '#',
  },
  {
    name: 'Sherehe Event Management Backend',
    category: 'Backend Engineering',
    type: 'Backend',
    desc: 'Backend services for event management, organizer workflows, attendee operations, and media handling with S3-based asset storage.',
    tag: 'Node.js / REST APIs / S3',
    year: '2025–2026',
    href: '#',
  },
  {
    name: 'ISP Ticketing System',
    category: 'Backend Engineering',
    type: 'Backend',
    desc: 'Ticket lifecycle management, role-based access control, SLA tracking, and ticket history with a mobile client.',
    tag: 'Node.js / PostgreSQL',
    year: '2026',
    href: '#',
  },
  {
    name: 'Academia Platform',
    category: 'Backend / Distributed Systems',
    type: 'Distributed Systems',
    desc: 'Academic platform features involving QR validation, ticketing workflows, and asynchronous notifications using RabbitMQ.',
    tag: 'Node.js / RabbitMQ',
    year: '2025–2026',
    href: '#',
  },
];

const featured = {
  name: 'Kubernetes Infrastructure & GitOps',
  challenge:
    'Managing application deployments, configuration, monitoring, and recovery across containerized workloads without relying on manual operations.',
  implementation: [
    'Automated CI/CD workflows using GitHub Actions.',
    'GitOps-based application deployment with Argo CD.',
    'Container orchestration using K3s.',
    'Application routing and TLS using Traefik.',
    'Monitoring and observability using Prometheus, Grafana, and Loki.',
    'Backup and recovery workflows using Velero and S3.',
  ],
  considerations: [
    'How do you roll back a failed deployment?',
    'How do you know when an application becomes unhealthy?',
    'How do you recover after losing a workload or persistent data?',
    'How do you keep deployment configuration consistent?',
  ],
  repo: '#',
  caseStudy: '#',
};

const architecture = [
  {
    title: 'API Architecture',
    diagram: [
      'Client',
      'REST API',
      'Business Logic',
      'Database',
    ],
    why: 'Separates interface, logic, and storage so each layer can evolve and be tested independently.',
  },
  {
    title: 'Asynchronous Processing',
    diagram: [
      'Client',
      'REST API',
      'Message Queue',
      'Background Worker',
      'Email / Notification',
    ],
    why: 'Lets the API respond immediately while heavy work (email, media, notifications) runs in the background.',
  },
  {
    title: 'Deployment Architecture',
    diagram: [
      'GitHub Actions',
      'Container Registry',
      'Argo CD',
      'Kubernetes / K3s',
    ],
    why: 'Git becomes the source of truth. Deployments are repeatable and every change is auditable.',
  },
];

const experience = [
  {
    company: 'Loomlights',
    role: 'Backend & DevOps Engineer',
    period: 'July 2026 – Present',
    location: 'Nairobi, Kenya',
    points: [
      'Develop backend services and APIs for application workflows.',
      'Maintain Kubernetes infrastructure and GitOps deployment pipelines.',
      'Implement monitoring, logging, and backup workflows.',
      'Support application releases and production operations.',
    ],
  },
  {
    company: 'Cray Group',
    role: 'DevOps Engineer',
    period: 'September 2024 – Present',
    location: 'Nairobi, Kenya',
    points: [
      'Maintain K3s infrastructure and automated application deployments.',
      'Work with Argo CD, GitHub Actions, and containerized workloads.',
      'Support Android release automation and infrastructure backups.',
      'Configure monitoring and operational tooling.',
    ],
  },
  {
    company: 'OpenCrafts',
    role: 'Backend Contributor',
    period: 'May 2025 – Present',
    location: '',
    points: [
      'Contribute to backend services for projects including Sherehe and Academia.',
      'Implement API features, data workflows, and integrations.',
    ],
  },
];

const certifications = [
  {
    name: 'Google Cybersecurity Certificate',
    issuer: 'Google',
    year: '2024',
    description: 'Cybersecurity fundamentals, security operations, and risk awareness.',
    href: '#',
  },
  {
    name: 'Software Engineering Program',
    issuer: 'Power Learn Project',
    year: '2024',
    description: 'Software engineering training and practical development.',
    href: '#',
  },
];

const infra = [
  {
    title: 'CI/CD & GitOps',
    desc: 'Automated builds, deployments, synchronization, and rollback workflows.',
    tech: 'GitHub Actions · Argo CD',
  },
  {
    title: 'Containers & Orchestration',
    desc: 'Containerized applications, Kubernetes workloads, ingress, and service deployment.',
    tech: 'Docker · K3s · Kubernetes · Traefik',
  },
  {
    title: 'Observability & Recovery',
    desc: 'Metrics, dashboards, logs, uptime monitoring, and backup restoration.',
    tech: 'Prometheus · Grafana · Loki · Velero · S3',
  },
];

const principles = [
  {
    title: 'Automation first',
    desc: 'I look for repetitive processes that can be automated to make software delivery more consistent.',
  },
  {
    title: 'Reliability matters',
    desc: 'I care about monitoring, error handling, backup strategies, and understanding what happens when systems fail.',
  },
  {
    title: 'Understand the whole system',
    desc: 'I enjoy understanding how applications, databases, messaging systems, and infrastructure work together.',
  },
  {
    title: 'Keep learning',
    desc: 'I continuously explore technologies and improve my understanding of software engineering fundamentals.',
  },
];

const skillGroups = [
  {
    title: 'Backend Engineering',
    skills: ['Node.js', 'Express.js', 'Go', 'REST APIs', 'PostgreSQL', 'MongoDB', 'Redis'],
  },
  {
    title: 'DevOps & Infrastructure',
    skills: ['Docker', 'Kubernetes', 'K3s', 'Argo CD', 'GitHub Actions', 'Linux', 'Traefik', 'AWS S3'],
  },
  {
    title: 'Messaging & Automation',
    skills: ['RabbitMQ', 'BullMQ', 'CI/CD', 'GitOps', 'Backup & Recovery', 'Monitoring'],
  },
  {
    title: 'Mobile & Frontend',
    skills: ['React Native', 'Flutter', 'React', 'JavaScript', 'Dart', 'HTML5', 'CSS3'],
  },
];

const socials = [
  { label: 'GitHub',   href: 'https://github.com/ordo-chao' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ordo-chao' },
  { label: 'Instagram',    href: 'https://www.instagram.com/ordo_cha0' },
  { label: 'Email',    href: 'mailto:princeben9312@gmail.com' },
];

const filters = ['All', 'Backend', 'DevOps', 'Distributed Systems', 'Mobile'];

// ============ APP ============

export default function App() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredProjects = projects.filter(
    p => activeFilter === 'All' || p.type === activeFilter
  );

  return (
    <div className="page">

      {/* ===== NAV ===== */}
      <nav className="nav">
        <span className="nav-logo">PBW<span className="accent">.</span></span>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#experience">Experience</a>
          <a href="#work">Work</a>
          <a href="#infra">Infrastructure</a>
          <a href="#stack">Stack</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="hero">
        <p className="label">[ SOFTWARE ENGINEER / NAIROBI, KE ]</p>
        <h1 className="hero-title">
          PRINCE<br />
          <span className="hero-title-muted">BENEDICT</span><br />
          <span className="hero-title-muted">WACHIRA</span>
        </h1>
        <p className="hero-sub">
          I'm a software engineer and DevOps practitioner based in Kenya.
          I build backend systems, automate deployments, and operate
          containerized applications using Go, Node.js, Docker, Kubernetes,
          and GitOps. I enjoy turning complex technical problems into
          reliable, maintainable systems.
        </p>
        <div className="hero-highlights">
          <span>Backend Engineering</span>
          <span>Cloud-Native Infrastructure</span>
          <span>Mobile Development</span>
        </div>
        <div className="hero-actions">
          <a href="#work" className="btn">Explore my work →</a>
          <a
            href="/Prince-Benedict-Wachira-CV.pdf"
            className="btn btn-ghost"
            target="_blank"
            rel="noopener noreferrer"
          >
            View CV ↗
          </a>
        </div>
        <div className="hero-scroll">↓ scroll</div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about" className="about">
        <div>
          <p className="label">// ABOUT</p>
          <h2 className="h2">
            Code is like art:<br />
            clean, powerful,<br />
            and meant to express.
          </h2>
        </div>
        <div className="about-right">
          <p className="muted">
            I'm a software engineer based in Kenya and a graduate of
            Daystar University, where I studied Applied Computer Science.
            I focus on backend engineering and DevOps, building APIs,
            distributed services, and deployment pipelines that support
            reliable software delivery.
          </p>
          <p className="muted">
            My experience includes Node.js, Go, relational databases,
            containerized applications, Kubernetes, CI/CD, and GitOps.
            I also work with mobile technologies, connecting applications
            to the backend systems that power them.
          </p>
          <p className="muted">
            I'm interested in understanding systems from end to end:
            how software is designed, how it communicates, how it is
            deployed, and how it behaves in production.
          </p>
        </div>
      </section>

      {/* ===== EXPERIENCE ===== */}
      <section id="experience" className="experience">
        <p className="label">// EXPERIENCE</p>
        <h2 className="h2" style={{ marginBottom: 40 }}>Where I've<br />worked.</h2>
        <div className="exp-list">
          {experience.map(e => (
            <article key={e.company} className="exp-item">
              <header className="exp-head">
                <div>
                  <h3 className="exp-role">{e.role}</h3>
                  <span className="exp-company">
                    {e.company}{e.location && ` · ${e.location}`}
                  </span>
                </div>
                <span className="exp-period">{e.period}</span>
              </header>
              <ul className="exp-points">
                {e.points.map(p => <li key={p}>{p}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ===== WORK + FILTER ===== */}
      <section id="work" className="projects">
        <p className="label">// SELECTED PROJECTS</p>

        <div className="filter-bar">
          {filters.map(f => (
            <button
              key={f}
              className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="project-list">
          {filteredProjects.length === 0 && (
            <div className="project-row">
              <span className="muted">No projects in this category yet.</span>
            </div>
          )}
          {filteredProjects.map((p, i) => {
            const isLink = p.href && p.href !== '#';
            const Wrapper = isLink ? 'a' : 'article';
            const wrapperProps = isLink
              ? { href: p.href, target: '_blank', rel: 'noopener noreferrer' }
              : {};
            return (
              <Wrapper key={p.name} className="project-row" {...wrapperProps}>
                <div>
                  <span className="project-num">0{i + 1}</span>
                  <span className="project-name">{p.name}</span>
                  <span className="project-cat">{p.category}</span>
                  <p className="project-desc">{p.desc}</p>
                </div>
                <div className="project-meta">
                  <span className="project-tag">{p.tag}</span>
                  <span className="project-year">{p.year}</span>
                </div>
              </Wrapper>
            );
          })}
        </div>
      </section>

      {/* ===== FEATURED PROJECT ===== */}
      <section id="featured" className="featured">
        <p className="label">// FEATURED PROJECT</p>
        <h2 className="h2" style={{ marginBottom: 12 }}>{featured.name}</h2>
        <p className="muted" style={{ maxWidth: 640, marginBottom: 40 }}>
          A deeper look at how I build and operate the infrastructure behind
          the applications I work on.
        </p>

        <div className="featured-grid">
          <div className="featured-block">
            <h3 className="block-title">The Challenge</h3>
            <p className="muted">{featured.challenge}</p>
          </div>

          <div className="featured-block">
            <h3 className="block-title">The Implementation</h3>
            <ul className="featured-list">
              {featured.implementation.map(i => <li key={i}>{i}</li>)}
            </ul>
          </div>

          <div className="featured-block">
            <h3 className="block-title">Engineering Considerations</h3>
            <ul className="featured-list">
              {featured.considerations.map(i => <li key={i}>{i}</li>)}
            </ul>
          </div>
        </div>

        <div className="featured-actions">
          <a href={featured.repo} className="btn btn-ghost">View Repository ↗</a>
          <a href={featured.caseStudy} className="btn btn-ghost">Explore Architecture ↗</a>
        </div>
      </section>

      {/* ===== ARCHITECTURE ===== */}
      <section id="architecture" className="architecture">
        <p className="label">// HOW I BUILD SYSTEMS</p>
        <h2 className="h2" style={{ marginBottom: 40 }}>Three patterns<br />I use often.</h2>
        <div className="arch-grid">
          {architecture.map(a => (
            <div key={a.title} className="arch-card">
              <h3 className="arch-title">{a.title}</h3>
              <div className="arch-diagram">
                {a.diagram.map((step, i) => (
                  <div key={step} className="arch-step">
                    <span>{step}</span>
                    {i < a.diagram.length - 1 && <span className="arch-arrow">↓</span>}
                  </div>
                ))}
              </div>
              <p className="arch-why muted">{a.why}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== INFRASTRUCTURE ===== */}
      <section id="infra" className="infra">
        <p className="label">// INFRASTRUCTURE I BUILD & OPERATE</p>
        <h2 className="h2" style={{ marginBottom: 40 }}>Beyond getting<br />apps running.</h2>
        <div className="infra-grid">
          {infra.map(i => (
            <div key={i.title} className="infra-card">
              <h3 className="infra-title">{i.title}</h3>
              <p className="infra-desc">{i.desc}</p>
              <span className="infra-tech">{i.tech}</span>
            </div>
          ))}
        </div>
        <p className="muted infra-note">
          My DevOps work extends beyond getting applications running. I focus on
          repeatable deployments, operational visibility, recoverability, and
          reducing the manual effort required to maintain production systems.
        </p>
      </section>

      {/* ===== PRINCIPLES ===== */}
      <section id="principles" className="principles">
        <p className="label">// HOW I APPROACH ENGINEERING</p>
        <h2 className="h2" style={{ marginBottom: 40 }}>Principles,<br />not slogans.</h2>
        <div className="principles-grid">
          {principles.map(p => (
            <div key={p.title} className="principle-card">
              <h3 className="principle-title">{p.title}</h3>
              <p className="muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== STACK ===== */}
      <section id="stack" className="stack">
        <p className="label">// TOOLS & TECHNOLOGIES</p>
        <h2 className="h2" style={{ marginBottom: 40 }}>The stack I<br />actually use.</h2>
        <div className="skill-groups">
          {skillGroups.map(group => (
            <div className="skill-group" key={group.title}>
              <h3 className="skill-group-title">{group.title}</h3>
              <div className="stack-grid">
                {group.skills.map(skill => (
                  <div className="stack-cell" key={skill}>{skill}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== EDUCATION + CERTIFICATIONS ===== */}
      <section id="education" className="education">
        <p className="label">// EDUCATION & CERTIFICATIONS</p>
        <div className="edu-row">
          <div>
            <h3 className="exp-role">BSc Applied Computer Science</h3>
            <span className="exp-company">Daystar University · Kenya</span>
          </div>
          <span className="exp-period">Alumni</span>
        </div>

        <div className="cert-grid">
          {certifications.map(c => (
            <div key={c.name} className="cert-card">
              <h4 className="cert-name">{c.name}</h4>
              <span className="cert-meta">{c.issuer} · {c.year}</span>
              <p className="cert-desc muted">{c.description}</p>
              {c.href && c.href !== '#' && (
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cert-link"
                >
                  View credential ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== CONTACT ===== */}
      <footer id="contact" className="contact">
        <div>
          <p className="label">// GET IN TOUCH</p>
          <h2 className="h2" style={{ marginBottom: 16 }}>
            Have a backend or<br />infrastructure challenge?
          </h2>
          <p className="muted" style={{ marginBottom: 16, maxWidth: 380 }}>
            Backend Engineering · DevOps · Platform Engineering
          </p>
          <a href="mailto:princeben9312@gmail.com" className="contact-email">
            princeben9312@gmail.com
          </a>
        </div>
        <div className="contact-right">
          <div className="socials">
            {socials.map(s => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={s.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                className="social-link"
              >
                {s.label} ↗
              </a>
            ))}
          </div>
          <a
            href="/Prince-Benedict-Wachira-CV.pdf"
            className="btn btn-ghost"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download CV ↓
          </a>
          <span className="muted" style={{ fontSize: 11 }}>
            © 2026 Prince Benedict Wachira
          </span>
        </div>
      </footer>
    </div>
  );
}