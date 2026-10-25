import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'MinIO is a self-hosted, S3-compatible object storage server',
  'The console UI and the S3 API are served on two separate hostnames',
  'The API is served at the root of its subdomain — no path prefix — so SDKs work',
  'Uses a Recreate strategy because the object store cannot have two writers',
  'Longhorn-backed PVC for the object data',
  'Traefik IngressRoute (not Ingress) for TLS and routing, plus two cert-manager Certificates',
];

const whyPoints = [
  {
    title: 'S3 without the AWS bill',
    detail: 'MinIO speaks the S3 protocol. Any SDK that works with AWS S3 works with MinIO — the client does not need to know which one it is talking to. That means every backend in this series that uses S3 for file storage (Sherehe, Academia, and the backup pipelines) is actually talking to MinIO, not AWS. Migrating to AWS later is a URL change.',
  },
  {
    title: 'Backup target for Longhorn and Velero',
    detail: 'Every PVC in this series that needs a backup has an annotation pointing at this MinIO cluster. Velero writes cluster resources to it, Longhorn writes volume snapshots to it. The backups are S3-compatible, so they can be moved to any cloud provider without changing a single manifest.',
  },
  {
    title: 'Two hostnames, one server',
    detail: 'The MinIO console (a web UI for browsing buckets) and the S3 API (what SDKs talk to) are served by the same binary but routed on two different hostnames. The console is for humans, the API is for machines. Keeping them separate means you can lock down the API to specific services later without affecting the console.',
  },
  {
    title: 'SDKs require a root-level endpoint',
    detail: 'The S3 SDK expects the endpoint to be a bare hostname — storage.example.com, not storage.example.com/minio. If you serve the API under a path prefix, the SDK signs requests for the wrong URL and every call fails with a signature mismatch. Serving it at the root of its own subdomain is the fix.',
  },
];

const configSections = [
  {
    title: 'MINIO_ROOT_USER + MINIO_ROOT_PASSWORD',
    detail: 'The initial admin credentials. In this deployment they live in a plaintext Secret — which is fine for a lab but wrong for production. The correct pattern is an ExternalSecret from Vault, the same as every backend guide. If this MinIO is exposed beyond the cluster, the credentials must move to Vault before the first day.',
  },
  {
    title: 'MINIO_SERVER_URL',
    detail: 'The public S3 URL. This is what MinIO advertises to clients that ask "what is your canonical endpoint?" — and it is what the SDK uses to sign requests. If this is wrong, the SDK will use the wrong host in its signature and MinIO will reject it with SignatureDoesNotMatch. It must match the hostname in the IngressRoute.',
  },
  {
    title: 'MINIO_BROWSER_REDIRECT_URL',
    detail: 'The public URL of the console. When the API redirects to the console (for example, after a login), it uses this hostname. Without it, the redirect goes to the pod IP — which browsers cannot reach. It must match the console IngressRoute hostname.',
  },
  {
    title: 'Console address :9001',
    detail: 'MinIO listens on two ports: 9000 for the S3 API and 9001 for the console. The --console-address ":9001" flag tells MinIO explicitly which port to bind the console to. Without it, MinIO picks a random port and the console Service would not find it.',
  },
  {
    title: 'Recreate strategy',
    detail: 'A Deployment defaults to RollingUpdate — start a new pod, then stop the old one. For MinIO this is wrong: two pods cannot both write to the same PVC. RollingUpdate would start a second pod that fails to mount the volume (it is already in use), the new pod stays Pending, and the Service routes to two pods where one is broken. Recreate stops the old pod first.',
  },
  {
    title: 'Health endpoints',
    detail: 'MinIO exposes /minio/health/live and /minio/health/ready on port 9000. These are the only reliable way to know the service is actually up — a TCP check would pass even while MinIO is still loading data. The liveness probe uses a 60-second initial delay because MinIO takes longer than most services to become healthy.',
  },
];

const routingSections = [
  {
    title: 'Two IngressRoutes, not two Ingresses',
    detail: 'The series mostly uses the standard Ingress resource — one host, one backend. MinIO uses Traefik IngressRoute instead. Why? Because two Ingresses with the same controller, on the same namespace, pointing at two different Services of the same app, become ambiguous when a third hostname is added later. IngressRoutes are Traefik-native, unambiguous, and let you define multiple routes in a single resource if needed.',
  },
  {
    title: 'S3 API on storage.example.com',
    detail: 'The API host. Routes every request on the root path to port 9000 (the S3 API). No path prefix — the whole subdomain is dedicated to S3. This is what SDKs require: the endpoint is the hostname, and the SDK appends the bucket and object to the path.',
  },
  {
    title: 'Console on minio.example.com',
    detail: 'The console host. Routes every request on the root path to port 9001. The console is a browser UI, so a path prefix would break relative asset loading. Serving it at the root of its own subdomain keeps the URLs clean and the assets resolvable.',
  },
  {
    title: 'Two Certificates, not one',
    detail: 'Each hostname gets its own cert-manager Certificate. This is not strictly required — a single Certificate with two dnsNames would also work — but it makes the renewal state of each hostname independent. If one hostname is temporarily blocked by a DNS change, the other certificate still renews cleanly.',
  },
];

