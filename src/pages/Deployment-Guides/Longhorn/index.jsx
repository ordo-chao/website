import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const overviewPoints = [
  'Longhorn is a cloud-native distributed block storage system for Kubernetes.',
  'It provides PersistentVolumes by turning local disk on worker nodes into replicated block storage.',
  'Every volume is a Kubernetes resource — you can see, snap back up, and restore it from the UI or kubectl.',
  'Built-in backups to S3-compatible storage (MinIO here), scheduled via RecurringJobs.',
  'Volumes are replicated across nodes by default — with 1 replica, there is no replication, just local disk.',
  'In this cluster, Longhorn is the storage class behind every stateful app: myapp, website, uptime-kuma, and more.',
];

const whyPoints = [
  {
    title: 'PersistentVolumes that survive pod restarts',
    detail: 'A vanilla Kubernetes emptyDir volume is deleted when the pod dies. A Longhorn volume is backed by a real disk on a worker node and persists across pod recreations, rescheduling, and cluster upgrades. Every stateful app on this cluster needs this.',
  },
  {
    title: 'Built-in backup to S3',
    detail: 'Longhorn has first-class support for S3-compatible backup targets. That is why every PVC on this cluster can declare `longhorn.io/recurring-jobs` annotations — daily backups and hourly snapshots are configured per volume, not built by hand for each app.',
  },
  {
    title: 'A UI and CLI for volume operations',
    detail: 'The Longhorn UI is the single place to see every volume, its replicas, health, and restore points. When a Postgres volume has a problem at 2 AM, that UI is often the fastest path to a diagnosis.',
  },
  {
    title: 'Snapshot and restore at the volume layer',
    detail: 'Velero restores cluster resources; Longhorn restores the actual data. The two together are the recovery story: Velero rebuilds the shape of the cluster, Longhorn restores the bytes underneath.',
  },
];

const manifestSections = [
  {
    title: 'Application CRD + finalizer',
    detail: 'Same pattern as Grafana and Vault. Argo deploys the Longhorn Helm chart and reconciles the cluster toward it. The finalizer ensures that deleting the Application also cleans up Longhorn — no orphaned CRDs, no leaked volumes.',
  },
  {
    title: 'targetRevision pinned to 1.11.0',
    detail: 'Unlike the Grafana page (where targetRevision: "*" was flagged as a risk), this manifest pins a specific chart version. That means the chart cannot change underneath you — a commit to this file is the only way to upgrade Longhorn. This is the correct GitOps posture.',
  },
  {
    title: 'preUpgradeChecker.jobEnabled: false',
    detail: 'Longhorn normally runs a pre-upgrade check as a Kubernetes Job before applying an upgrade. That Job checks for running volumes and other risks. Disabling it means upgrades proceed without that check. That is a deliberate trade-off — either because the cluster is small enough to skip it, or because the check caused problems in this environment. Either way, it means you must manually verify no volumes are degraded before an upgrade.',
  },
  {
    title: 'persistence.defaultClassReplicaCount: 1',
    detail: 'The default for new volumes is 1 replica. That means no redundancy — the volume lives on exactly one node. If that node dies, the data is lost (unless a backup exists). Longhorn supports multiple replicas, but this cluster chose 1. The reason: this is a single-worker cluster (worker-node is the only worker), so replication across nodes is not possible even if configured. The trade-off is honest: no local redundancy, rely on S3 backups for durability.',
  },
  {
    title: 'ignoreDifferences on CRD preserveUnknownFields',
    detail: 'Longhorn\'s CRDs are large and the API server sometimes writes fields Argo does not know about (preserveUnknownFields in particular). Without this list, Argo would report "OutOfSync" perpetually because the live state never matches the desired state exactly. This is a standard Longhorn-Argo compatibility workaround — one entry per CRD.',
  },
  {
    title: 'ServerSideApply: true',
    detail: 'Longhorn\'s CRDs are large enough to exceed the 256KB limit for client-side apply. Server-side apply avoids that entirely. Same reason as Vault.',
  },
];

