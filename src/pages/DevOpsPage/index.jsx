import { useEffect, useState } from 'react';
import style from './index.module.css';
import { Link } from 'react-router-dom';
import SiteNav from '../../components/SiteNav';
import { DEPLOYMENT_ORDER } from '../../components/DeploymentNav';

// ============================================================
// DATA
// ============================================================

const guideDocs = {
  '/deployment-guides/vite': 'https://vite.dev/guide/',
  '/deployment-guides/node': 'https://nodejs.org/docs/latest/api/',
  '/deployment-guides/go': 'https://go.dev/doc/',
  '/deployment-guides/python': 'https://docs.djangoproject.com/en/stable/',
  '/deployment-guides/laravel': 'https://laravel.com/docs',
  '/deployment-guides/rabbitmq': 'https://www.rabbitmq.com/docs',
  '/deployment-guides/redis': 'https://redis.io/docs/latest/',
  '/deployment-guides/minio': 'https://min.io/docs/minio/kubernetes/upstream/',
  '/deployment-guides/mailu': 'https://mailu.io/master/',
  '/deployment-guides/helm': 'https://helm.sh/docs/',
  '/deployment-guides/argocd': 'https://argo-cd.readthedocs.io/',
  '/deployment-guides/github-actions': 'https://docs.github.com/en/actions',
  '/deployment-guides/grafana': 'https://grafana.com/docs/grafana/latest/',
  '/deployment-guides/vault': 'https://developer.hashicorp.com/vault/docs',
  '/deployment-guides/uptime-kuma': 'https://github.com/louislam/uptime-kuma/wiki',
  '/deployment-guides/longhorn': 'https://longhorn.io/docs/',
  '/deployment-guides/gitops-repo': 'https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/',
  '/deployment-guides/cluster-setup': 'https://docs.k3s.io/installation/requirements',
};

const pipelineSteps = [
  {
    id: '01',
    title: 'Code Push',
    subtitle: 'Developer → GitHub',
    detail: 'A developer pushes to main. That single push is the only human action in the whole pipeline.',
    icon: '⌘',
    actor: 'Developer',
    duration: '—',
  },
  {
    id: '02',
    title: 'CI Build',
    subtitle: 'GitHub Actions · Blacksmith',
    detail: 'Actions triggers on push. Blacksmith builder runs multi-stage Docker builds for backend and frontend in parallel, with build caching.',
    icon: '⚙',
    actor: 'CI Runner',
    duration: '~3 min',
  },
  {
    id: '03',
    title: 'Image Push',
    subtitle: 'GitHub Container Registry',
    detail: 'Images are tagged with both latest and the commit SHA, then pushed to GHCR. Every deploy is traceable back to a commit.',
    icon: '◈',
    actor: 'Registry',
    duration: '~30 s',
  },
  {
    id: '04',
    title: 'GitOps Commit',
    subtitle: 'Manifests updated in Devopps',
    detail: 'The pipeline writes the new SHA into the deployment manifests and commits to the GitOps repo. The cluster state is now described in Git.',
    icon: '✎',
    actor: 'Pipeline Bot',
    duration: '~10 s',
  },
  {
    id: '05',
    title: 'Argo Sync',
    subtitle: 'ArgoCD reconciles',
    detail: 'ArgoCD detects the new commit and applies it. If drift is detected later, Argo reverts to Git — Git is always the source of truth.',
    icon: '⟳',
    actor: 'ArgoCD',
    duration: '~45 s',
  },
  {
    id: '06',
    title: 'Rolling Deploy',
    subtitle: 'Zero-downtime rollout',
    detail: 'Kubernetes replaces pods one at a time (maxUnavailable: 0). Health probes must pass before traffic is sent. If they fail, the rollout stops.',
    icon: '▲',
    actor: 'Kubernetes',
    duration: '~1 min',
  },
];

