import { useState } from 'react';
import { Link } from 'react-router-dom';
import style from './index.module.css';
import SiteNav from '../../components/SiteNav';

// ============================================================
// DATA
// ============================================================

const channels = [
  {
    id: 'email',
    label: 'Email',
    handle: 'prince@ordochao.tech',
    href: 'mailto:prince@ordochao.tech',
    primary: true,
    responseTime: 'Usually within 1 business day',
    why: 'Best for anything that needs a paper trail — projects, contracts, technical questions, anything you might want to reference later.',
  },
  {
    id: 'github',
    label: 'GitHub',
    handle: '@ordochao',
    href: 'https://github.com/ordochao',
    responseTime: 'Issues and PRs usually within 2–3 days',
    why: 'Best for code-level discussion. If you are filing an issue on a repo, that is the right place — it keeps the conversation attached to the code.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: 'Prince Benedict Wachira',
    href: 'https://www.linkedin.com/in/ordo-chao',
    responseTime: 'Usually within 2 business days',
    why: 'Best for professional introductions, recruiter conversations, and anything where you need my resume attached.',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@ordo_cha0',
    href: 'https://www.instagram.com/ordo_cha0',
    responseTime: 'Casual — I check it a few times a week',
    why: 'Not the right channel for work. If you found me here and want to talk about a project, email is faster.',
  },
    {
    id: 'twitter',
    label: 'Twitter',
    handle: '@ordo_cha0',
    href: 'https://twitter.com/ordo_cha0',
    responseTime: 'Casual — I check it a few times a week',
    why: 'Not the right channel for work. If you found me here and want to talk about a project, email is faster.',
  },
];

const categories = [
{
  title: 'Frontend engineering',
  detail: 'React interfaces that talk to a real backend — dashboards, internal tools, and this site. Component systems, CSS Modules, Vite builds, and the accessibility and performance work that keeps a UI usable at scale.',
  ideal: 'You have a backend (or an API) and need a working interface on top of it that someone can actually use.',
},
  {
    title: 'Backend engineering',
    detail: 'A service that needs to be built, reviewed, or debugged. Go, Node.js, PostgreSQL, distributed systems, message queues.',
    ideal: 'You already have a system and want help with the backend layer.',
  },
  {
    title: 'DevOps & platform',
    detail: 'Kubernetes, GitOps, CI/CD, secrets management, backup and recovery. Whether you are starting from scratch or trying to make an existing setup recoverable.',
    ideal: 'You are running (or planning) infrastructure and want it to stop being a fire alarm.',
  },
  {
    title: 'Mobile',
    detail: 'React Native or Flutter apps that need to talk to a real backend. Cross-platform, offline-first, or connecting to an existing API.',
    ideal: 'You have a backend (or need one) and want an app that uses it.',
  },
  {
    title: 'Technical writing',
    detail: 'Deployment guides, runbooks, incident reports, API documentation. The kind of writing that saves the next person an hour.',
    ideal: 'You have a system that works but is undocumented, and the docs are blocking the next hire.',
  },
];

const goodFit = [
  'You have a specific technical problem and want to talk through it',
  'You have a project that needs a backend or infrastructure layer',
  'You want a second opinion on an architecture decision',
  'You are hiring for a frontend, backend or DevOps role',
];

const notAFit = [
  'You want something done in under a week — the work is careful, not fast',
];

const faq = [
  {
    q: 'How quickly do you respond?',
    a: 'Usually within 1 business day for email. GitHub issues and PRs take 2–3 days. If you need a faster turnaround, say so in the first message — I can often make time for something urgent.',
  },
  {
    q: 'Are you available for freelance work?',
    a: 'Depends on the project. Small technical consultations and short engagements are usually possible. Large multi-month projects depend on current capacity — ask, but be patient if the answer is no.',
  },
  {
    q: 'Do you do code reviews?',
    a: 'Yes. Backend services, Kubernetes manifests, CI/CD pipelines. Reviews are usually a few hours of work, occasionally a multi-day engagement if the codebase is large.',
  },
  {
    q: 'Are you looking for a full-time role?',
    a: 'I am currently unemployed.The best conversations are about the work, not the title.',
  },
  {
    q: 'Will you build my app idea for free?',
    a: 'No. The work is how I earn a living. If the idea is genuinely interesting and you have a budget — even a small one — I am happy to talk. Equity-only offers are rarely a good deal for either side.',
  },
  {
    q: 'Can you jump on a call first?',
    a: 'Usually email first. A short introductory call after we have established context saves time for both of us. If the topic is urgent or complex, mention it and we can jump straight to a call.',
  },
];

// ============================================================
// PAGE
// ============================================================

