import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'Redis is an in-memory data store used as a cache, queue, and session store',
  'Config lives in a ConfigMap, mounted as redis.conf via subPath',
  'AOF (append-only file) is enabled for durability — every write survives a restart',
  'Longhorn PVC for the AOF file and RDB snapshots',
  'Deployment with replica: 1, ClusterIP Service on port 6379',
  'Readiness and liveness probes both use redis-cli ping',
];

const whyPoints = [
  {
    title: 'Fast ephemeral reads',
    detail: 'Redis holds hot data in memory. Session tokens, rate-limit counters, and BullMQ job queues all live here because reading from Redis is microseconds instead of milliseconds. Every backend in this series that touches state at request time ends up calling Redis.',
  },
  {
    title: 'Durable when configured',
    detail: 'Redis is often described as "in-memory, so it loses data." That is only true with the default configuration. With appendonly yes and appendfsync everysec, every write lands in the AOF file within one second. A pod restart no longer loses the queue.',
  },
  {
    title: 'Shared state between replicas',
    detail: 'If you scale a backend to 3 replicas, session state has to live somewhere both replicas can see. Redis is that somewhere. Without it, every replica has its own in-memory session store, and the user gets logged out on every load-balanced request.',
  },
  {
    title: 'Queue backend for BullMQ',
    detail: 'BullMQ — used in several of the Node and Go services — is a Redis-native queue. It stores job state, retry counters, and scheduling in Redis. This is why the Node and Go guides can run background workers that survive restarts — the queue itself is persisted.',
  },
];

const configSections = [
  {
    title: 'appendonly yes',
    detail: 'This is the durability decision. Without it, Redis only writes an RDB snapshot every 15 minutes (or on shutdown). A pod restart between snapshots loses every write since the last save. With AOF on, every SET, LPUSH, and HSET is appended to a file within one second. For a cache, this is overkill. For a queue, it is mandatory.',
  },
  {
    title: 'appendfsync everysec',
    detail: 'The fsync policy. options: always (every write, slowest), everysec (once per second, default trade-off), no (let the OS decide). everysec is the correct default — it bounds data loss to at most 1 second while keeping throughput high. If you need zero loss, use always; you will lose ~90% of throughput.',
  },
  {
    title: 'save 900 1 / 300 10 / 60 10000',
    detail: 'RDB snapshot triggers. Save a snapshot if 1 key changed in 900s, 10 keys in 300s, or 10000 keys in 60s. These are defaults from Redis 7. They provide a second layer of durability on top of AOF — snapshots are faster to load on cold start than replaying a full AOF. Keep them.',
  },
  {
    title: 'maxmemory 256mb',
    detail: 'Hard cap on Redis memory usage. Without it, Redis grows unbounded until the pod is OOM-killed by Kubernetes. The 256mb value matches the container memory request. If you raise the request to 512Mi, raise maxmemory to 384mb or 448mb — leave headroom for the Redis process itself and the AOF buffers.',
  },
  {
    title: 'maxmemory-policy allkeys-lru',
    detail: 'When maxmemory is reached, evict the least recently used key across all keys. The alternative policy noeviction would make every SET fail once memory is full — fine for a queue (you want backpressure), wrong for a cache (you want eviction). This choice signals that Redis is being used as a cache here, not as durable storage.',
  },
  {
    title: 'bind 0.0.0.0',
    detail: 'Listen on all interfaces. Inside a Kubernetes pod this is correct — the pod has one interface and the Service routes to it. Do not put a Redis on the public internet with this config; it would be scanned and exploited within minutes. This Redis is ClusterIP-only, reachable only from inside the cluster.',
  },
  {
    title: 'timeout 0',
    detail: 'Never disconnect idle clients. Set to 0 for long-lived connections like BullMQ workers, which idle between jobs. If this were 300, workers would be disconnected mid-queue and have to reconnect on every job — causing retries and duplicate processing.',
  },
];