const planes = [
  {
    code: 'CI',
    title: 'Continuous Integration',
    color: '#d4663a',
    items: [
      'GitHub Actions on every push to main',
      'Blacksmith-accelerated Docker builds',
      'Parallel backend + frontend builds',
      'Images tagged with commit SHA',
      'Pushed to private GHCR',
    ],
  },
  {
    code: 'CD',
    title: 'Continuous Delivery',
    color: '#f0f0f0',
    items: [
      'Manifests updated automatically in GitOps repo',
      'ArgoCD detects drift and syncs',
      'Self-heal reverts manual cluster changes',
      'Rollback is a Git revert',
      'Two Argo Apps: backend-service, frontend-service',
    ],
  },
  {
    code: 'SEC',
    title: 'Secrets & Config',
    color: '#888',
    items: [
      'HashiCorp Vault as the only secret store',
      'External Secrets Operator → K8s Secrets',
      '1-minute refresh interval',
      'Separate paths: Services/Backend/prod, Services/Frontend/prod',
      'Nothing sensitive ever lives in Git',
    ],
  },
  {
    code: 'OPS',
    title: 'Runtime & Recovery',
    color: '#666',
    items: [
      'Longhorn PVCs with daily backups to MinIO',
      'Velero for full-cluster snapshots',
      '30-day Velero retention · 7-day Longhorn retention',
      "Traefik ingress with Let's Encrypt TLS",
      'Two-node cluster: control-plane + worker',
    ],
  },
];