export default function ContactPage() {
  return (
    <div className={style.page}>

      <SiteNav variant="devops" />


      {/* ===== HERO ===== */}
      <section className={style.hero}>
        <p className={style.label}>[ CONTACT / GET IN TOUCH ]</p>
        <h1 className={style.title}>
          LET'S TALK<br />
          <span className={style.titleMuted}>SYSTEMS</span>
        </h1>
        <p className={style.sub}>
          The inbox is open. Here is what I respond to, what I do not, and the
          honest answer to the questions people actually ask before reaching
          out. If your thing is in the first column, send a message. If it is
          in the second, save us both the time.
        </p>
        <div className={style.meta}>
          <span>Email within 1 day</span>
          <span>Nairobi · KE · UTC+3</span>
          <span>Remote-friendly</span>
          <span>No lead-gen</span>
        </div>
      </section>

      {/* ===== PRIMARY CHANNEL ===== */}
      <section className={style.section}>
        <p className={style.label}>// PRIMARY CHANNEL</p>
        <h2 className={style.h2}>Start here.</h2>

        <a href="mailto:prince@ordochao.tech" className={style.primaryCard}>
          <div className={style.primaryLeft}>
            <span className={style.primaryLabel}>EMAIL</span>
            <span className={style.primaryValue}>prince@ordochao.tech</span>
          </div>
          <div className={style.primaryRight}>
            <span className={style.primaryArrow}>→</span>
          </div>
        </a>

        <p className={style.primaryNote}>
          If you are not sure which channel to use, use this one. Email is
          where anything important should go — project discussions, technical
          questions, anything that might need to be referenced later. If it
          is a code-level discussion on an existing repo, GitHub is faster.
        </p>
      </section>

      {/* ===== OTHER CHANNELS ===== */}
      <section className={style.section}>
        <p className={style.label}>// OTHER CHANNELS</p>
        <h2 className={style.h2}>Where else to find me.</h2>
        <p className={style.lede}>
          Each channel has a purpose. Using the right one gets a faster,
          better answer.
        </p>

        <div className={style.channelGrid}>
          {channels.map(c => (
            <a
              key={c.id}
              href={c.href}
              target={c.href.startsWith('mailto:') ? undefined : '_blank'}
              rel={c.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
              className={style.channelCard}
            >
              <div className={style.channelHead}>
                <span className={style.channelLabel}>{c.label}</span>
                {c.primary && <span className={style.channelBadge}>Primary</span>}
              </div>
              <span className={style.channelHandle}>{c.handle}</span>
              <p className={style.channelWhy}>{c.why}</p>
              <div className={style.channelFoot}>
                <span className={style.channelMeta}>Response: {c.responseTime}</span>
                <span className={style.channelArrow}>↗</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ===== WHAT I HELP WITH ===== */}
      <section className={style.section}>
        <p className={style.label}>// WHAT I HELP WITH</p>
        <h2 className={style.h2}>The kind of work I take.</h2>
        <p className={style.lede}>
          If your project fits one of these, we will have a productive
          conversation. If it does not, that is fine too — better to know
          early.
        </p>

        <div className={style.categoryGrid}>
          {categories.map(c => (
            <div key={c.title} className={style.categoryCard}>
              <h3 className={style.categoryTitle}>{c.title}</h3>
              <p className={style.categoryDetail}>{c.detail}</p>
              <p className={style.categoryIdeal}>
                <span className={style.categoryIdealMark}>Ideal if:</span> {c.ideal}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== GOOD FIT / NOT A FIT ===== */}
      <section className={style.section}>
        <p className={style.label}>// FIT CHECK</p>
        <h2 className={style.h2}>Who this is for.<br />Who this is not for.</h2>

        <div className={style.fitGrid}>
          <div className={style.fitColumn}>
            <p className={style.fitLabel}>
              <span className={style.fitMarkGood}>+</span> Good fit
            </p>
            <ul className={style.fitList}>
              {goodFit.map(g => <li key={g}>{g}</li>)}
            </ul>
          </div>

          <div className={style.fitColumn}>
            <p className={style.fitLabel}>
              <span className={style.fitMarkBad}>−</span> Not a fit
            </p>
            <ul className={style.fitList}>
              {notAFit.map(n => <li key={n}>{n}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className={style.section}>
        <p className={style.label}>// BEFORE YOU ASK</p>
        <h2 className={style.h2}>The questions I get.</h2>
        <p className={style.lede}>
          If your question is here, you already have the answer. If it is
          not, send it — but be specific, and I will do the same.
        </p>

        <div className={style.faqList}>
          {faq.map(f => (
            <FAQItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ===== CLOSING ===== */}
      <section className={`${style.section} ${style.sectionLast}`}>
        <p className={style.label}>// END OF PAGE</p>
        <h2 className={style.h2}>If it is not on this page,<br />send a message anyway.</h2>
        <p className={style.lede}>
          The worst that happens is I say no. The best that happens is we
          build something that lasts longer than the current framework
          release cycle.
        </p>

        <div className={style.actions}>
          <a href="mailto:prince@ordochao.tech" className={style.btn}>
            prince@ordochao.tech →
          </a>
          <Link to="/about" className={`${style.btn} ${style.btnGhost}`}>
            Read about me first →
          </Link>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// FAQ ITEM
// ============================================================

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${style.faqItem} ${open ? style.faqItemOpen : ''}`}>
      <button
        type="button"
        className={style.faqQuestion}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className={style.faqQ}>{q}</span>
        <span className={style.faqToggle}>{open ? '−' : '+'}</span>
      </button>
      <div className={`${style.faqAnswerWrap} ${open ? style.faqAnswerWrapOpen : ''}`}>
        <div className={style.faqAnswerInner}>
          <p className={style.faqAnswer}>{a}</p>
        </div>
      </div>
    </div>
  );
}