const manifests = [
  {
    name: 'Namespace',
    filename: 'namespace.yaml',
    why: 'Its own namespace. Redis is an infrastructure service — it belongs next to RabbitMQ and Mailu, not alongside app deployments.',
    yaml: `apiVersion: v1
kind: Namespace
metadata:
  name: redis`,
  },
  {
    name: 'ConfigMap',
    filename: 'configmap.yaml',
    why: 'The full redis.conf is declared here. It is mounted into the container as a file via subPath — not as a directory mount — so Redis reads it as a normal file at /usr/local/etc/redis/redis.conf. SubPath mounting means the file is copied at pod start; updating the ConfigMap requires a pod restart to take effect.',
    yaml: `apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  namespace: redis
data:
  redis.conf: |
    # Network
    port 6379
    bind 0.0.0.0

    # Persistence
    appendonly yes
    appendfsync everysec

    # Save points
    save 900 1
    save 300 10
    save 60 10000

    # Memory management
    maxmemory 256mb
    maxmemory-policy allkeys-lru

    # Performance
    tcp-keepalive 300
    timeout 0`,
  },
  {
    name: 'PVC (Longhorn)',
    filename: 'pvc.yaml',
    why: '5Gi on Longhorn. Redis data is small — 256mb maxmemory plus AOF and RDB files rarely exceeds 1Gi. The extra space is headroom for AOF growth during bursts. Longhorn (not local-path) because Redis is a queue backend here — losing the AOF on node failure would lose pending jobs.',
    yaml: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: redis
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 5Gi`,
  },
  {
    name: 'Deployment',
    filename: 'deployment.yaml',
    why: 'One replica. Redis is single-writer — scaling to 2 replicas would give you two independent Redis instances with diverging state, not a cluster. If you need HA, the correct pattern is Redis Sentinel or Redis Cluster, which are different charts. The config mount uses subPath: redis.conf to mount just the file, not the whole ConfigMap directory.',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 6379
              name: redis-port
              protocol: TCP
          command:
            - redis-server
          args:
            - /usr/local/etc/redis/redis.conf
          volumeMounts:
            - name: redis-config
              mountPath: /usr/local/etc/redis/redis.conf
              subPath: redis.conf
            - name: redis-data
              mountPath: /data
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "200m"
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          livenessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
        - name: redis-data
          persistentVolumeClaim:
            claimName: redis-pvc`,
  },
  {
    name: 'Service',
    filename: 'service.yaml',
    why: 'ClusterIP — internal only. Redis is never exposed to the internet. Any service that needs it connects via redis-service.redis.svc.cluster.local:6379. sessionAffinity: None is the default and correct — Redis is stateless from the client perspective (all clients connect to the same instance and see the same data).',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: redis
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
      protocol: TCP
      name: redis
  type: ClusterIP
  sessionAffinity: None`,
  },
];

const gotchas = [
  {
    title: 'Redis is single-writer — replicas: 1 is not a limitation',
    detail: 'Unlike a web app, Redis cannot run 3 replicas behind a Service and share state. Every replica would have its own in-memory store and its own AOF file. Scaling this Deployment to 2 does not give you twice the capacity — it gives you two independent Redises where clients see whichever one the Service routes them to. If you need more, use Redis Sentinel or Redis Cluster, which are separate charts.',
  },
  {
    title: 'maxmemory must be below the container limit',
    detail: 'The container limit is 512Mi, maxmemory is 256mb. The gap is intentional — Redis needs memory for the process, AOF buffers, and client connections. If maxmemory exceeded the container limit, Redis would try to allocate beyond what Kubernetes allows and get OOM-killed before the eviction policy could run.',
  },
  {
    title: 'appendonly yes costs throughput — but you need it',
    detail: 'AOF adds a write to disk on every command. For a pure cache, this is wasted work — set appendonly no and rely on RDB snapshots. For a queue backend (BullMQ, session store, rate limiter), you must keep AOF on. If you turn it off, pending jobs vanish on pod restart and BullMQ retries never fire.',
  },
  {
    title: 'subPath mounting does not auto-update',
    detail: 'The ConfigMap is mounted with subPath: redis.conf — meaning Redis reads it as a file. When the ConfigMap changes, the mounted file does NOT update. Kubernetes will not replace it until the pod restarts. If you edit redis.conf, run kubectl rollout restart deployment/redis -n redis to pick up the change.',
  },
  {
    title: 'allkeys-lru evicts your queue if you exceed maxmemory',
    detail: 'allkeys-lru means: when memory is full, evict the least recently used key. If Redis is being used for both cache and queue, and the cache grows, LRU can evict queue keys that have not been touched recently — silently losing pending jobs. The correct pattern is separate Redis instances for cache and queue, or noeviction with careful monitoring.',
  },
  {
    title: 'redis-cli ping is the right probe — but only for readiness',
    detail: 'Both probes use redis-cli ping. That answers "is Redis responding to commands?" It does not answer "is Redis fully loaded?" — a Redis replaying a large AOF at startup will respond to PING while still loading data. The 30-second liveness initialDelaySeconds gives it time. If your AOF grows past 1Gi, raise that delay.',
  },
];

export default function DeployRedisPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ INFRA / REDIS ]</p>
        <h1 className={style.title}>
          DEPLOY A<br />
          <span className={style.titleMuted}>REDIS CACHE</span>
        </h1>
        <p className={style.sub}>
          Redis is the fast, durable layer between your apps and the disk.
          Sessions, queues, rate-limit counters, and BullMQ job state all live
          here. Here is the full deployment — ConfigMap-driven config, a
          Longhorn PVC, and the single-replica constraint that makes Redis
          different from every other backend in this series.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT IS</p>
        <h2 className={style.h2}>The shared state your apps need.</h2>

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
        <h2 className={style.h2}>Four jobs Redis does in this stack.</h2>

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
        <p className={style.label}>// THE CONFIG FILE</p>
        <h2 className={style.h2}>Seven lines that decide durability.</h2>
        <p className={style.lede}>
          The redis.conf is short but every directive matters. Change one
          without understanding it and Redis becomes either lossy or slow.
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
        <p className={style.label}>// MANIFESTS</p>
        <h2 className={style.h2}>Five files. In dependency order.</h2>
        <p className={style.lede}>
          Apply these in order. The ConfigMap and PVC must exist before the
          Deployment, or the pod will stay Pending while Kubernetes waits for
          the volumes.
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