import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'K3s is a lightweight Kubernetes distribution — one binary for server and agent',
  'A multi-node cluster needs a WireGuard tunnel between nodes for encrypted pod traffic',
  'Control plane nodes need more CPU and RAM than workers; workers need more disk',
  'The backup server must live outside the cluster network — if the cluster is down, backups still exist',
  'Traefik handles ingress and can enforce rate limits via a Middleware CRD',
  'Velero backs up cluster resources and volume data to S3-compatible storage',
];

const k3sRequirements = [
  {
    role: 'Server (Control Plane)',
    cpu: '2 cores minimum [citation:8]',
    ram: '2 GB minimum [citation:8]',
    disk: 'SSD recommended — etcd/SQLite is I/O-sensitive [citation:2][citation:10]',
    note: 'Runs the API server, scheduler, controller manager, and datastore. For HA, run three servers for quorum [citation:11].',
  },
  {
    role: 'Agent (Worker Node)',
    cpu: '1 core minimum [citation:8]',
    ram: '512 MB minimum [citation:8]',
    disk: 'Larger than control plane — this is where workloads and volumes live [citation:2]',
    note: 'Runs kubelet and the container runtime. Does not run the control plane components.',
  },
];

const controlPlaneVsWorker = [
  {
    title: 'What the control plane does',
    detail: 'The control plane is the brain. It runs the Kubernetes API server, the scheduler (decides which node a pod goes on), the controller manager (reconciles state), and the datastore (etcd or SQLite). If the control plane is down, you cannot deploy or query the cluster — but existing pods keep running.',
  },
  {
    title: 'What the worker does',
    detail: 'The worker is the muscle. It runs kubelet (talks to the control plane), the container runtime (containerd), and your actual workloads. Workers can be added or removed without touching the control plane — that is how you scale horizontally.',
  },
  {
    title: 'Sizing the control plane',
    detail: 'Give the control plane the faster CPU and the more reliable disk. It does not need much RAM (2 GB is the floor for a small cluster), but it does need low-latency disk I/O because every API call writes to the datastore [citation:2]. If you run the datastore on spinning rust, every kubectl command will feel slow.',
  },
  {
    title: 'Sizing the worker',
    detail: 'Give the worker the larger disk and the more RAM per core. This is where Postgres volumes, container images, and application memory live. The worker can be a bigger, slower machine — workloads do not need the same latency profile as the control plane.',
  },
  {
    title: 'The single-server trap',
    detail: 'A single-server K3s cluster is fine for a lab. For anything that matters, run three servers. Raft or embedded etcd requires an odd number for quorum — three is the minimum for HA [citation:11]. With one server, a reboot is a full outage.',
  },
];

const wireguardSetup = [
  {
    step: '01',
    title: 'Install WireGuard on all nodes',
    detail: 'WireGuard is built into Linux kernel 5.6+ [citation:1]. On older kernels, install the package. Verify with `ip link add dev wg-test type wireguard && ip link delete wg-test` — if it succeeds, WireGuard is available.',
    code: `# Ubuntu / Debian
apt-get update && apt-get install -y wireguard

# Verify
ip link add dev wg-test type wireguard && ip link delete wg-test`,
  },
  {
    step: '02',
    title: 'Create the WireGuard tunnel config',
    detail: 'Each node needs a private key and the peer\'s public key. The server config points at each agent; the agent config points at the server. The tunnel IP range (e.g. 10.1.10.0/24) becomes the cluster\'s internal network [citation:9].',
    code: `# On the server, generate a keypair
wg genkey | tee server.key | wg pubkey > server.pub

# On each agent
wg genkey | tee agent.key | wg pubkey > agent.pub`,
  },
  {
    step: '03',
    title: 'Install K3s with WireGuard as the Flannel backend',
    detail: 'Flannel is K3s\'s default pod network. By default it uses VXLAN with no encryption. Setting `--flannel-backend=wireguard-native` encrypts all pod-to-pod traffic between nodes [citation:1]. The tunnel interface (flannel-wg) carries the encrypted traffic.',
    code: `# On the server
curl -sfL https://get.k3s.io | \\
  INSTALL_K3S_EXEC="--flannel-backend=wireguard-native" \\
  sh -

# On each agent
curl -sfL https://get.k3s.io | \\
  K3S_URL=https://<server-tunnel-ip>:6443 \\
  K3S_TOKEN=<node-token> \\
  sh -`,
  },
  {
    step: '04',
    title: 'Verify the tunnel',
    detail: 'After installation, `wg show` should show the flannel-wg interface with an active handshake to each peer. Pods on different nodes can now communicate over the encrypted tunnel [citation:1].',
    code: `wg show
# interface: flannel-wg
#   peer: <agent-public-key>
#     endpoint: 10.1.10.3:51820
#     latest handshake: 12 seconds ago`,
  },
];

