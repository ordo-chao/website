import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'Mailu is a full mail stack: Postfix (SMTP), Dovecot (IMAP), Rspamd (spam), ClamAV (antivirus), a webmail and an admin UI',
  'Deployed as an ArgoCD Application, not raw manifests — the Helm chart owns the resources',
  'Two sources: the chart version is pinned, and the values live in a GitOps repository',
  'All pods pinned to edge nodes (mailu-edge=true) — mail ports are bound to the host, not exposed via Ingress',
  'PostgreSQL and Redis are shipped by the same chart, with local-path volumes',
  'Prune is disabled on purpose — mail data must not be deleted by an accidental Git edit',
];

const whyPoints = [
  {
    title: 'Hostname and certificate ownership',
    detail: 'Mail servers are identified by their hostname. The SMTP banner, the TLS certificate, the SPF/DKIM/DMARC records — all of them point at mail.example.com. A mail server that changes hostnames loses delivery reputation overnight. The stack must be stable across redeploys, which is why it lives in its own ArgoCD Application and its own values file.',
  },
  {
    title: 'Edge nodes, not general workload',
    detail: 'Mail ports (25, 465, 587, 993, 995) are bound to the host, not proxied through an Ingress. That is because SMTP does not work well behind HTTP-aware proxies — STARTTLS, EHLO, and multi-round dialogues confuse L7 routers. The solution is to run mail pods on nodes labeled mailu-edge=true, and let the host network handle the mail ports directly.',
  },
  {
    title: 'Storage is not ephemeral',
    detail: 'Mail is a database of messages. Every message must survive a pod restart. Postgres and Redis hold the queue and metadata. Dovecot holds the actual mailboxes. All three use local-path volumes in this deployment — the node is the source of truth, and the S3 backup strategy is separate.',
  },
  {
    title: 'Prune off means delete is deliberate',
    detail: 'An ArgoCD Application with prune: true will delete resources when the Git manifest removes them. That is fine for stateless apps. It is catastrophic for a mail server — an accidental edit could tear down the Postgres PVC. Prune is off here so deletions require an explicit `argocd app sync --prune` run.',
  },
];

const manifestSections = [
  {
    title: 'Two sources — chart and values',
    detail: 'Unlike the deployment guides that point at a single Git path, this Application has a sources array. The first source is the Mailu Helm chart, pinned to version 2.7.1. The second source is the GitOps repository, mounted at the ref "values" so the first source can reference $values/Infra/Mail/mailu-values.yaml. This is how ArgoCD does multi-source: the chart stays versioned, the values stay in your repo.',
  },
  {
    title: 'targetRevision: 2.7.1 — not a wildcard',
    detail: 'Unlike the Grafana guide (where targetRevision: "*" was flagged as a risk), this chart version is pinned. A patch version bump requires a commit here — the chart cannot change underneath the cluster without a review. That is the correct GitOps posture for a stateful mail server.',
  },
  {
    title: 'reference to $values',
    detail: 'The valueFiles array in the first source contains exactly one entry: $values/Infra/Mail/mailu-values.yaml. The $values prefix tells Argo to resolve the path against the second source (the one with ref: values). Without that prefix, Argo would look for the file in the chart repository — and fail because the chart repo does not contain your values file.',
  },
  {
    title: 'automated with prune: false',
    detail: 'selfHeal: true reverts manual cluster edits. prune: false means Git removals do not delete cluster resources. The comment in the manifest says "manual first — flip to automated after adoption is verified" — that is the safe default for a mail server. Once you trust the pipeline, you can add prune: true and automated sync. Until then, every deploy is a deliberate `argocd app sync` call.',
  },
  {
    title: 'ServerSideApply: true',
    detail: 'The Mailu chart ships CRDs and large manifests. Server-side apply avoids the "metadata.annotations: Too long" error that client-side apply hits on large resources — the same reason the Vault and Longhorn guides use this option.',
  },
  {
    title: 'ApplyOutOfSyncOnly: true',
    detail: 'Argo only applies resources that have drifted from the desired state. Without this, a sync run would re-apply every resource in the chart — even the ones that have not changed. For a chart this size, that is slow and risky. This option makes every sync a targeted update.',
  },
  {
    title: 'CreateNamespace: false',
    detail: 'Unlike the Grafana and Vault guides (which set CreateNamespace: true), this Application expects the mailu namespace to already exist. That is intentional: the namespace is created by a one-time kubectl apply, reviewed manually, before the Application is deployed. A mail server is not something you want appearing because a namespace was auto-created by accident.',
  },
];