const manifests = [
  {
    name: 'Namespace',
    filename: 'namespace.yaml',
    why: 'Its own namespace. MinIO is an infrastructure service — it lives next to RabbitMQ, Redis, and Mailu, not alongside app deployments.',
    yaml: `apiVersion: v1
kind: Namespace
metadata:
  name: minio`,
  },
  {
    name: 'Secret',
    filename: 'secret.yaml',
    why: 'The MinIO root credentials. Plaintext here because this is a lab — in production, use an ExternalSecret from Vault (see the Vault guide). The password "changeme-in-production" is a deliberate placeholder: it clearly signals that this must be replaced.',
    yaml: `apiVersion: v1
kind: Secret
metadata:
  name: minio-secret
  namespace: minio
type: Opaque
stringData:
  MINIO_ROOT_USER: "minioadmin"
  MINIO_ROOT_PASSWORD: "changeme-in-production"`,
  },
  {
    name: 'PVC',
    filename: 'pvc.yaml',
    why: '10Gi on Longhorn. MinIO is a backup target for other services — the object store grows over time as Velero and Longhorn push data into it. 10Gi is a starting point; monitor and expand the PVC before it fills up, because a full MinIO is a broken backup target.',
    yaml: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-pvc
  namespace: minio
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi`,
  },
  {
    name: 'Deployment',
    filename: 'deployment.yaml',
    why: 'Single replica, Recreate strategy — the two are connected. Two pods cannot write to the same PVC. And even if they could, two MinIO instances serving the same bucket would diverge. Recreate stops the old pod first, so there is always exactly one instance.',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: minio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          imagePullPolicy: IfNotPresent
          args:
            - server
            - /data
            - --console-address
            - ":9001"
          env:
            - name: MINIO_ROOT_USER
              valueFrom:
                secretKeyRef:
                  name: minio-secret
                  key: MINIO_ROOT_USER
            - name: MINIO_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: minio-secret
                  key: MINIO_ROOT_PASSWORD
            - name: MINIO_SERVER_URL
              value: "https://storage.example.com"
            - name: MINIO_BROWSER_REDIRECT_URL
              value: "https://minio.example.com"
          ports:
            - containerPort: 9000
              name: api
              protocol: TCP
            - containerPort: 9001
              name: console
              protocol: TCP
          volumeMounts:
            - name: minio-data
              mountPath: /data
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "2"
          livenessProbe:
            httpGet:
              path: /minio/health/live
              port: 9000
            initialDelaySeconds: 60
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 6
          readinessProbe:
            httpGet:
              path: /minio/health/ready
              port: 9000
            initialDelaySeconds: 30
            periodSeconds: 15
            timeoutSeconds: 10
            failureThreshold: 6
      volumes:
        - name: minio-data
          persistentVolumeClaim:
            claimName: minio-pvc`,
  },
  {
    name: 'Service',
    filename: 'service.yaml',
    why: 'ClusterIP with two ports — 9000 for the S3 API and 9001 for the console. The two ports are what let the two IngressRoutes point at different backends on the same service. Both are internal only; the IngressRoutes expose them via TLS.',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: minio-service
  namespace: minio
spec:
  selector:
    app: minio
  ports:
    - name: api
      port: 9000
      targetPort: 9000
      protocol: TCP
    - name: console
      port: 9001
      targetPort: 9001
      protocol: TCP
  type: ClusterIP`,
  },
  {
    name: 'IngressRoute (S3 API)',
    filename: 'ingressroute-api.yaml',
    why: 'Routes storage.example.com to port 9000 (the S3 API). The match rule is Host-only — the whole subdomain belongs to MinIO. Serving S3 at a path prefix would break SDK signing because the SDK constructs URLs as https://host/bucket/object, not https://host/prefix/bucket/object.',
    yaml: `apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: minio-api
  namespace: minio
spec:
  entryPoints:
    - web
    - websecure
  routes:
    - match: Host(\`storage.example.com\`)
      kind: Rule
      services:
        - name: minio-service
          port: 9000
  tls:
    secretName: storage-tls`,
  },
  {
    name: 'IngressRoute (Console)',
    filename: 'ingressroute-console.yaml',
    why: 'Routes minio.example.com to port 9001 (the console). Same shape as the API route — different host, different port, different TLS secret. The two routes share a Service because both ports belong to the same MinIO process.',
    yaml: `apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: minio-console
  namespace: minio
spec:
  entryPoints:
    - web
    - websecure
  routes:
    - match: Host(\`minio.example.com\`)
      kind: Rule
      services:
        - name: minio-service
          port: 9001
  tls:
    secretName: minio-tls`,
  },
  {
    name: 'Certificate (S3 API)',
    filename: 'cert-api.yaml',
    why: 'cert-manager Certificate for storage.example.com. The secretName matches the tls.secretName in the API IngressRoute — that is how Traefik finds the cert. cert-manager creates the Secret automatically once the Certificate is applied and DNS is pointed at the cluster.',
    yaml: `apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: storage-tls
  namespace: minio
spec:
  secretName: storage-tls
  dnsNames:
    - storage.example.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer`,
  },
  {
    name: 'Certificate (Console)',
    filename: 'cert-console.yaml',
    why: 'cert-manager Certificate for minio.example.com. Separate from the API certificate so each hostname renews independently — if one DNS record is temporarily broken, the other cert still renews.',
    yaml: `apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: minio-tls
  namespace: minio
spec:
  secretName: minio-tls
  dnsNames:
    - minio.example.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer`,
  },
];

const gotchas = [
  {
    title: 'The S3 API must be served at the root of its subdomain',
    detail: 'S3 SDKs construct URLs as https://endpoint/bucket/object. If the endpoint has a path prefix, the SDK signs for https://endpoint/prefix/bucket/object and MinIO rejects with SignatureDoesNotMatch. The fix is not a config change — it is a routing decision. Serve the API at the root of storage.example.com, not at example.com/storage.',
  },
  {
    title: 'MINIO_SERVER_URL must match the IngressRoute hostname',
    detail: 'The value of MINIO_SERVER_URL is what MinIO advertises as its canonical endpoint. If the SDK uses a different hostname (for example, storage.example.com but MINIO_SERVER_URL says storage.default.svc.cluster.local), signatures will not match. Both must be identical — the public hostname from outside the cluster.',
  },
  {
    title: 'Recreate strategy is mandatory',
    detail: 'RollingUpdate would try to start a second MinIO pod while the first is still running. The second pod fails to mount the PVC (ReadWriteOnce + already in use), stays Pending, and the rollout hangs. Recreate stops the old pod first, so the new one can take the volume. This is the same constraint as the Uptime Kuma guide — any SQLite-on-PVC or single-writer store needs Recreate.',
  },
  {
    title: 'Plaintext credentials in a Secret are a lab default',
    detail: 'The minio-secret in this manifest has a plaintext password. In production, replace it with an ExternalSecret from Vault — the same pattern as the Node, Go, and Python guides. The Secret would then be created by ESO, not committed to Git.',
  },
  {
    title: 'cert-manager needs DNS pointed at the cluster first',
    detail: 'Both Certificates will stay in Pending until storage.example.com and minio.example.com resolve to the cluster ingress IP. Create the DNS A records before applying the Certificates. Without DNS, the Let\'s Encrypt HTTP-01 challenge cannot succeed.',
  },
  {
    title: 'IngressRoute is Traefik-specific — not portable',
    detail: 'Unlike the standard Ingress resources used elsewhere in this series, IngressRoute only works with Traefik. If you ever migrate to nginx-ingress or another controller, this manifest has to be rewritten. The standard Ingress in the Vite and Node guides is portable — this one trades portability for clarity around the multi-host routing.',
  },
];

export default function DeployMinIOPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ INFRA / MINIO ]</p>
        <h1 className={style.title}>
          DEPLOY AN<br />
          <span className={style.titleMuted}>S3 STORE</span>
        </h1>
        <p className={style.sub}>
          MinIO is your self-hosted S3. It backs up Longhorn volumes, receives
          Velero cluster snapshots, and serves any backend that thinks it is
          talking to AWS. Here is the full deployment — credentials, PVC,
          Recreate strategy, and two IngressRoutes that give the console and
          the S3 API their own hostnames.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT IS</p>
        <h2 className={style.h2}>Object storage, S3-compatible.</h2>

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
        <h2 className={style.h2}>The backup target and the file store.</h2>

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
        <p className={style.label}>// THE CONFIG DECISIONS</p>
        <h2 className={style.h2}>Six things that make MinIO work.</h2>
        <p className={style.lede}>
          Each of these is a real choice. Change one without understanding
          it, and the S3 API starts returning SignatureDoesNotMatch.
        </p>

        <div className={style.manifests}>
          {configSections.map((c, i) => (
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
        <p className={style.label}>// ROUTING</p>
        <h2 className={style.h2}>Two hostnames, one server.</h2>
        <p className={style.lede}>
          MinIO exposes two ports — the S3 API and the console. Each gets
          its own hostname, its own IngressRoute, and its own certificate.
        </p>

        <div className={style.manifests}>
          {routingSections.map((r, i) => (
            <article key={r.title} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{r.title}</h3>
              </div>
              <p className={style.manifestWhy}>{r.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// MANIFESTS</p>
        <h2 className={style.h2}>Nine files. In dependency order.</h2>
        <p className={style.lede}>
          Apply these in order. The two Certificates come last because
          they depend on DNS being pointed at the cluster. If DNS is not
          ready, they will sit in Pending until it is.
        </p>

        <div className={style.manifests}>
          {manifests.map((m, i) => (
            <article key={m.name} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{m.name}</h3>
                <span className={style.manifestFile}>{m.filename}</span>
              </div>
              <p className={style.manifestWhy}>{m.why}</p>
              <pre className={style.code}>
                <code>{m.yaml}</code>
              </pre>
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