const backupServerRationale = [
  {
    title: 'Why the backup server is outside the cluster network',
    detail: 'If the backup server is a node inside the cluster, then a cluster-wide failure (power loss, network partition, failed upgrade) takes the backups with it. The backup server must be reachable from the cluster but not dependent on it. In this setup, the backup server is a separate machine on a different network — the cluster pushes backups to it, but cannot lose them if the cluster dies.',
  },
  {
    title: 'Why this matters for Velero and Longhorn',
    detail: 'Velero writes cluster resources and volume snapshots to S3-compatible storage. Longhorn writes volume backups to the same target. If that target is inside the cluster, a cluster failure means both the workloads and the backups are gone. The target must outlive the cluster.',
  },
  {
    title: 'The two options: MinIO vs AWS S3',
    detail: 'MinIO is a self-hosted S3-compatible store. You control the hardware, the data never leaves your network, and there are no per-GB charges [citation:5][citation:13]. The trade-off is operational: you are responsible for disk health, erasure coding, and backups of the backup server itself. AWS S3 is fully managed, has 11 nines of durability, and requires no operations — but it costs per GB and per request, and the data leaves your network [citation:5].',
  },
  {
    title: 'Which to choose',
    detail: 'For a lab or a small cluster with a dedicated backup server, MinIO is the right choice — it costs only the hardware you already have, and the backup server is already outside the cluster. For a production cluster with no dedicated backup infrastructure, AWS S3 is safer: it removes the "who backs up the backup server" problem entirely.',
  },
];

const traefikAndRateLimit = [
  {
    title: 'What Traefik does',
    detail: 'Traefik is the ingress controller — it receives traffic from outside the cluster and routes it to the right Service based on the Ingress or IngressRoute rules. In this cluster, it also terminates TLS via cert-manager, so every service gets an HTTPS URL without managing certificates manually [citation:6][citation:14].',
  },
  {
    title: 'Why cert-manager + Traefik, not Traefik alone',
    detail: 'Traefik can request Let\'s Encrypt certificates directly, but it cannot do so reliably with multiple Traefik replicas — the ACME challenge might hit the wrong replica [citation:6]. cert-manager solves this: it issues the certificate, writes it to a Secret, and Traefik reads the Secret. The result is HA-safe TLS.',
  },
  {
    title: 'The rate-limit Middleware',
    detail: 'The global-ratelimit Middleware in kube-system caps requests per IP. The config allows 10 requests per 30 seconds, with a burst of 30 before the wait starts. It is attached to an Ingress via the `traefik.ingress.kubernetes.io/router.middlewares` annotation. Without it, a single client can overwhelm the backend.',
    code: `apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: global-ratelimit
  namespace: kube-system
spec:
  rateLimit:
    average: 10
    period: 30s
    burst: 30
    sourceCriterion:
      ipStrategy:
        depth: 1`,
  },
  {
    title: 'Applying the Middleware to an Ingress',
    detail: 'The annotation references the Middleware by namespace-name@kubernetescrd. A single Ingress can reference multiple Middlewares comma-separated — for example, basic auth plus rate limiting.',
    code: `annotations:
  traefik.ingress.kubernetes.io/router.middlewares: kube-system-global-ratelimit@kubernetescrd`,
  },
];

const veleroFlow = [
  {
    step: '01',
    title: 'Velero creates a Backup object',
    detail: 'When you run `velero backup create`, the Velero client creates a Backup custom resource in the cluster. The BackupController notices it and starts the backup [citation:7].',
  },
  {
    step: '02',
    title: 'BackupController collects resources',
    detail: 'The controller queries the API server for every resource in scope — Deployments, Services, ConfigMaps, Secrets (references only), and PVCs. It also calls the cloud provider API for volume snapshots if configured [citation:7].',
  },
  {
    step: '03',
    title: 'Data is uploaded to object storage',
    detail: 'The controller packages the resources into a tarball and uploads it to the configured S3-compatible bucket. Volume snapshots go to the same target. From this point on, the backup exists independently of the cluster [citation:7].',
  },
  {
    step: '04',
    title: 'Restore reads from object storage',
    detail: 'A restore fetches the backup from S3, validates the API versions against the target cluster, and recreates each resource. By default, restores are non-destructive — if a resource already exists, Velero skips it [citation:7].',
  },
];

