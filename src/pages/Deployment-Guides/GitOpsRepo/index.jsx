import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'One repo describes everything about the cluster — not just the apps',
  'Top-level split: Documentation, Infra, Reports, Services, README',
  'Every directory has one job — no mixing between apps and platform',
  'Services deploy independently; Infra holds the shared services',
  'Reports holds the post-incident write-up for every production incident',
];

const whyPoints = [
  {
    title: 'One repo, one history',
    detail: 'Every cluster change is a commit in the same repo. To understand why a service is deployed a certain way, run git log on its directory. To see what changed on Tuesday, run git log --since. There is no "which repo was that change in?" — the history is unified.',
  },
  {
    title: 'Services and Infra are separate concerns',
    detail: 'A service change (deploy a new version of the Node app) and an infra change (upgrade RabbitMQ) have different risk profiles. Keeping them in separate directories means a PR review for one does not accidentally touch the other. It also means ArgoCD Applications are scoped per service, not per app-type.',
  },
  {
    title: 'Documentation lives next to the manifests',
    detail: 'Architecture decisions, runbooks, and onboarding guides sit in Documentation/ — inside the same repo as the manifests they describe. When someone asks "how does the backup work?", the answer is a link to Documentation/, not a wiki that nobody keeps updated.',
  },
  {
    title: 'Reports make incidents learnable',
    detail: 'Every production incident gets a markdown file in Reports/. The Mailu-Redis AOF corruption report is the reference for what "post-incident write-up" looks like — root cause, remediation, prevention. Over time this becomes the institutional memory of the cluster.',
  },
];

const structureSections = [
  {
    title: 'Documentation/',
    detail: 'Runbooks, architecture decisions, onboarding guides. Plain markdown. No manifests — this directory exists so that a future operator (or future you) can understand why the repo is organized the way it is.',
  },
  {
    title: 'Infra/',
    detail: 'Platform services the cluster depends on — not the apps. Grafana, Mailu, RabbitMQ, Redis, MinIO, Uptime Kuma, Vault. Each subdirectory contains the ArgoCD Application and supporting manifests for that one service. Adding a new infra service means adding a directory here, not editing an existing one.',
  },
  {
    title: 'Reports/',
    detail: 'Post-incident write-ups. Every production incident gets one file named YYYY-MM-DD-<short-name>.md. The file describes what happened, the root cause, the remediation, and the prevention measures. The Reports directory is the audit trail — it is not optional.',
  },
  {
    title: 'Services/',
    detail: 'One directory per deployable application. Each owns its own manifests. Frontend-Service, Backend-Service, Website — the three deployable units. Adding a new app means adding a directory here and a new ArgoCD Application that points at it.',
  },
  {
    title: 'README.md',
    detail: 'The entry point. It explains what this repo is, how to read it, and the three commands to deploy something. Anyone landing in the repo should be able to understand it from this file alone — the rest of the repo should only be opened when they need a specific thing.',
  },
];

const conventions = [
  {
    title: 'One directory per ArgoCD Application',
    detail: 'Each directory under Infra/ and Services/ maps to exactly one ArgoCD Application. That Application\'s source.path points at the directory. This means the repo structure and the ArgoCD structure are the same — there is no second layer of mapping to remember.',
  },
  {
    title: 'Manifests use placeholders, not real values',
    detail: 'Domain names use example.com, credentials use changeme-in-production, namespaces use myapp. Real values live in Vault, not in the manifests. A manifest that commits a real password is a bug — a reviewer should reject it on sight.',
  },
  {
    title: 'Every ArgoCD Application uses a pinned targetRevision',
    detail: 'Charts are pinned to a specific version, not a wildcard. A chart upgrade is a commit that changes the version string — visible in git log, reviewable, revertable. A wildcard targetRevision means the chart can deploy itself without a commit, which breaks the audit trail.',
  },
  {
    title: 'prune: false for stateful apps',
    detail: 'An ArgoCD Application with prune: true deletes resources when the manifest removes them. That is correct for stateless apps. For a mail server, a database, or an object store, it is catastrophic — an accidental edit could delete a PVC. Stateful applications keep prune: false.',
  },
  {
    title: 'Secrets never leave Vault',
    detail: 'No secret values appear anywhere in this repo — not in manifests, not in ConfigMaps, not in values files. The repo describes which secrets to read (ExternalSecret), never what the secrets are. If a secret leaks, the problem is not in this repo.',
  },
];

