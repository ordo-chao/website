import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'RabbitMQ is a message broker — apps publish messages, other apps consume them',
  'Uses a StatefulSet, not a Deployment — broker identity must be stable across restarts',
  'Vault ExternalSecret materializes the admin credentials and Erlang cookie',
  'Longhorn-backed PVC for the durable message store',
  'ClusterIP Service on 5672 (AMQP) and 15672 (management UI)',
  'The management UI stays internal — never exposed via Ingress by default',
];

const whyPoints = [
  {
    title: 'Asynchronous processing',
    detail: 'A REST API can respond immediately, publish the work to a queue, and let a background worker do the slow part. The user does not wait for email sending, media processing, or payment reconciliation to finish.',
  },
  {
    title: 'Decoupling between services',
    detail: 'The producer does not know who consumes the message. Adding a new consumer is a new Deployment that binds to the same queue — no changes to the producer. This is what makes Sherehe, Academia, and the billing system able to communicate without direct HTTP calls.',
  },
  {
    title: 'Backpressure handling',
    detail: 'When a downstream service is slow, messages queue up in RabbitMQ instead of overwhelming the service. Workers process at their own pace. This is why the Node backends asynchronous processing pattern works — RabbitMQ is the buffer.',
  },
  {
    title: 'Retry and dead-letter',
    detail: 'Failed messages can be retried or routed to a dead-letter queue for inspection. The alternative — a synchronous HTTP call that fails — leaves no record of what broke or who to notify.',
  },
];

const statefulVsDeployment = {
  intro: 'Every other backend in this series uses a Deployment. RabbitMQ uses a StatefulSet. That is not a stylistic choice — it is required by how RabbitMQ manages its identity.',
  points: [
    {
      title: 'Stable network identity',
      detail: 'A StatefulSet gives each pod a predictable name — rabbitmq-0, rabbitmq-1 — plus a stable DNS entry through its Service (rabbitmq.messaging.svc.cluster.local). A Deployment would give random pod names, breaking the cluster peers and breaking consumers that need to know exactly which broker they are talking to.',
    },
    {
      title: 'Ordered scaling',
      detail: 'StatefulSets start pods in order (0, then 1, then 2) and stop them in reverse order. RabbitMQ needs this for cluster formation — the first node becomes the seed, and subsequent nodes join by talking to it.',
    },
    {
      title: 'Persistent storage per replica',
      detail: 'volumeClaimTemplates creates one PVC per StatefulSet pod. With replicas: 1 there is one PVC, but if you ever scale to 3, each pod gets its own. A Deployment with the same PVC would cause all pods to fight over one volume — and RabbitMQ would corrupt.',
    },
  ],
};

const manifests = [
  {
    name: 'ExternalSecret',
    filename: 'secrets.yaml',
    why: 'Reads RabbitMQ admin credentials from Vault at secret/Infra/Rabbitmq. Note the remoteRef format — this uses explicit property lookup, not dataFrom.extract. That gives per-key control: you can pull RABBITMQ_DEFAULT_USER and RABBITMQ_DEFAULT_PASS without dumping every Vault key into the K8s Secret.',
    yaml: `apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: rabbitmq-secrets
  namespace: messaging
spec:
  refreshInterval: 1m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: rabbitmq-secrets
    creationPolicy: Owner
  data:
    - secretKey: RABBITMQ_DEFAULT_USER
      remoteRef:
        key: secret/Infra/Rabbitmq
        property: RABBITMQ_DEFAULT_USER
    - secretKey: RABBITMQ_DEFAULT_PASS
      remoteRef:
        key: secret/Infra/Rabbitmq
        property: RABBITMQ_DEFAULT_PASS`,
  },
  {
    name: 'StatefulSet',
    filename: 'statefulset.yaml',
    why: 'The RabbitMQ pod itself. Uses rabbitmq:3-management for the bundled management UI. The Erlang cookie is read from the Secret as optional: true — RabbitMQ does not need it for a single-node deployment, but multi-node clusters require it to allow nodes to authenticate to each other.',
    yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: messaging
spec:
  serviceName: "rabbitmq"
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
        - name: rabbitmq
          image: rabbitmq:3-management
          ports:
            - containerPort: 5672
              name: amqp
            - containerPort: 15672
              name: management
          env:
            - name: RABBITMQ_DEFAULT_USER
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secrets
                  key: RABBITMQ_DEFAULT_USER
            - name: RABBITMQ_DEFAULT_PASS
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secrets
                  key: RABBITMQ_DEFAULT_PASS
            - name: RABBITMQ_ERLANG_COOKIE
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secrets
                  key: RABBITMQ_ERLANG_COOKIE
                  optional: true
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "300m"
          volumeMounts:
            - name: rabbitmq-data
              mountPath: /var/lib/rabbitmq
  volumeClaimTemplates:
    - metadata:
        name: rabbitmq-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: longhorn
        resources:
          requests:
            storage: 1Gi`,
  },
  {
    name: 'Service',
    filename: 'service.yaml',
    why: 'ClusterIP — internal only. Port 5672 is AMQP (what producers and consumers connect to). Port 15672 is the management UI. Both are exposed by the Service so the StatefulSet can be reached by name from anywhere in the cluster. The UI is intentionally not Ingress-exposed — the default RabbitMQ UI is only protected by a password, and it can delete queues.',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
  namespace: messaging
spec:
  ports:
    - port: 5672
      name: amqp
      targetPort: 5672
    - port: 15672
      name: management
      targetPort: 15672
  selector:
    app: rabbitmq
  type: ClusterIP`,
  },
];