const ingressSections = [
  {
    title: 'Ingress class and TLS',
    detail: 'ingressClassName: traefik is explicit — unlike some other Ingresses on this cluster that rely on the default. The TLS block references the Longhorn secret created by cert-manager, so accessing longhorn.example.com redirects to HTTPS automatically.',
  },
  {
    title: 'Two middlewares applied together',
    detail: 'The annotation references both longhorn-auth and longhorn-buffering, comma-separated. Traefik applies them in order: auth first (reject unauthenticated), then buffering (handle large uploads). This is what makes the Ingress the correct front door for both viewing and managing volumes.',
  },
  {
    title: 'Service port 80, not 8080',
    detail: 'The Longhorn frontend Service listens on port 80 internally — even though the UI typically appears on port 8080 in other configurations. The Ingress points at port 80. This is a chart-version detail: newer Longhorn charts expose the frontend on 80 inside the cluster.',
  },
];

const middlewareSections = [
  {
    title: 'longhorn-auth — basicAuth middleware',
    detail: 'Basic auth, backed by a Secret named basic-auth in the same namespace. Without it, anyone who can resolve the hostname can access the Longhorn UI — which can delete volumes, trigger restores, and read metadata about every volume in the cluster. Basic auth is a floor, not a ceiling, but it is enough to keep the UI from being publicly readable.',
  },
  {
    title: 'longhorn-buffering — max 10GB request',
    detail: 'Longhorn supports uploading backing images and restoring backups from the UI. Those are large file uploads. Traefik\'s default request body limit is small enough to break them. The buffering middleware raises it to ~10GB. Without this, backup restore via the UI fails silently with a 413 that is hard to trace.',
  },
  {
    title: 'Why both middlewares are needed',
    detail: 'Authentication without buffering means backups cannot be uploaded. Buffering without authentication means anyone can access the UI. Together, they are what makes the Longhorn UI a real operational tool — accessible, but only to the right people, and capable of what it needs to do.',
  },
];

const gotchas = [
  {
    title: 'defaultClassReplicaCount: 1 means no redundancy',
    detail: 'Every volume is on one node. If worker-node dies, every PVC on the cluster is unavailable until the node returns or data is restored from backup. This is the correct trade-off for a single-worker cluster, but it means the S3 backups are the actual durability story.',
  },
  {
    title: 'preUpgradeChecker.jobEnabled: false removes the safety net',
    detail: 'Longhorn normally blocks upgrades if any volume is degraded. With this disabled, the upgrade proceeds regardless. Before upgrading the chart version, manually check `kubectl get volumes.longhorn.io -n longhorn-system` for degraded volumes.',
  },
  {
    title: 'The basic-auth secret must exist in longhorn-system',
    detail: 'The Middleware references `secret: basic-auth` in the longhorn-system namespace. If that secret does not exist, the middleware fails to load — Traefik returns 500 for every request to longhorn.example.com. The secret must be created (with an htpasswd-formatted user list) before the Ingress is applied.',
  },
  {
    title: 'The 10GB buffer is only for the Ingress, not for the app',
    detail: 'The buffering middleware raises Traefik\'s request body limit. It does not raise the size limit inside Longhorn itself. If a restore fails at the Longhorn layer, the middleware is not the reason — check Longhorn\'s own limits.',
  },
  {
    title: 'ignoreDifferences is a workaround, not a fix',
    detail: 'Argo ignores preserveUnknownFields on seven CRDs because the API server writes it and Argo does not. If Longhorn changes which CRDs have this field, Argo will report OutOfSync again. When upgrading Longhorn, review this list — it may need new entries.',
  },
  {
    title: 'A single-worker cluster cannot use Longhorn\'s replication',
    detail: 'Replication requires volumes to be on different nodes. worker-node is the only worker node on this cluster (per the topology page). Even if you set defaultClassReplicaCount: 3, Longhorn cannot actually replicate — it will warn that only 1 replica can be placed. The correct number for this cluster is 1, and the durability guarantee comes from S3 backups, not from local replication.',
  },
];