const tools = [
  {
  name: 'K3s + WireGuard',
  role: 'Cluster substrate',
  why: 'Every app, every controller, every backup target runs on a cluster that has to be built before anything else exists. K3s gives a lightweight, single-binary Kubernetes — no external etcd, no cloud dependency. WireGuard encrypts every pod-to-pod packet between nodes so a compromise on one host does not expose cross-node traffic.',
  replaces: 'Full Kubernetes install (kubeadm + etcd + CNI) · Unencrypted VXLAN pod networking · Cloud-managed control planes',
  config: '3 server nodes (control plane) · N worker nodes · flannel-backend=wireguard-native · SSD on control plane',
},
  {
  name: 'GitOps Repository',
  role: 'The source of truth',
  why: 'Every service, every platform component, every incident write-up lives in one repo. The structure is deliberate — Documentation, Infra, Reports, Services. The ArgoCD Applications point at directories in this repo, so the repo layout is the deployment layout. If something is not in this repo, it is not running in the cluster.',
  replaces: 'Scattered per-service repos · Wiki-based documentation · Ad-hoc kubectl apply',
  config: 'One repo · 5 top-level dirs · one directory per Argo Application · no secrets committed',
},
  {
    name: 'Helm',
    role: 'Kubernetes package manager',
    why: 'Every third-party tool in this cluster — Grafana, Vault, Longhorn, Mailu — ships as a Helm chart. Helm is the packaging format: templates, values, and versioned releases. It is not the deploy mechanism — ArgoCD renders the chart and applies the result, without ever running helm install against the cluster.',
    replaces: 'Hand-maintained manifest sets per tool · Version-pinned YAML copies · Custom install scripts',
    config: 'Charts rendered by ArgoCD · targetRevision pins chart version · values declared in GitOps repo',
  },
  {
    name: 'Argo CD',
    role: 'GitOps controller',
    why: 'ArgoCD is the only writer to the cluster. It watches Git and reconciles the cluster toward it — drift is reverted, rollback is a Git revert, and Helm charts are rendered without helm install. Every Application in this series is an ArgoCD resource, not a raw Kubernetes manifest.',
    replaces: 'Manual kubectl apply · Helm install in CI · Out-of-band cluster edits',
    config: 'Applications per service · selfHeal: true · prune: false for stateful apps · ServerSideApply',
  },
  {
    name: 'HashiCorp Vault',
    role: 'Secrets store',
    why: 'The only place a password, token, or key is ever written. Services read from Vault via External Secrets Operator on a 1-minute sync. If a repo is compromised, there is nothing to leak — the secrets were never there.',
    replaces: 'Kubernetes Secrets in Git · .env files · SOPS-encrypted values',
    config: 'Paths: Services/Backend/prod · Services/Frontend/prod',
  },
  {
    name: 'MinIO (S3-compatible)',
    role: 'Backup target',
    why: 'Both Velero and Longhorn write to the same MinIO cluster — a single S3-compatible endpoint I control. Being S3-compatible means I can point at AWS S3 or Backblaze without changing a single manifest.',
    replaces: 'Local disk backups · Provider-locked storage',
    config: 'Buckets: velero/ · longhorn-backups/',
  },
  {
    name: 'Blacksmith',
    role: 'Docker build runner',
    why: 'Blacksmith runs builds on optimized CI hardware with persistent build caching. Compared to the default ubuntu-latest runner, Docker layer reuse actually works, so a rebuild after a code change takes a fraction of the time — and multi-stage builds for frontend + backend can run in parallel.',
    replaces: 'Default GitHub-hosted runners · Self-hosted build VMs',
    config: 'runs-on: blacksmith-4vcpu-ubuntu-2404 · build-push-action',
  },
  {
    name: 'Longhorn',
    role: 'Persistent storage',
    why: 'Longhorn provides replicated block storage to the cluster with built-in snapshot and backup-to-S3 support. It runs exclusively on the worker node (worker, 194 GB) because the control plane stays lean and I never want volumes pinned to a node I might replace.',
    replaces: 'Local hostPath volumes · Single-node PVCs',
    config: '14 PVCs · daily-backups recurring job · 7-backup retention',
  },
  {
    name: 'Velero',
    role: 'Cluster backup',
    why: 'Longhorn backs up volume data; Velero backs up the cluster itself — every Deployment, Secret reference, Service, ConfigMap, and namespace. When rebuilding from scratch, Velero restores the shape of the cluster and Longhorn restores the data underneath it.',
    replaces: 'Hand-written YAML recovery docs · kubectl apply --from-backup',
    config: 'daily-backup-with-volumes (02:00) · daily-manifests-backup (03:00) · 30-day retention',
  },
  {
    name: 'RabbitMQ',
    role: 'Message broker',
    why: 'Async work and cross-service events go through RabbitMQ instead of synchronous HTTP. Producers publish, consumers process at their own pace, and nothing blocks on a slow downstream service. This is what makes the Node, Go, and Laravel backends able to run background jobs without a direct call chain.',
    replaces: 'Direct HTTP calls between services · Cron-driven polling · In-process background workers',
    config: 'StatefulSet · Longhorn PVC (1Gi) · Vault secrets · ClusterIP on 5672',
  },
  {
    name: 'Redis',
    role: 'Cache & queue backend',
    why: 'Redis holds the hot data that every backend needs at request time — sessions, rate-limit counters, BullMQ job state. With AOF enabled, a pod restart does not lose the queue. Without Redis, every replica would carry its own state and users would be logged out on load-balanced requests.',
    replaces: 'In-memory process state · Database-backed sessions · Cron polling for job status',
    config: 'ConfigMap-driven redis.conf · Longhorn PVC (5Gi) · AOF everysec · ClusterIP on 6379',
  },
  {
    name: 'Mailu',
    role: 'Self-hosted mail stack',
    why: 'Mailu bundles SMTP, IMAP, webmail, spam filtering, and an admin UI into one Helm chart. It runs on edge nodes with host-network ports because SMTP and IMAP do not work well behind L7 proxies. Deployed via a multi-source ArgoCD Application so the values live in Git and the chart version stays pinned.',
    replaces: 'Managed mail providers · Separate Postfix, Dovecot, SpamAssassin installs',
    config: 'Multi-source Argo Application · chart 2.7.1 · mailu-edge nodes · local-path storage',
  },
  {
    name: 'Grafana',
    role: 'Observability dashboards',
    why: 'Grafana is the read layer on top of Prometheus. Metrics alone do not help during an incident — the graph does. Dashboards are declared in Git (ArgoCD Application + Helm chart), so rebuilding the cluster also rebuilds the dashboards.',
    replaces: 'Raw PromQL in a terminal · Ad-hoc SSH sessions · Per-team monitoring tools',
    config: 'Argo Application (Helm) · monitoring namespace · 10Gi PVC · Ingress + TLS',
  },
  {
    name: 'Uptime Kuma',
    role: 'External reachability',
    why: 'Prometheus scrapes from inside the cluster; Uptime Kuma checks from outside, through DNS, TLS, and the ingress — exactly as a real user would. It is the difference between "the service is healthy" and "the world can actually reach it." It also monitors TLS certificate expiry per host.',
    replaces: 'External ping services · Manual certificate expiry tracking · Status page SaaS',
    config: 'Deployment + Recreate strategy · Longhorn PVC (3Gi) · fsGroup 1000 · Ingress + TLS',
  },
];