const gotchas = [
  {
    title: 'StatefulSet, not Deployment',
    detail: 'If you change this to a Deployment, the pod gets a random name and the volumeClaimTemplate does not apply. You will lose the PVC and any queued messages. The stable identity of rabbitmq-0 is what makes this deployable — it is not optional.',
  },
  {
    title: 'The Erlang cookie is required for multi-node, optional for single-node',
    detail: 'A single-node RabbitMQ works without RABBITMQ_ERLANG_COOKIE. If you ever scale to replicas: 2 or more, the cookie must match across every node — and it must be the same value across restarts. If it changes, the nodes refuse to cluster. That is why it is in Vault, not autogenerated.',
  },
  {
    title: 'The management UI is not exposed by default',
    detail: 'Port 15672 is a ClusterIP Service. To reach the UI you either port-forward (kubectl port-forward svc/rabbitmq -n messaging 15672:15672) or add an Ingress with basic auth — the same pattern as the Longhorn UI. Do not expose the raw UI publicly; the default admin account can delete queues.',
  },
  {
    title: 'Longhorn because messages are durable',
    detail: 'Unlike ephemeral caches, messages in RabbitMQ must survive a pod restart. A local-path volume would be lost on reschedule. Longhorn replicates the volume and can snapshot it — which is why this deployment uses Longhorn while the Go app used local-path.',
  },
  {
    title: 'replicas: 1 is not high availability',
    detail: 'One broker means one point of failure. For real HA you need 3 replicas with a quorum queue policy. That is a RabbitMQ configuration change, not just a replica bump — the queues must be declared as quorum, not classic. Start with 1 and plan the migration deliberately.',
  },
  {
    title: 'Memory and disk watermarks are commented out',
    detail: 'The original manifest has RABBITMQ_VM_MEMORY_HIGH_WATERMARK and RABBITMQ_DISK_FREE_LIMIT commented out. Those control when RabbitMQ starts blocking publishers because it is out of memory or disk. Under heavy load, leaving them at defaults can cause sudden blocking. Uncomment them once you have measured real usage.',
  },
];

export default function DeployRabbitMQPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ INFRA / RABBITMQ ]</p>
        <h1 className={style.title}>
          DEPLOY A<br />
          <span className={style.titleMuted}>MESSAGE BROKER</span>
        </h1>
        <p className={style.sub}>
          RabbitMQ is the async backbone. Producers publish work to it,
          consumers process at their own pace, and nothing blocks on a slow
          service. Here is the full deployment — Vault credentials, a
          StatefulSet with a Longhorn volume, and a ClusterIP Service on
          AMQP and management ports.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT IS</p>
        <h2 className={style.h2}>The queue between your services.</h2>

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
        <h2 className={style.h2}>Why not just call the service directly?</h2>

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
        <p className={style.label}>// STATEFULSET VS DEPLOYMENT</p>
        <h2 className={style.h2}>Why not a Deployment like the others?</h2>
        <p className={style.lede}>{statefulVsDeployment.intro}</p>

        <div className={style.manifests}>
          {statefulVsDeployment.points.map((p, i) => (
            <article key={p.title} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{p.title}</h3>
              </div>
              <p className={style.manifestWhy}>{p.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// MANIFESTS</p>
        <h2 className={style.h2}>Three files. In dependency order.</h2>
        <p className={style.lede}>
          Apply in this order the first time. The ExternalSecret must exist
          before the StatefulSet — otherwise the pod starts with empty
          credentials and RabbitMQ refuses to boot.
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