const valuesSections = [
  {
    title: 'nodeSelector: mailu-edge=true',
    detail: 'Every pod in the chart — front, postfix, dovecot, rspamd, clamav, webmail, admin, postgresql, redis, tika, oletools — is pinned to nodes labeled mailu-edge=true. That label marks the edge nodes where mail ports are bound to the host network. Splitting this across nodes is impossible because the mail ports are physical ports on those machines.',
  },
  {
    title: 'hostnames + Ingress disabled',
    detail: 'The hostnames array lists mail.example.com and admin.example.com. Ingress is set to enabled: false — the hostnames are used for TLS certificates and SMTP banners, not for HTTP routing. The mail server does not speak HTTP on port 443; it speaks SMTP, IMAP, and POP3 on their native ports.',
  },
  {
    title: 'existingSecret: mailu-secrets',
    detail: 'The chart reads initial admin credentials and database passwords from an existing Kubernetes Secret named mailu-secrets. That Secret is created by an ExternalSecret from Vault — the same pattern as the backend guides. The chart never sees the raw password; it only sees a secretRef.',
  },
  {
    title: 'front: hostPort.enabled: true',
    detail: 'The front service binds to host ports 25, 143, 465, 587, 993, 995. That is what makes Mailu reachable from the internet — the node receives the mail, not a Kubernetes Ingress. This is why the pods cannot be scheduled anywhere except the edge nodes.',
  },
  {
    title: 'global.storageClass: local-path',
    detail: 'Unlike the backend guides (Longhorn) and the Go guide (local-path with a reason), Mailu uses local-path because the mail server is pinned to specific nodes anyway. There is no benefit to Longhorn replication when the pods can never leave the edge nodes. local-path is the correct choice.',
  },
  {
    title: 'postgresql.enabled + redis.enabled',
    detail: 'The chart ships its own Postgres and Redis. That is unusual — most charts expect you to bring your own database. Mailu does it because the database is small, the workload is predictable, and running it in the same Application keeps the mail stack self-contained. Redis has replicaCount: 0 because a single-master cache is enough for a single mail server.',
  },
];

const gotchas = [
  {
    title: 'Prune: false is not a mistake',
    detail: 'An accidental commit that removes the postgresql block from the values file would delete the Postgres PVC on the next sync — if prune were true. It is not. Deleting mail server data requires two explicit steps: a manual `argocd app sync --prune` and a reviewed commit. The safety is deliberate.',
  },
  {
    title: 'CreateNamespace: false means the namespace must exist first',
    detail: 'If the mailu namespace does not exist when the Application is applied, Argo will report "namespace not found" and do nothing. Create it manually once — kubectl create namespace mailu — then apply the Application. This is a deliberate friction point: mail servers should not appear because a namespace was auto-created.',
  },
  {
    title: 'The values file path must be exactly right',
    detail: 'The chart source references $values/Infra/Mail/mailu-values.yaml. If the file moves, or the ref is renamed, the Application fails to render. Argo does not warn — it just shows the app as OutOfSync with no obvious cause. Check the path first when the chart renders empty.',
  },
  {
    title: 'mailu-edge nodes must exist before the chart deploys',
    detail: 'Every pod has nodeSelector: mailu-edge="true". If no node has that label, every pod stays Pending forever. Label the edge nodes first: kubectl label node <name> mailu-edge=true. This is the prerequisite that is not in the manifest — it is in the GitOps documentation.',
  },
  {
    title: 'The existingSecret must exist in the mailu namespace',
    detail: 'Mailu reads its initial admin password and database credentials from a Secret named mailu-secrets. That Secret is created by an ExternalSecret — but the ExternalSecret is not in this Application. It is a separate manifest in the same namespace. Apply the ExternalSecret first, wait for the Secret to appear, then apply the Application.',
  },
  {
    title: 'local-path storage is node-bound',
    detail: 'Unlike Longhorn, local-path volumes bind to the node where they were created. If an edge node dies, the mail data is unavailable until the node returns. This is the trade-off for the pinning strategy — the alternative (Longhorn) would let the pods move, but the pods cannot move because the mail ports are on the nodes. The correct fix is a node-replacement runbook, not a storage change.',
  },
];