const gotchas = [
  {
    title: 'The repo is not just "GitOps" — it is the source of truth',
    detail: 'If something is not in this repo, it is not running in the cluster. If it is running in the cluster but not in this repo, ArgoCD will delete it on the next sync (if prune: true) or flag it as OutOfSync (if prune: false). The repo is not a mirror — it is the definition.',
  },
  {
    title: 'Reports/ is not optional',
    detail: 'The temptation is to skip Reports/ — "I fixed it, moving on." But the value of Reports/ is not for the incident you just fixed; it is for the next time. A post-incident write-up lets you detect patterns (three Redis incidents in two months means a Redis architecture problem, not three coincidences).',
  },
  {
    title: 'Services vs Infra is a real split',
    detail: 'The instinct is to put everything under Services/ because they are all "things that run." But Services/ is what users interact with; Infra/ is what Services/ depend on. A change to Services/Backend-Service is a product change; a change to Infra/RabbitMq is a platform change. The two have different review processes and different rollback procedures.',
  },
  {
    title: 'ArgoCD Application path must match the directory',
    detail: 'The ArgoCD Application for a service has source.path: Services/Backend-Service/prod (or similar). If the directory is renamed, the Application must be updated in the same commit. A mismatch between the path and the directory is a silent failure — ArgoCD shows the app as OutOfSync with no obvious cause.',
  },
  {
    title: 'No secrets, no exceptions',
    detail: 'There is no "temporary" secret committed to this repo. No "just for now" .env file. No "I\'ll remove it before merging." If a secret needs to be in this repo, it is time to move the secret to Vault. Gitleaks scans this repo on every push for exactly this reason.',
  },
  {
    title: 'The repo structure is a contract',
    detail: 'The conventions above are not stylistic — they are the contract that makes ArgoCD, GitHub Actions, and the operator understand the repo without reading every file. Changing the contract (renaming Services/ to Apps/, for example) requires updating every Application, every workflow, and every runbook that references it.',
  },
];

export default function DeployGitOpsRepoPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ PLATFORM / GITOPS REPO ]</p>
        <h1 className={style.title}>
          HOW THE<br />
          <span className={style.titleMuted}>REPO IS ORGANIZED</span>
        </h1>
        <p className={style.sub}>
          The Devopps repository is the source of truth for this cluster. Every
          service, every platform component, every incident write-up lives in
          the same Git history. Here is how the directories are organized, why
          they are split the way they are, and the conventions that keep it
          readable as it grows.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT IS</p>
        <h2 className={style.h2}>One repo, one history, one source of truth.</h2>

        <div className={style.checklist}>
          {stackPoints.map(p => (
            <div key={p} className={style.checkItem}>
              <span className={style.checkMark}>✓</span>
              <span className={style.checkText}>{p}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHY THIS STRUCTURE</p>
        <h2 className={style.h2}>Four things the repo is protecting.</h2>

        <div className={style.checklist}>
          {whyPoints.map(p => (
            <div key={p.title} className={style.checkItem}>
              <span className={style.checkMark}>›</span>
              <span className={style.checkText}>
                <strong style={{ color: '#f0f0f0' }}>{p.title}</strong>
                {' — '}
                {p.detail}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// DIRECTORY STRUCTURE</p>
        <h2 className={style.h2}>Five top-level directories.</h2>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Devopps/</h3>
              <span className={style.manifestFile}>tree</span>
            </div>
            <pre className={style.code}>
              <code>{`Devopps/
├── Documentation/          # Runbooks, architecture, onboarding
├── Infra/                  # Platform services
│   ├── Grafana/
│   ├── Mail/
│   ├── RabbitMq/
│   ├── Redis/
│   ├── Storage/            # MinIO
│   ├── UptimeKuma/
│   └── Vault/
├── Reports/                # Post-incident write-ups
│   └── Mailu-Redis-AOF-Corruption-Incident-Report-2026-10-10.md
├── Services/               # Deployable applications
│   ├── Frontend-Service/
│   ├── Backend-Service/
│   └── Website/
└── README.md`}</code>
            </pre>
          </article>
        </div>

        <h3 className={style.subhead}>What each directory does</h3>
        <div className={style.checklist}>
          {structureSections.map(s => (
            <div key={s.title} className={style.checkItem}>
              <span className={style.checkMark}>›</span>
              <span className={style.checkText}>
                <strong style={{ color: '#f0f0f0' }}>{s.title}</strong>
                {' — '}
                {s.detail}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// CONVENTIONS</p>
        <h2 className={style.h2}>The rules that keep it readable.</h2>
        <p className={style.lede}>
          The directory layout is only half the story. The other half is the
          conventions that every file in the repo follows — so that the
          structure stays meaningful as it grows.
        </p>

        <div className={style.manifests}>
          {conventions.map((c, i) => (
            <article key={c.title} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{c.title}</h3>
              </div>
              <p className={style.manifestWhy}>{c.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// GOTCHAS</p>
        <h2 className={style.h2}>The six things that will trip you up.</h2>

        <div className={style.gotchas}>
          {gotchas.map(g => (
            <div key={g.title} className={style.gotcha}>
              <span className={style.gotchaIcon}>!</span>
              <div>
                <h3 className={style.gotchaTitle}>{g.title}</h3>
                <p className={style.gotchaDetail}>{g.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DeploymentPrevNext />
    </div>
  );
}