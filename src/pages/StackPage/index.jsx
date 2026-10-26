import { Link } from 'react-router-dom';
import style from './index.module.css';
import SiteNav from '../../components/SiteNav';

// ============================================================
// DATA
// ============================================================

const layers = [
  {
    id: 'languages',
    code: '01',
    title: 'Languages',
    subtitle: 'What I write in, day to day.',
    philosophy: 'I do not chase languages. I pick the one that fits the problem and the team that maintains it. Today that is mostly Go and JavaScript, with Python and Dart when the context calls for them.',
    tools: [
      { name: 'Go', level: 'primary', why: 'Backend services, CLI tools, anything that needs to be a single binary. The place I go first for new server-side work.' },
      { name: 'JavaScript / TypeScript', level: 'primary', why: 'Node.js services, React frontends, React Native apps. The workhorse for anything in the browser or on a phone.' },
      { name: 'Python', level: 'secondary', why: 'Scripting, automation, and quick data work. Used when the task is to read a file or hit an API, not to build a service.' },
      { name: 'SQL', level: 'primary', why: 'Postgres queries, migrations, and the occasional EXPLAIN ANALYZE. Non-optional for backend work.' },
      { name: 'Dart', level: 'secondary', why: 'Flutter apps, when the mobile context needs a single-language stack from UI to logic.' },
      { name: 'Bash', level: 'secondary', why: 'Glue scripts, entrypoints, and the parts of CI that are not worth a full script file.' },
    ],
  },
  {
    id: 'backend',
    code: '02',
    title: 'Backend',
    subtitle: 'The services that other services depend on.',
    philosophy: 'A good backend is boring. REST or gRPC, a schema that does not surprise, idempotent handlers, and honest health checks. Interesting backends tend to be in the incident log.',
    tools: [
      { name: 'Node.js', level: 'primary', why: 'The default for REST APIs. Express for simple services, Fastify when the request volume justifies it.' },
      { name: 'Go', level: 'primary', why: 'Where the binary matters — CLIs, workers, and services that need to start in under a second.' },
      { name: 'Express', level: 'primary', why: 'Minimal, readable, and every Node developer already knows it. Chosen for clarity, not features.' },
      { name: 'PostgreSQL', level: 'primary', why: 'Every relational workload. JSONB for the "I need NoSQL" moments, real migrations for everything else.' },
      { name: 'Redis', level: 'primary', why: 'Sessions, rate-limit counters, BullMQ queues. AOF on, because a queue that loses jobs is not a queue.' },
      { name: 'MongoDB', level: 'secondary', why: 'Used when the document model genuinely fits. Not used as a default because Postgres JSONB usually wins.' },
      { name: 'RabbitMQ', level: 'primary', why: 'Async work that must survive the API responding. Producers and consumers decoupled at the service boundary.' },
      { name: 'BullMQ', level: 'secondary', why: 'Node-native queue for smaller jobs. Redis-backed, so it inherits the same AOF durability guarantees.' },
    ],
  },
  {
    id: 'frontend',
    code: '03',
    title: 'Frontend',
    subtitle: 'What the user actually touches.',
    philosophy: 'Frontend is not my primary craft, but I refuse to ship something I do not understand. I build with React because it is what I know well enough to debug at 2 AM, and I keep the tooling minimal because every extra dependency is one more thing to break.',
    tools: [
      { name: 'React', level: 'primary', why: 'The framework for both this site and most of the internal tools I have built. Component model scales from a single page to a system.' },
      { name: 'Vite', level: 'primary', why: 'Dev server, bundler, build tool. Fast enough that the difference from the previous toolchain is measurable.' },
      { name: 'React Native', level: 'primary', why: 'Mobile apps that share backend services with the web. One team can maintain the API and the app that talks to it.' },
      { name: 'Flutter', level: 'secondary', why: 'Used when the mobile project needs a single-language stack (Dart) from UI to logic. Not the default.' },
      { name: 'CSS Modules', level: 'primary', why: 'Scoped styles without a runtime. Every page on this site uses them, and no style has leaked between pages yet.' },
      { name: 'Tailwind CSS', level: 'occasional', why: 'Used when a project needs speed over craft. Not used on this site, because a design system of 12 components does not need a utility library.' },
    ],
  },
  {
    id: 'mobile',
    code: '04',
    title: 'Mobile',
    subtitle: 'Apps that ship to real devices.',
    philosophy: 'Mobile is not "web on a phone." The constraints are different — storage is limited, network is unreliable, app store review is a gate, and the device is the runtime. I use React Native when the team is JavaScript-native and Flutter when the project needs a single-language stack from UI to logic.',
    tools: [
      { name: 'React Native', level: 'primary', why: 'The default for mobile. Shares backend services and business logic with the web app, so one team can maintain both. React Native CLI used for native modules, Expo considered when the project fits its constraints.' },
      { name: 'React Native CLI', level: 'primary', why: 'Full native access — Android Studio, Xcode, custom native modules. The right choice when the app needs anything Expo cannot ship in a managed workflow.' },
      { name: 'Expo', level: 'secondary', why: 'Faster iteration and OTA updates, at the cost of some native flexibility. Used for prototypes and apps that do not need custom native code.' },
      { name: 'Flutter', level: 'primary', why: 'Single-language stack — Dart from UI to logic. Chosen when the project needs consistent rendering across iOS and Android, or when the team is already Dart-native.' },
      { name: 'Dart', level: 'secondary', why: 'The language Flutter is built on. Used only inside Flutter projects, not as a general-purpose language elsewhere in the stack.' },
      { name: 'Android Studio', level: 'secondary', why: 'Native toolchain for React Native CLI and Flutter Android builds. Handles emulators, signing, and the parts of the release pipeline that cannot be scripted away.' },
      { name: 'Fastlane', level: 'secondary', why: 'Release automation for mobile — screenshots, signing, store submission. Mobile releases are still manual for the parts that matter, but the repetitive steps are scripted.' },
      { name: 'Firebase Cloud Messaging', level: 'secondary', why: 'Push notifications, which neither React Native nor Flutter ships natively. One integration covers both platforms.' },
      { name: 'Mobile keychain / keystore', level: 'primary', why: 'Where auth tokens live on the device. Not in AsyncStorage, not in a .env file. The platform\'s secure storage is the only place a refresh token belongs.' },
    ],
  },
  {
    id: 'devops',
    code: '05',
    title: 'DevOps & Infrastructure',
    subtitle: 'What I actually spend most of my time on.',
    philosophy: 'The infrastructure work is not visible until it fails. The goal is a system where failure is expected, detected, and recovered — not prevented by hoping nothing breaks.',
    tools: [
      { name: 'Kubernetes (K3s)', level: 'primary', why: 'The container orchestrator for everything on this cluster. K3s specifically because a full managed control plane is not needed at this scale.' },
      { name: 'Docker', level: 'primary', why: 'The build unit for every service. Multi-stage builds to keep images small, reproducible, and free of build tools at runtime.' },
      { name: 'Argo CD', level: 'primary', why: 'The GitOps controller. Git is the only writer to the cluster — kubectl apply is a debugging tool, not a deployment strategy.' },
      { name: 'Helm', level: 'primary', why: 'The packaging format for third-party tools. Charts are rendered by Argo CD, not installed with helm install.' },
      { name: 'Traefik', level: 'primary', why: 'Ingress controller. TLS termination, hostname routing, and the rate-limit Middleware that stops a single client from drowning the backend.' },
      { name: 'cert-manager', level: 'primary', why: 'Automated TLS via Let\'s Encrypt. Every Ingress on this cluster gets a valid certificate without anyone touching a CSR.' },
      { name: 'GitHub Actions', level: 'primary', why: 'CI pipeline — build, scan for secrets, update the GitOps repo. The one place where an app change turns into a cluster change.' },
      { name: 'Argo Workflows', level: 'occasional', why: 'For batch jobs that are not worth a dedicated controller. Used for the smart-restart workflow that monitors and restarts degraded deployments.' },
    ],
  },
  {
    id: 'secrets',
    code: '06',
    title: 'Secrets & Config',
    subtitle: 'The layer that must never be in Git.',
    philosophy: 'A secret in Git is a secret already leaked. Every credential in this cluster lives in Vault, syncs to Kubernetes via External Secrets Operator, and is rotated without touching a manifest.',
    tools: [
      { name: 'HashiCorp Vault', level: 'primary', why: 'The only place a password, token, or key is written. Encrypted at rest, audited on read, rotated on schedule.' },
      { name: 'External Secrets Operator', level: 'primary', why: 'The bridge between Vault and Kubernetes Secrets. 1-minute sync interval, so a rotated secret reaches the cluster without a redeploy.' },
      { name: 'SOPS', level: 'occasional', why: 'Used for the rare case where a secret must be committed to Git (e.g. a sealed chart value). Not used for application secrets.' },
      { name: 'Sealed Secrets', level: 'avoided', why: 'Chosen against for this cluster. The pattern of "encrypted, committed, unsealed in-cluster" duplicates what Vault already does, with a worse audit trail.' },
    ],
  },
  {
    id: 'observability',
    code: '07',
    title: 'Observability',
    subtitle: 'How I know the system is healthy.',
    philosophy: 'Metrics, logs, and external checks answer three different questions. Prometheus says whether a service is healthy from the inside. Grafana turns that data into a graph I can read. Uptime Kuma says whether the outside world can actually reach it.',
    tools: [
      { name: 'Prometheus', level: 'primary', why: 'Metrics storage. Scrapes from inside the cluster, with retention sized to the volume of series it can actually hold.' },
      { name: 'Grafana', level: 'primary', why: 'Dashboards on top of Prometheus, Loki, and Postgres. Declared in Git, so rebuilding the cluster also rebuilds the dashboards.' },
      { name: 'Loki', level: 'primary', why: 'Centralized logs. Label-based indexing instead of full-text, which is the trade-off that makes Loki affordable to run.' },
      { name: 'Uptime Kuma', level: 'primary', why: 'External reachability and certificate expiry. The one tool in the stack that sees the cluster the way a user does.' },
      { name: 'Alertmanager', level: 'primary', why: 'Alert routing. Prometheus fires the rule, Alertmanager decides who to wake up and how.' },
      { name: 'Sentry', level: 'occasional', why: 'Frontend error tracking when a project needs stack traces from real users. Not used on this static site.' },
    ],
  },
  {
    id: 'storage',
    code: '08',
    title: 'Storage & Data',
    subtitle: 'Where state lives and how it survives.',
    philosophy: 'Every stateful app on this cluster has an answer to "what happens if the node dies?" Some use Longhorn replication, some use local-path because the pods cannot leave the node anyway. The important thing is that the answer is explicit, not accidental.',
    tools: [
      { name: 'Longhorn', level: 'primary', why: 'Replicated block storage for stateful workloads. Snapshots and S3 backups built into the PVC annotations.' },
      { name: 'Velero', level: 'primary', why: 'Cluster-level backup and restore. Fills the gap Longhorn does not cover — resources and API objects, not just volume data.' },
      { name: 'MinIO', level: 'primary', why: 'S3-compatible object storage. Backup target for both Velero and Longhorn, and the storage layer for any app that needs to write files.' },
      { name: 'local-path', level: 'secondary', why: 'Used when the pod cannot leave the node anyway (host-port mail services, the Go app with its .env mount). Simpler than Longhorn when replication would be wasted.' },
      { name: 'AWS S3', level: 'secondary', why: 'Used when the backup target must outlive the cluster. MinIO is the default, S3 is the escape hatch.' },
    ],
  },
  {
    id: 'other',
    code: '09',
    title: 'Adjacent Tools',
    subtitle: 'Used when the context requires it.',
    philosophy: 'These are not part of the primary stack, but they appear often enough that I should be able to defend them. Each one exists because a specific problem required it, not because it was on a list.',
    tools: [
      { name: 'Blacksmith', level: 'secondary', why: 'Docker build acceleration with caching that actually works. Replaced the default GitHub-hosted runner for the build step.' },
      { name: 'Mailu', level: 'secondary', why: 'Self-hosted mail stack — SMTP, IMAP, webmail, spam filtering. Runs on the edge nodes with host-network ports.' },
      { name: 'WireGuard', level: 'secondary', why: 'Flannel backend for encrypted pod-to-pod traffic. K3s default networking is unencrypted VXLAN; WireGuard closes that gap.' },
      { name: 'MATLAB', level: 'occasional', why: 'Image processing and academic work. Not part of the runtime stack, but a tool I can reach for when the problem fits.' },
      { name: 'Gitleaks', level: 'secondary', why: 'Secret scanner in CI. Runs on every push and on a daily schedule, because a secret committed and reverted still exists in history.' },
    ],
  },
];