export default function DeployMailuPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ INFRA / MAILU ]</p>
        <h1 className={style.title}>
          DEPLOY A<br />
          <span className={style.titleMuted}>MAIL STACK</span>
        </h1>
        <p className={style.sub}>
          Mailu is a complete self-hosted mail server — SMTP, IMAP, spam
          filtering, antivirus, webmail, and an admin panel, all in one Helm
          chart. Here is the ArgoCD Application that deploys it, the values
          file that configures it, and why a mail server needs its own
          Application, its own namespace, and its own sync policy.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT IS</p>
        <h2 className={style.h2}>Not just another backend.</h2>

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
        <p className={style.label}>// WHY THIS CLUSTER USES IT</p>
        <h2 className={style.h2}>Why a mail server needs its own patterns.</h2>

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
        <p className={style.label}>// THE ARGOCD APPLICATION</p>
        <h2 className={style.h2}>Two sources, one Application.</h2>
        <p className={style.lede}>
          This is the first guide in the series with a multi-source
          Application. The chart version is pinned, the values are in the
          GitOps repository, and Argo resolves one against the other.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Mailu Application</h3>
              <span className={style.manifestFile}>argocd/mailu.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mailu
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  sources:
    - repoURL: https://mailu.github.io/helm-charts/
      chart: mailu
      targetRevision: 2.7.1
      helm:
        valueFiles:
          - $values/Infra/Mail/mailu-values.yaml
    - repoURL: https://github.com/your-org/gitops-repo.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: mailu
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
    syncOptions:
      - CreateNamespace=false
      - ServerSideApply=true
      - ApplyOutOfSyncOnly=true`}</code>
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
        <p className={style.label}>// THE VALUES FILE</p>
        <h2 className={style.h2}>What the chart is configured to do.</h2>
        <p className={style.lede}>
          The values file is what turns the generic Mailu chart into this
          specific mail server. Every decision — node placement, storage
          class, hostname, admin user — is declared in one file that Argo
          pulls from the GitOps repository.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Mailu values (excerpt)</h3>
              <span className={style.manifestFile}>Infra/Mail/mailu-values.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`domain: example.com
hostnames:
  - mail.example.com
  - admin.example.com

existingSecret: mailu-secrets

global:
  database:
    type: postgresql
  storageClass: local-path

ingress:
  enabled: false

initialAccount:
  domain: example.com
  enabled: true
  existingSecret: mailu-secrets
  existingSecretPasswordKey: initial-password
  mode: create
  username: admin

persistence:
  enabled: true
  size: 10Gi
  storageClass: local-path

front:
  externalService:
    enabled: false
  hostPort:
    enabled: true
  kind: Deployment
  ports:
    imap: false
    imaps: true
    manageSieve: true
    pop3: false
    pop3s: true
    smtp: true
    smtps: true
    submission: true

postgresql:
  enabled: true
  auth:
    database: mailu
    username: mailu
    existingSecret: mailu-secrets
    secretKeys:
      adminPasswordKey: db-password
      userPasswordKey: db-password
  primary:
    persistence:
      enabled: true
      size: 10Gi
      storageClass: local-path

redis:
  enabled: true
  master:
    persistence:
      enabled: true
      size: 1Gi
      storageClass: local-path
    resources:
      requests:
        memory: 192Mi
        cpu: 100m
      limits:
        memory: 512Mi
        cpu: 500m
  replica:
    replicaCount: 0`}</code>
            </pre>
          </article>
        </div>

        <h3 className={style.subhead}>What each block does</h3>
        <div className={style.checklist}>
          {valuesSections.map(s => (
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
        <p className={style.label}>// PREREQUISITES</p>
        <h2 className={style.h2}>Before this Application can run.</h2>

        <div className={style.checklist}>
          <div className={style.checkItem}>
            <span className={style.checkMark}>1</span>
            <span className={style.checkText}>
              <strong style={{ color: '#f0f0f0' }}>Label the edge nodes</strong>
              {' — '}
              <code style={{ color: '#d4663a' }}>kubectl label node &lt;name&gt; mailu-edge=true</code>.
              Every pod in the chart has nodeSelector: mailu-edge="true". Without the label, every pod stays Pending.
            </span>
          </div>
          <div className={style.checkItem}>
            <span className={style.checkMark}>2</span>
            <span className={style.checkText}>
              <strong style={{ color: '#f0f0f0' }}>Create the mailu namespace</strong>
              {' — '}
              <code style={{ color: '#d4663a' }}>kubectl create namespace mailu</code>.
              The Application has CreateNamespace=false by design.
            </span>
          </div>
          <div className={style.checkItem}>
            <span className={style.checkMark}>3</span>
            <span className={style.checkText}>
              <strong style={{ color: '#f0f0f0' }}>Apply the ExternalSecret for mailu-secrets</strong>
              {' — '}
              A separate manifest in the same namespace, backed by Vault. It creates the K8s Secret the chart reads for the admin password and database password.
            </span>
          </div>
          <div className={style.checkItem}>
            <span className={style.checkMark}>4</span>
            <span className={style.checkText}>
              <strong style={{ color: '#f0f0f0' }}>Point DNS at the edge node</strong>
              {' — '}
              mail.example.com and admin.example.com must resolve to the edge node's public IP. The chart does not manage DNS.
            </span>
          </div>
          <div className={style.checkItem}>
            <span className={style.checkMark}>5</span>
            <span className={style.checkText}>
              <strong style={{ color: '#f0f0f0' }}>Configure SPF, DKIM, DMARC</strong>
              {' — '}
              After deployment, read the DKIM key from the admin panel and publish the DNS records. Without these, delivered mail lands in spam.
            </span>
          </div>
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