import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const overviewPoints = [
  'Uptime Kuma is a self-hosted uptime monitoring tool — a "ping checker" with a UI.',
  'It runs periodic HTTP, TCP, DNS, and ICMP checks against your services.',
  'Each monitor records uptime %, response time, and certificate expiry.',
  'When a check fails, it can notify via email, Slack, Discord, Telegram, and 80+ other channels.',
  'It stores its state in a single SQLite database file inside the data volume.',
  'In this cluster, it is what tells you the sites are actually reachable from outside.',
];

const whyPoints = [
  {
    title: 'Prometheus answers "is it healthy?" — Uptime Kuma answers "is it reachable?"',
    detail: 'Prometheus scrapes from inside the cluster. Uptime Kuma sends checks from outside, through DNS, TLS, and the ingress — exactly as a real user would. A service can be healthy in Prometheus and still be down to the public because of a broken ingress or expired certificate.',
  },
  {
    title: 'Certificate and domain expiry monitoring',
    detail: 'One of the most common production outages is a forgotten certificate. Uptime Kuma monitors TLS expiry per host and alerts before it becomes an outage. Prometheus can do this too, but it requires an exporter; Uptime Kuma gets it for free per monitor.',
  },
  {
    title: 'Simple notification routing',
    detail: 'Each monitor can route to a different channel. Database down → PagerDuty. Marketing site slow → Slack. This per-monitor granularity means you do not have to build that routing into your alerting pipeline.',
  },
  {
    title: 'A status page your users can read',
    detail: 'Uptime Kuma can publish a public status page. That means when someone asks "is the site down?", there is a real answer with a timeline — without needing to expose Prometheus.',
  },
];

const manifestSections = [
  {
    title: 'PVC on Longhorn (3Gi)',
    detail: 'Same storage class used by the other stateful apps on this cluster. 3Gi is generous for SQLite — a Uptime Kuma instance with 100 monitors and 1 year of history is typically under 200MB. The extra space is headroom for future monitors.',
  },
  {
    title: 'strategy: Recreate',
    detail: 'This is the important one. The default RollingUpdate strategy starts the new pod before the old one stops. Two pods, one SQLite file → "database is locked" immediately. Recreate ensures the old pod stops first. The comment in the manifest is the actual reason — this is not a stylistic choice.',
  },
  {
    title: 'fsGroup: 1000',
    detail: 'The Longhorn volume is mounted as root by default. The container runs as UID 1000. Without fsGroup, the pod cannot write to /app/data and crashes on first write. fsGroup: 1000 tells Kubernetes to chown the mount to GID 1000 — a detail every Longhorn-based persistent app has to get right.',
  },
  {
    title: 'PUID / PGID env vars',
    detail: 'Uptime Kuma reads these to determine which user to run as inside the container. Setting both to 1000 matches the fsGroup, so file ownership and process UID agree.',
  },
  {
    title: 'Readiness + liveness probes',
    detail: 'Unlike some of the other deployments in this cluster, both probes are enabled. A slow-starting instance is not marked Ready (traffic avoided) and a hung instance is restarted (traffic recovered). This is the correct baseline.',
  },
  {
    title: 'Service — ClusterIP',
    detail: 'Internal only. Traffic comes through the Ingress. The Service exposes port 80 externally and forwards to 3001 — so the URL never exposes the internal port number.',
  },
  {
    title: 'Ingress — no explicit ingressClass',
    detail: 'Unlike the other deployments in this cluster, this Ingress does not set `kubernetes.io/ingress.class`. It relies on the cluster having Traefik as its default. That works — but if you ever install a second ingress controller, this Ingress becomes ambiguous.',
  },
];