export default function DeployLonghornPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ STORAGE / LONGHORN ]</p>
        <h1 className={style.title}>
          WHAT IS<br />
          <span className={style.titleMuted}>LONGHORN?</span>
        </h1>
        <p className={style.sub}>
          Longhorn is the storage layer under every stateful app on this
          cluster. It turns local disk on worker nodes into PersistentVolumes
          that survive pod restarts, snapshot hourly, and back up to S3 daily.
          Here is what it does, why it is here, and the three manifests that
          deploy it and expose its UI.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT LONGHORN IS</p>
        <h2 className={style.h2}>Cloud-native block storage for Kubernetes.</h2>
        <p className={style.lede}>
          Longhorn is a lightweight, reliable, and powerful distributed block
          storage system for Kubernetes. It turns local disk on worker nodes
          into PersistentVolumes with replication, snapshot, and backup
          capabilities — all managed through Kubernetes-native resources.
        </p>

        <div className={style.checklist}>
          {overviewPoints.map(p => (
            <div key={p} className={style.checkItem}>
              <span className={style.checkMark}>✓</span>
              <span className={style.checkText}>{p}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHY THIS CLUSTER USES IT</p>
        <h2 className={style.h2}>The storage class that makes the rest work.</h2>

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
        <p className={style.label}>// ARGOCD APPLICATION</p>
        <h2 className={style.h2}>Deploying Longhorn itself.</h2>
        <p className={style.lede}>
          The Helm chart plus a set of compatibility workarounds. Pinned to a
          specific version, with ignoreDifferences for the CRDs that Argo
          cannot reconcile cleanly.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Longhorn Application</h3>
              <span className={style.manifestFile}>longhorn-app.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: longhorn
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://charts.longhorn.io
    chart: longhorn
    targetRevision: "1.11.0"
    helm:
      values: |
        preUpgradeChecker:
          jobEnabled: false
        persistence:
          defaultClassReplicaCount: 1
  destination:
    server: https://kubernetes.default.svc
    namespace: longhorn-system
  ignoreDifferences:
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
      name: engineimages.longhorn.io
      jsonPointers: ["/spec/preserveUnknownFields"]
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
      name: engines.longhorn.io
      jsonPointers: ["/spec/preserveUnknownFields"]
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
      name: instancemanagers.longhorn.io
      jsonPointers: ["/spec/preserveUnknownFields"]
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
      name: nodes.longhorn.io
      jsonPointers: ["/spec/preserveUnknownFields"]
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
      name: replicas.longhorn.io
      jsonPointers: ["/spec/preserveUnknownFields"]
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
      name: settings.longhorn.io
      jsonPointers: ["/spec/preserveUnknownFields"]
    - group: apiextensions.k8s.io
      kind: CustomResourceDefinition
      name: volumes.longhorn.io
      jsonPointers: ["/spec/preserveUnknownFields"]
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true`}</code>
            </pre>
          </article>
        </div>

        <h3 className={style.subhead}>What each block does</h3>
        <div className={style.checklist}>
          {manifestSections.map(s => (
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
        <p className={style.label}>// INGRESS</p>
        <h2 className={style.h2}>Exposing the Longhorn UI.</h2>
        <p className={style.lede}>
          The Ingress is a real operational tool — it is where you restore
          volumes, check replica health, and trigger backups. That makes auth
          and upload limits non-negotiable.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Longhorn Ingress</h3>
              <span className={style.manifestFile}>longhorn-ingress.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: longhorn-ingress
  namespace: longhorn-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/router.middlewares: longhorn-system-longhorn-auth@kubernetescrd,longhorn-system-longhorn-buffering@kubernetescrd
spec:
  ingressClassName: traefik
  tls:
    - hosts:
        - longhorn.example.com
      secretName: longhorn-tls
  rules:
    - host: longhorn.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: longhorn-frontend
                port:
                  number: 80`}</code>
            </pre>
          </article>
        </div>

        <h3 className={style.subhead}>What each block does</h3>
        <div className={style.checklist}>
          {ingressSections.map(s => (
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
        <p className={style.label}>// MIDDLEWARES</p>
        <h2 className={style.h2}>Auth and buffering.</h2>
        <p className={style.lede}>
          Two Traefik Middleware CRDs define the guardrails. The Ingress
          references them by name — if either is missing, the Ingress returns
          500 for every request.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Longhorn Middlewares</h3>
              <span className={style.manifestFile}>longhorn-middlewares.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: longhorn-auth
  namespace: longhorn-system
spec:
  basicAuth:
    secret: basic-auth
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: longhorn-buffering
  namespace: longhorn-system
spec:
  buffering:
    maxRequestBodyBytes: 10485760000  # ~10GB for backing image uploads`}</code>
            </pre>
          </article>
        </div>

        <h3 className={style.subhead}>What each block does</h3>
        <div className={style.checklist}>
          {middlewareSections.map(s => (
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