const repoTree = [
  {
    name: 'Documentation/',
    type: 'dir',
    note: 'Runbooks, architecture decisions, onboarding guides.',
    children: [],
  },
  {
    name: 'Infra/',
    type: 'dir',
    note: 'Platform services the cluster depends on — not the apps.',
    children: [
      { name: 'Grafana', type: 'dir', note: 'Dashboards & Prometheus data source configs.', children: [] },
      { name: 'Mail', type: 'dir', note: 'Mailu — self-hosted mail stack.', children: [] },
      { name: 'RabbitMq', type: 'dir', note: 'Message broker manifests.', children: [] },
      { name: 'Redis', type: 'dir', note: 'Cache / queue manifests.', children: [] },
      { name: 'Storage', type: 'dir', note: 'MinIO configuration & buckets.', children: [] },
      { name: 'UptimeKuma', type: 'dir', note: 'Uptime monitoring.', children: [] },
      { name: 'Vault', type: 'dir', note: 'Vault config, policies, External Secrets wiring.', children: [] },
    ],
  },
  {
    name: 'Reports/',
    type: 'dir',
    note: 'Post-incident write-ups. Every production incident gets one.',
    children: [
      {
        name: 'Mailu-Redis-AOF-Corruption-Incident-Report-2026-10-10.md',
        type: 'file',
        note: 'Redis AOF corruption incident — root cause, remediation, prevention.',
        children: [],
      },
    ],
  },
  {
    name: 'Services/',
    type: 'dir',
    note: 'One directory per deployable application. Each owns its own manifests.',
    children: [
      { name: 'Frontend-Service', type: 'dir', note: '', children: [] },
      { name: 'Backend-Service', type: 'dir', note: '', children: [] },
      { name: 'Website', type: 'dir', note: '', children: [] },
    ],
  },
  {
    name: 'README.md',
    type: 'file',
    note: 'Entry point — what this repo is, how to read it.',
    children: [],
  },
];

const infrastructure = [
  {
    layer: 'Edge',
    components: ['Traefik Ingress', "Let's Encrypt TLS"],
    note: 'All traffic terminates TLS here.',
  },
  {
    layer: 'App',
    components: ['backend-prod ns', 'frontend-prod ns'],
    note: 'Namespace-isolated. Backend and frontend share nothing except the API contract.',
  },
  {
    layer: 'Data',
    components: ['PostgreSQL 15', 'Longhorn PVC (5Gi)'],
    note: 'Pinned to worker. Backed up daily via Longhorn and CSI snapshots.',
  },
  {
    layer: 'Secrets',
    components: ['HashiCorp Vault', 'External Secrets Op'],
    note: 'Every pod reads secrets from mounted K8s secrets synced from Vault.',
  },
  {
    layer: 'Backup',
    components: ['Velero', 'Longhorn', 'MinIO S3'],
    note: 'Dual backup: cluster resources + volume data, both to the same MinIO bucket set.',
  },
];

const backupMatrix = [
  { system: 'Velero', scope: 'Cluster resources + CSI snapshots', schedule: '02:00 & 03:00 UTC', retention: '30 days', target: 'MinIO/AWS velero/' },
  { system: 'Longhorn', scope: '14 volume backups', schedule: '04:00 UTC', retention: '7 backups', target: 'MinIO/AWS longhorn-backups/' },
];

const stackNodes = [
  { id: 'kubernetes', name: 'server1', role: 'Control Plane', ip: 'ip-10.100.0.1', disk: '96 GB', usage: '78%', x: 28, y: 22 },
  { id: 'apps', name: 'server2', role: 'Worker Node', ip: 'ip-10.100.0.2', disk: '194 GB', usage: '41%', x: 72, y: 22 },
  { id: 'backup', name: 'server3', role: 'Backup Server', ip: 'ip-10-100-0-3', disk: '145 GB', usage: '—', x: 50, y: 68 },
];

// ============================================================