const gotchas = [
  {
    title: 'Recreate is mandatory for SQLite on a single PVC',
    detail: 'If you change this to RollingUpdate, you will hit "database is locked" during every deploy. The DB file is on a ReadWriteOnce PVC, so two pods cannot mount it simultaneously anyway — but the schedule of the failure is what matters: RollingUpdate tries, fails, and leaves the Service in a broken half-updated state. Recreate is the correct strategy.',
  },
  {
    title: 'fsGroup is what makes the volume writable',
    detail: 'The Longhorn mount is root-owned by default. The container runs as UID 1000. Without fsGroup: 1000, /app/data is not writable and the container fails during its first database initialization with an opaque "unable to open database file" error.',
  },
  {
    title: 'Uptime Kuma\'s data is one file — back it up',
    detail: 'The entire state (monitors, notifications, history, users) lives at /app/data inside the PVC. Longhorn backs up the volume, so this is covered — but if you ever migrate off Longhorn, the backup is the PVC, not the pod.',
  },
  {
    title: 'Notifying on certificate expiry requires the monitor to be HTTPS',
    detail: 'Uptime Kuma checks cert expiry only for HTTPS monitors. If you add a monitor as plain HTTP, the certificate panel is empty — that is not a bug, it is expected behavior. Use HTTPS monitors for any host you want cert alerts on.',
  },
  {
    title: 'A monitor down is not the same as a service down',
    detail: 'Uptime Kuma tells you the endpoint is unreachable. It does not tell you why. A 500 response, a DNS failure, and a dead container all look identical from Uptime Kuma\'s perspective. That is why it complements Prometheus and Grafana — Uptime Kuma detects "not reachable", Grafana explains "why".',
  },
  {
    title: 'The Service port and container port are different on purpose',
    detail: 'Service port 80 maps to container port 3001. That is why the Ingress references port 80 — which is what lets the URL work without any port suffix. If you set the Service port to 3001, users would need kuma.example.com:3001 for HTTP access.',
  },
];

export default function DeployUptimeKumaPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ OBSERVABILITY / UPTIME KUMA ]</p>
        <h1 className={style.title}>
          WHAT IS<br />
          <span className={style.titleMuted}>UPTIME KUMA?</span>
        </h1>
        <p className={style.sub}>
          Uptime Kuma is what tells you the site is actually reachable — from
          outside the cluster, through DNS, TLS, and the ingress. Prometheus
          and Grafana monitor the internals. Uptime Kuma watches the surface
          your users see. Here is what it does, why it is on this cluster, and
          the manifest that deploys it.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT UPTIME KUMA IS</p>
        <h2 className={style.h2}>A self-hosted ping checker with a UI.</h2>
        <p className={style.lede}>
          Uptime Kuma is an easy-to-use self-hosted monitoring tool. It sends
          scheduled HTTP, TCP, DNS, and ICMP checks against your endpoints and
          records uptime, response time, and TLS certificate status. When
          something fails, it notifies you — via email, Slack, Discord,
          Telegram, or any of 80+ integration channels.
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
        <h2 className={style.h2}>The gap Prometheus does not cover.</h2>

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
        <p className={style.label}>// THE MANIFESTS</p>
        <h2 className={style.h2}>Four resources. Three deployment decisions.</h2>
        <p className={style.lede}>
          PVC, Deployment, Service, Ingress. Standard shape — but three lines in
          this manifest are load-bearing, and the rest are defaults that could
          be tightened.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Uptime Kuma — full manifest</h3>
              <span className={style.manifestFile}>uptime-kuma.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: uptime-kuma-data
  namespace: uptime-kuma
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 3Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uptime-kuma
  namespace: uptime-kuma
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: uptime-kuma
  template:
    metadata:
      labels:
        app: uptime-kuma
    spec:
      securityContext:
        fsGroup: 1000
      containers:
        - name: uptime-kuma
          image: louislam/uptime-kuma:2.0.2
          ports:
            - containerPort: 3001
          env:
            - name: PUID
              value: "1000"
            - name: PGID
              value: "1000"
          volumeMounts:
            - name: data
              mountPath: /app/data
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "200m"
          readinessProbe:
            httpGet:
              path: /
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 20
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: uptime-kuma-data
---
apiVersion: v1
kind: Service
metadata:
  name: uptime-kuma
  namespace: uptime-kuma
spec:
  type: ClusterIP
  selector:
    app: uptime-kuma
  ports:
    - port: 80
      targetPort: 3001
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: uptime-kuma-ingress
  namespace: uptime-kuma
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
spec:
  rules:
    - host: kuma.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: uptime-kuma
                port:
                  number: 80
  tls:
    - hosts:
        - kuma.example.com
      secretName: uptime-kuma-tls`}</code>
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