const gotchas = [
  {
    title: 'WireGuard must be installed on every node, including agents',
    detail: 'The K3s server uses WireGuard for the Flannel backend, but each agent also needs WireGuard installed to participate. If an agent is missing the kernel module, it will not join the encrypted network [citation:1].',
  },
  {
    title: 'The control plane does not need the most RAM — it needs the best disk',
    detail: 'A common mistake is giving the control plane a massive RAM allocation while leaving it on spinning disk. The API server and datastore are I/O-bound, not RAM-bound. A 2 GB control plane on SSD outperforms a 16 GB control plane on HDD for cluster operations [citation:2].',
  },
  {
    title: 'A single-server cluster is not highly available',
    detail: 'K3s with one server is fine for a lab, but a reboot is a full control-plane outage. Production needs three servers for quorum. The datastore (etcd or SQLite) requires an odd number of nodes to maintain quorum [citation:11].',
  },
  {
    title: 'The backup server must be reachable but independent',
    detail: 'If the backup server is in the same rack, on the same power supply, or on the same network switch as the cluster, a single failure can take both. The backup server should be on a different network path, ideally a different physical location.',
  },
  {
    title: 'MinIO needs its own backup strategy',
    detail: 'If you use MinIO as the backup target, MinIO itself needs backups. Erasure coding protects against disk failure, but not against accidental deletion or ransomware. Keep a copy of the MinIO data somewhere else, or use AWS S3 for the critical backups [citation:13].',
  },
  {
    title: 'Rate limiting is per-IP, not per-user',
    detail: 'The Traefik rate-limit Middleware uses the client IP by default. If users are behind a NAT or a shared proxy, they share a rate limit. The `ipStrategy.depth` setting controls how many proxy hops to trust — depth 1 means trust one proxy (the ingress controller) [citation:6].',
  },
];

export default function DeployClusterSetupPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ INFRA / CLUSTER SETUP ]</p>
        <h1 className={style.title}>
          BUILD THE<br />
          <span className={style.titleMuted}>FOUNDATION</span>
        </h1>
        <p className={style.sub}>
          K3s installation, multi-node clustering over WireGuard, control plane
          vs worker sizing, the backup server isolation rule, Traefik and rate
          limiting, and how Velero works. This is the layer everything else in
          the series runs on.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT IS</p>
        <h2 className={style.h2}>The cluster, before the apps.</h2>

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
        <p className={style.label}>// K3S REQUIREMENTS</p>
        <h2 className={style.h2}>What each node actually needs.</h2>

        <div className={style.manifests}>
          {k3sRequirements.map(r => (
            <article key={r.role} className={style.manifest}>
              <div className={style.manifestHead}>
                <h3 className={style.manifestName}>{r.role}</h3>
              </div>
              <div className={style.checklist}>
                <div className={style.checkItem}>
                  <span className={style.checkMark}>CPU</span>
                  <span className={style.checkText}>{r.cpu}</span>
                </div>
                <div className={style.checkItem}>
                  <span className={style.checkMark}>RAM</span>
                  <span className={style.checkText}>{r.ram}</span>
                </div>
                <div className={style.checkItem}>
                  <span className={style.checkMark}>DISK</span>
                  <span className={style.checkText}>{r.disk}</span>
                </div>
              </div>
              <p className={style.manifestWhy} style={{ marginTop: 12 }}>{r.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// CONTROL PLANE VS WORKER</p>
        <h2 className={style.h2}>Why they are sized differently.</h2>

        <div className={style.checklist}>
          {controlPlaneVsWorker.map(p => (
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
        <p className={style.label}>// WIREGUARD + K3S</p>
        <h2 className={style.h2}>Encrypted pod traffic between nodes.</h2>
        <p className={style.lede}>
          By default, K3s uses VXLAN for pod networking — unencrypted. WireGuard
          as the Flannel backend encrypts every packet between nodes with
          near-native performance [citation:1].
        </p>

        <div className={style.manifests}>
          {wireguardSetup.map(w => (
            <article key={w.step} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{w.step}</span>
                <h3 className={style.manifestName}>{w.title}</h3>
              </div>
              <p className={style.manifestWhy}>{w.detail}</p>
              <pre className={style.code}>
                <code>{w.code}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// BACKUP SERVER</p>
        <h2 className={style.h2}>Why it lives outside the cluster.</h2>

        <div className={style.checklist}>
          {backupServerRationale.map(p => (
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
        <p className={style.label}>// TRAEFIK & RATE LIMITING</p>
        <h2 className={style.h2}>Ingress, TLS, and the rate limiter.</h2>

        <div className={style.checklist}>
          {traefikAndRateLimit.map(p => (
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

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Global rate-limit Middleware</h3>
              <span className={style.manifestFile}>kube-system/global-ratelimit.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: global-ratelimit
  namespace: kube-system
spec:
  rateLimit:
    average: 10
    period: 30s
    burst: 30
    sourceCriterion:
      ipStrategy:
        depth: 1`}</code>
            </pre>
          </article>
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// HOW VELERO WORKS</p>
        <h2 className={style.h2}>Backup and restore, step by step.</h2>

        <div className={style.manifests}>
          {veleroFlow.map(v => (
            <article key={v.step} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{v.step}</span>
                <h3 className={style.manifestName}>{v.title}</h3>
              </div>
              <p className={style.manifestWhy}>{v.detail}</p>
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