export default function DevOpsPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setActiveStep(s => (s + 1) % pipelineSteps.length);
    }, 2200);
    return () => clearInterval(t);
  }, [playing]);

  const step = pipelineSteps[activeStep];

  return (
    <div className={style.dops}>

      <SiteNav variant="devops" />

      {/* ===== HERO ===== */}
      <section className={style.dopsHero}>
        <p className={style.dopsLabel}>[ DEVOPS / WORKFLOW VISUALIZATION ]</p>
        <h1 className={style.dopsTitle}>
          HOW I<br />
          <span className={style.dopsTitleMuted}>BUILD & SHIP</span>
        </h1>
        <p className={style.dopsSub}>
          A working view of my delivery pipeline: code to production, with
          GitOps, secret management, and recovery all built in. Everything
          below is what actually runs at{' '}
          <span className={style.dopsAccent}>example.domain</span>.
        </p>
        <div className={style.dopsMeta}>
          <span>Argo CD</span>
          <span>Kubernetes</span>
          <span>HashiCorp Vault</span>
          <span>GitHub Actions</span>
          <span>Longhorn</span>
          <span>Velero</span>
        </div>
      </section>

      {/* ===== PIPELINE WALKTHROUGH ===== */}
      <section className={style.dopsSection}>
        <p className={style.dopsLabel}>// THE PIPELINE</p>
        <h2 className={style.dopsH2}>Six steps. No manual deploys.</h2>

        <div className={style.pipeline}>
          <div className={style.pipelineList}>
            {pipelineSteps.map((s, i) => (
              <button
                key={s.id}
                className={`${style.pipelineItem} ${i === activeStep ? style.pipelineItemActive : ''}`}
                onClick={() => setActiveStep(i)}
              >
                <span className={style.pipelineId}>{s.id}</span>
                <span className={style.pipelineItemBody}>
                  <span className={style.pipelineItemTitle}>{s.title}</span>
                  <span className={style.pipelineItemSub}>{s.subtitle}</span>
                </span>
                <span className={style.pipelineItemDot} />
              </button>
            ))}
            <button
              className={`${style.pipelinePlay} ${playing ? style.pipelinePlayOn : ''}`}
              onClick={() => setPlaying(p => !p)}
            >
              {playing ? '❙❙ pause auto-advance' : '▶ resume auto-advance'}
            </button>
          </div>

          <div className={style.pipelineDetail}>
            <div className={style.pipelineDetailHead}>
              <span className={style.pipelineDetailIcon}>{step.icon}</span>
              <div>
                <p className={style.pipelineDetailId}>STEP {step.id} / 06</p>
                <h3 className={style.pipelineDetailTitle}>{step.title}</h3>
              </div>
            </div>
            <p className={style.pipelineDetailSub}>{step.subtitle}</p>
            <p className={style.pipelineDetailText}>{step.detail}</p>
            <div className={style.pipelineDetailFoot}>
              <div>
                <span className={style.pipelineDetailK}>Actor</span>
                <span className={style.pipelineDetailV}>{step.actor}</span>
              </div>
              <div>
                <span className={style.pipelineDetailK}>Typical time</span>
                <span className={style.pipelineDetailV}>{step.duration}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOUR PLANES ===== */}
      <section className={style.dopsSection}>
        <p className={style.dopsLabel}>// FOUR PLANES</p>
        <h2 className={style.dopsH2}>The pipeline isn't one thing.</h2>
        <p className={style.dopsLede}>
          I think of my delivery system as four separate planes that each own
          a concern. They overlap at the boundary (image, secret, health check)
          but never depend on each other implicitly.
        </p>

        <div className={style.planes}>
          {planes.map(p => (
            <article key={p.code} className={style.plane} style={{ '--plane-color': p.color }}>
              <div className={style.planeHead}>
                <span className={style.planeCode}>{p.code}</span>
                <span className={style.planeRule} />
              </div>
              <h3 className={style.planeTitle}>{p.title}</h3>
              <ul className={style.planeList}>
                {p.items.map(i => <li key={i}>{i}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ===== TOOLS DEEP DIVE ===== */}
      <section className={style.dopsSection}>
        <p className={style.dopsLabel}>// TOOLS — WHAT & WHY</p>
        <h2 className={style.dopsH2}>The tools I chose,<br />and what each replaces.</h2>
        <p className={style.dopsLede}>
          Every tool below was chosen to remove a specific failure mode. Each
          one replaces something I could have done with a shell script — or an
          entire category of manual work. Together they are the full stack:
          build, deploy, observe, back up, and communicate.
        </p>

        <div className={style.tools}>
          {tools.map(t => (
            <article key={t.name} className={style.tool}>
              <div className={style.toolHead}>
                <h3 className={style.toolName}>{t.name}</h3>
                <span className={style.toolRole}>{t.role}</span>
              </div>
              <p className={style.toolWhy}>{t.why}</p>
              <div className={style.toolMeta}>
                <div>
                  <span className={style.toolMetaK}>Replaces</span>
                  <span className={style.toolMetaV}>{t.replaces}</span>
                </div>
                <div>
                  <span className={style.toolMetaK}>In my setup</span>
                  <span className={style.toolMetaV}>{t.config}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== REPO STRUCTURE ===== */}
      <section className={style.dopsSection}>
        <p className={style.dopsLabel}>// GITOPS REPO STRUCTURE</p>
        <h2 className={style.dopsH2}>How the Devopps repo<br />is organized.</h2>
        <p className={style.dopsLede}>
          One repo describes everything about the cluster. Services deploy
          independently. Infra holds the shared platform services. Reports
          holds the write-ups when something breaks — because every incident
          deserves a permanent record.
        </p>

        <div className={style.repo}>
          {repoTree.map(node => (
            <div key={node.name} className={style.repoNode}>
              <div className={style.repoNodeHead}>
                <span className={`${style.repoIcon} ${node.type === 'dir' ? style.repoIconDir : style.repoIconFile}`}>
                  {node.type === 'dir' ? '▸' : '·'}
                </span>
                <span className={style.repoName}>{node.name}</span>
              </div>
              {node.note && <p className={style.repoNote}>{node.note}</p>}
              {(node.children?.length ?? 0) > 0 && (
                <div className={style.repoChildren}>
                  {node.children.map(child => (
                    <div key={child.name} className={style.repoChild}>
                      <span className={`${style.repoIcon} ${child.type === 'dir' ? style.repoIconDir : style.repoIconFile}`}>
                        {child.type === 'dir' ? '▸' : '·'}
                      </span>
                      <span className={style.repoChildName}>{child.name}</span>
                      {child.note && <span className={style.repoChildNote}>{child.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== INFRASTRUCTURE TOPOLOGY ===== */}
      <section className={style.dopsSection}>
        <p className={style.dopsLabel}>// TOPOLOGY</p>
        <h2 className={style.dopsH2}>What the cluster actually looks like.</h2>

        <div className={style.topoWrap}>
          <svg viewBox="0 0 100 100" className={style.topoSvg} preserveAspectRatio="xMidYMid meet">
            <line x1="28" y1="22" x2="72" y2="22" stroke="#2a2a2a" strokeWidth="0.3" />
            <line x1="28" y1="22" x2="50" y2="68" stroke="#2a2a2a" strokeWidth="0.3" strokeDasharray="1,1" />
            <line x1="72" y1="22" x2="50" y2="68" stroke="#2a2a2a" strokeWidth="0.3" strokeDasharray="1,1" />

            <rect x="14" y="10" width="72" height="26" fill="none" stroke="#1a1a1a" strokeWidth="0.2" strokeDasharray="0.6,0.6" />
            <text x="15" y="9" fontSize="1.6" fill="#555" fontFamily="monospace">KUBERNETES CLUSTER</text>

            {stackNodes.map(n => {
              const isCluster = n.id !== 'backup';
              const hovered = hoveredNode === n.id;
              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setHoveredNode(n.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={hovered ? 5.2 : 4.4}
                    fill={isCluster ? '#111' : '#0f0a08'}
                    stroke={hovered ? '#d4663a' : isCluster ? '#2a2a2a' : '#d4663a'}
                    strokeWidth={hovered ? 0.4 : 0.3}
                    style={{ transition: 'all 0.2s' }}
                  />
                  <circle cx={n.x} cy={n.y} r="1.1" fill={isCluster ? '#f0f0f0' : '#d4663a'} />
                  <text
                    x={n.x}
                    y={n.y + 7.5}
                    fontSize="1.9"
                    fill={hovered ? '#f0f0f0' : '#888'}
                    textAnchor="middle"
                    fontFamily="monospace"
                    style={{ transition: 'fill 0.2s' }}
                  >
                    {n.name}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className={style.topoSide}>
            <p className={style.topoSideLabel}>NODES</p>
            {stackNodes.map(n => (
              <div
                key={n.id}
                className={`${style.topoNode} ${hoveredNode === n.id ? style.topoNodeActive : ''}`}
                onMouseEnter={() => setHoveredNode(n.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className={style.topoNodeHead}>
                  <span className={style.topoNodeName}>{n.name}</span>
                  <span className={style.topoNodeRole}>{n.role}</span>
                </div>
                <div className={style.topoNodeMeta}>
                  <span>{n.ip}</span>
                  <span>{n.disk}</span>
                  <span className={parseInt(n.usage) > 70 ? style.warn : ''}>
                    {n.usage} used
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={style.layers}>
          {infrastructure.map(l => (
            <div key={l.layer} className={style.layer}>
              <span className={style.layerName}>{l.layer}</span>
              <div className={style.layerComponents}>
                {l.components.map(c => (
                  <span key={c} className={style.layerChip}>{c}</span>
                ))}
              </div>
              <p className={style.layerNote}>{l.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BACKUP MATRIX ===== */}
      <section className={style.dopsSection}>
        <p className={style.dopsLabel}>// RECOVERY</p>
        <h2 className={style.dopsH2}>Dual backup. Tested.</h2>
        <p className={style.dopsLede}>
          Cluster state and volume data are backed up by two independent systems
          that both target the same MinIO cluster. One restores a broken cluster;
          the other restores lost data.
        </p>

        <div className={style.backupMatrix}>
          <div className={style.backupHead}>
            <span>System</span>
            <span>Scope</span>
            <span>Schedule</span>
            <span>Retention</span>
            <span>Target</span>
          </div>
          {backupMatrix.map(b => (
            <div key={b.system} className={style.backupRow}>
              <span className={style.backupSystem}>{b.system}</span>
              <span>{b.scope}</span>
              <span>{b.schedule}</span>
              <span>{b.retention}</span>
              <span className={style.monoMuted}>{b.target}</span>
            </div>
          ))}
        </div>

        <div className={style.recoveryNote}>
          <span className={style.recoveryIcon}>↺</span>
          <p>
            Recovery is documented for four scenarios: full cluster loss, volume
            data loss, application misconfiguration, and complete infrastructure loss.
            Each has a runbook with concrete <code>kubectl</code> and <code>velero</code> commands.
          </p>
        </div>
      </section>

      {/* ===== DEPLOYMENT GUIDES ===== */}
      <section className={style.dopsSection}>
        <p className={style.dopsLabel}>// DEPLOYMENT GUIDES</p>
        <h2 className={style.dopsH2}>Every pattern,<br />documented.</h2>
        <p className={style.dopsLede}>
          {DEPLOYMENT_ORDER.length} guides that cover every deployment shape this
          cluster runs — from a static Vite frontend to Longhorn's storage layer.
          Each guide is the exact manifest that runs in production, with the gotchas
          that will bite. Every guide links to the tool's official documentation.
        </p>

        <div className={style.guideGrid}>
          {DEPLOYMENT_ORDER.map((g, i) => (
            <div key={g.path} className={style.guideCard}>
              <span className={style.guideNum}>{String(i + 1).padStart(2, '0')}</span>
              <Link to={g.path} className={style.guideName}>{g.label}</Link>
              {guideDocs[g.path] && (
                <a
                  href={guideDocs[g.path]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={style.guideDocs}
                  title={`${g.label} documentation`}
                >
                  docs ↗
                </a>
              )}
              <Link to={g.path} className={style.guideArrow}>→</Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32 }}>
          <Link to="/deployment-guides" className={style.linkBtn}>
            View all guides →
          </Link>
        </div>
      </section>

      {/* ===== ENGINEERING PRINCIPLES ===== */}
      <section className={`${style.dopsSection} ${style.dopsSectionLast}`}>
        <p className={style.dopsLabel}>// PRINCIPLES</p>
        <h2 className={style.dopsH2}>What this pipeline is actually protecting.</h2>

        <div className={style.principles}>
          <div className={style.principle}>
            <span className={style.principleNum}>01</span>
            <h3>Git is the only source of truth</h3>
            <p>If it's not in Git, it doesn't exist. Argo reverts manual changes on the cluster — and that's the point.</p>
          </div>
          <div className={style.principle}>
            <span className={style.principleNum}>02</span>
            <h3>Secrets never touch the repo</h3>
            <p>Vault owns secrets. External Secrets Operator syncs them on a 1-minute interval. Nothing sensitive is ever written to a manifest.</p>
          </div>
          <div className={style.principle}>
            <span className={style.principleNum}>03</span>
            <h3>Rollbacks are a commit revert</h3>
            <p>The same history that ships a change can un-ship it. No special tools, no out-of-band procedures.</p>
          </div>
          <div className={style.principle}>
            <span className={style.principleNum}>04</span>
            <h3>Backups exist to be restored</h3>
            <p>Every backup has a documented recovery path and a tested command. Backups that can't be restored are just files.</p>
          </div>
        </div>
      </section>
    </div>
  );
}