// ============================================================
// COMPONENTS
// ============================================================

function LevelBadge({ level }) {
  const labels = {
    primary: 'PRIMARY',
    secondary: 'SECONDARY',
    occasional: 'OCCASIONAL',
    avoided: 'AVOIDED',
  };
  return (
    <span className={`${style.level} ${style[`level${level.charAt(0).toUpperCase()}${level.slice(1)}`]}`}>
      {labels[level] || level.toUpperCase()}
    </span>
  );
}

function LayerSection({ layer }) {
  return (
    <section className={style.section}>
      <div className={style.layerHeader}>
        <span className={style.layerCode}>{layer.code}</span>
        <div className={style.layerHeaderBody}>
          <h2 className={style.h2}>{layer.title}</h2>
          <p className={style.layerSubtitle}>{layer.subtitle}</p>
        </div>
      </div>
      <p className={style.layerPhilosophy}>{layer.philosophy}</p>

      <div className={style.toolGrid}>
        {layer.tools.map(tool => (
          <article key={tool.name} className={style.toolCard}>
            <div className={style.toolHead}>
              <h3 className={style.toolName}>{tool.name}</h3>
              <LevelBadge level={tool.level} />
            </div>
            <p className={style.toolWhy}>{tool.why}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function StackPage() {
  return (
    <div className={style.page}>

      <SiteNav variant="devops" />



      {/* ===== HERO ===== */}
      <section className={style.hero}>
        <p className={style.label}>[ STACK / THE TOOLS I ACTUALLY USE ]</p>
        <h1 className={style.title}>
          THE<br />
          <span className={style.titleMuted}>WORKBENCH</span>
        </h1>
        <p className={style.sub}>
          Not a skills list. Not a logo wall. Nine layers of a system — each
          tool here is chosen because it does something specific, and there is
          an honest answer for why it is there. Some are primary. Some are
          used only when the context requires them. A few were deliberately
          ruled out.
        </p>
        <div className={style.meta}>
          <span>9 layers</span>
          <span>54 tools</span>
          <span>3 explicitly avoided</span>
          <span>Ongoing curation</span>
        </div>
      </section>

      {/* ===== LEGEND ===== */}
      <section className={style.legendSection}>
        <p className={style.label}>// HOW TO READ THIS PAGE</p>
        <div className={style.legend}>
          <div className={style.legendItem}>
            <LevelBadge level="primary" />
            <span className={style.legendText}>Touched most days. Part of the default stack.</span>
          </div>
          <div className={style.legendItem}>
            <LevelBadge level="secondary" />
            <span className={style.legendText}>Reached for when the context fits. Not the default.</span>
          </div>
          <div className={style.legendItem}>
            <LevelBadge level="occasional" />
            <span className={style.legendText}>Used in specific projects, not the ongoing system.</span>
          </div>
          <div className={style.legendItem}>
            <LevelBadge level="avoided" />
            <span className={style.legendText}>Considered and not chosen. The reason is listed.</span>
          </div>
        </div>
      </section>

      {/* ===== LAYERS ===== */}
      {layers.map(layer => (
        <LayerSection key={layer.id} layer={layer} />
      ))}

      {/* ===== CLOSING ===== */}
      <section className={`${style.section} ${style.sectionLast}`}>
        <p className={style.label}>// END OF STACK</p>
        <h2 className={style.h2}>The list is short on purpose.</h2>
        <p className={style.lede}>
          A stack is defined as much by what is not in it as by what is. Every
          tool on this page exists because a specific problem required it — and
          every tool that was ruled out was ruled out for a reason. If you
          want the reasoning in more detail, the deployment guides go deeper
          into each layer.
        </p>
        <div className={style.actions}>
          <Link to="/deployment-guides" className={style.btn}>
            Deployment guides →
          </Link>
          <Link to="/projects" className={`${style.btn} ${style.btnGhost}`}>
            See it in projects →
          </Link>
        </div>
      </section>
    </div>
  );
}