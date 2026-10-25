import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'Gunicorn as the WSGI runtime — not the Django dev server',
  'An entrypoint script that waits for Postgres, migrates, then execs gunicorn',
  'A background listener process started alongside the WSGI server',
  'Vault secrets via a plain ExternalSecret — one key per env var',
  'Postgres on a default PVC (no Longhorn annotation)',
  'Rate-limited Traefik Ingress with cert-manager TLS',
];

const dockerfile = {
  name: 'Dockerfile',
  why: 'Python + Postgres has a specific build cost: psycopg2 needs libpq and gcc to compile. Those go in build-time, not runtime. The runtime ships gunicorn and only the packages requirements.txt actually needs. The entrypoint script is the migration hook — it runs at container start, waits for Postgres, applies migrations, then execs gunicorn.',
  code: `# Use an official Python runtime as a parent image
FROM python:3.12-slim

# PYTHONDONTWRITEBYTECODE: Prevents Python from writing pyc files to disk
# PYTHONUNBUFFERED: Prevents Python from buffering stdout and stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# netcat (nc) for the entrypoint script to check DB connection
# build-essential and libpq-dev for psycopg2 compilation
RUN apt-get update && apt-get install -y \\
    netcat-openbsd \\
    gcc \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies first (for caching)
COPY requirements.txt /app/

RUN pip install --upgrade pip \\
    && pip install --no-cache-dir -r requirements.txt \\
    && if ! grep -q "djangorestframework" requirements.txt; then pip install djangorestframework; fi

RUN pip install gunicorn

COPY . /app/

# Copy the entrypoint script and make it executable
COPY ./entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["gunicorn", "myapp.wsgi:application", "--bind", "0.0.0.0:3007"]`,
};

const entrypoint = {
  name: 'entrypoint.sh',
  why: 'The entrypoint is where the Django stack handles its pre-start work. It does three things: waits for Postgres to accept TCP connections, runs `manage.py migrate` (which fails-closed if a migration is broken), then starts a background listener process. Only after all three does it exec the CMD — which is gunicorn. The `exec "$@"` line is the load-bearing one: it replaces the shell with gunicorn, so signals reach the WSGI server directly and shutdown is clean.',
  code: `#!/bin/bash
set -e

echo "Waiting for postgres at \${DB_HOST}:\${DB_PORT}..."

until nc -z "\$DB_HOST" "\$DB_PORT"; do
  sleep 1
done

echo "PostgreSQL started"

echo "Running migrations..."
python manage.py migrate

echo "Starting listeners..."
python manage.py start_listeners &

exec "$@"`,
};

const secretsFlow = [
  {
    step: '01',
    title: 'Vault stores the secret',
    detail: 'Every value the app needs lives at Services/MyApp/prod in Vault: DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD, plus anything else the app reads.',
  },
  {
    step: '02',
    title: 'ExternalSecret materializes each key',
    detail: 'A plain ExternalSecret (no templating) reads the Vault entry and creates a K8s Secret named myapp-db-secrets. Every key in Vault becomes a key in the Secret.',
  },
  {
    step: '03',
    title: 'The Deployment consumes both sources',
    detail: 'envFrom pulls both myapp-config (ConfigMap) and myapp-db-secrets (Secret) into the container environment. Every key becomes an env var — no per-key secretKeyRef needed.',
  },
  {
    step: '04',
    title: 'Django and the entrypoint both see them',
    detail: 'Django settings read DB_HOST, DB_NAME, etc. via os.environ. The entrypoint script reads the same env vars for the nc wait and migrate commands. Same source of truth, two consumers.',
  },
];

const manifests = [
  {
    name: 'Namespace',
    filename: 'namespace.yaml',
    why: 'Its own namespace, myapp. Standard.',
    yaml: `apiVersion: v1
kind: Namespace
metadata:
  name: myapp`,
  },
  {
    name: 'ExternalSecret',
    filename: 'secrets.yaml',
    why: 'Uses external-secrets.io/v1beta1 — a slightly different API version than the Node and Go manifests. Both are valid; v1beta1 is the stable form. The dataFrom.extract pattern dumps every key from the Vault path into the Secret.',
    yaml: `apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-db-secrets
  namespace: myapp
spec:
  refreshInterval: 1m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: myapp-db-secrets
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: Services/MyApp/prod`,
  },
  {
    name: 'ConfigMap',
    filename: 'configmap.yaml',
    why: 'Non-sensitive values. Notice POSTGRES_HOST is just "myapp-postgres-service" — short form. Kubernetes resolves that within the same namespace. That works fine here but would break if the app were ever moved to a different namespace, so the short form is a signal to look at: what namespace is this app actually in?',
    yaml: `apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: myapp
data:
  PORT: "3007"
  POSTGRES_HOST: "myapp-postgres-service"
  POSTGRES_PORT: "5432"
  NODE_ENV: "production"`,
  },
  {
    name: 'PVC',
    filename: 'pvc.yaml',
    why: 'Unlike the Node guide (Longhorn) and the Go guide (local-path), this PVC specifies no storageClassName at all. It inherits the cluster default. That works, but it means the storage class is invisible to anyone reading the manifest — a maintenance hazard if the cluster default ever changes.',
    yaml: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-postgres-pvc
  namespace: myapp
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi`,
  },
  {
    name: 'Postgres Deployment',
    filename: 'deployment.yaml (db)',
    why: 'Standard Postgres 15-alpine. Note that POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD come from secretKeyRef individually — not envFrom. That is because envFrom would set every key in the Secret as an env var, and Postgres only reads the POSTGRES_* prefixed ones. Using secretKeyRef is more explicit.',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-postgres
  namespace: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp-postgres
  template:
    metadata:
      labels:
        app: myapp-postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: TZ
              value: "UTC"
            - name: POSTGRES_DB
              valueFrom:
                secretKeyRef:
                  name: myapp-db-secrets
                  key: DATABASE_NAME
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: myapp-db-secrets
                  key: DATABASE_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: myapp-db-secrets
                  key: DATABASE_PASSWORD
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: myapp-postgres-pvc`,
  },
  {
    name: 'Postgres Service',
    filename: 'service.yaml (db)',
    why: 'ClusterIP — internal only. Standard.',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: myapp-postgres-service
  namespace: myapp
spec:
  selector:
    app: myapp-postgres
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP`,
  },
  {
    name: 'App Deployment',
    filename: 'deployment.yaml (app)',
    why: 'envFrom pulls both the ConfigMap and the Secret. Note the readinessProbe is commented out — that means Kubernetes will consider the pod "Ready" the moment the container starts, even before gunicorn has finished binding. That is a real risk: during rollouts, traffic can hit a pod that is not yet serving. Uncomment the probe before production.',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
  labels:
    smart-restart.io/enabled: "true"
  annotations:
    smart-restart.io/max-retries: "3"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      imagePullSecrets:
        - name: ghcr-secret
      containers:
        - name: myapp
          image: ghcr.io/example-org/myapp:55b369c6
          imagePullPolicy: Always
          ports:
            - containerPort: 3007
          envFrom:
            - configMapRef:
                name: myapp-config
            - secretRef:
                name: myapp-db-secrets`,
  },
  {
    name: 'App Service',
    filename: 'service.yaml (app)',
    why: 'NodePort 30007. Fixed so it does not collide with the other NodePort apps on the cluster.',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: myapp-service
  namespace: myapp
spec:
  selector:
    app: myapp
  type: NodePort
  ports:
    - port: 3007
      targetPort: 3007
      nodePort: 30007`,
  },
  {
    name: 'Ingress',
    filename: 'ingress.yaml',
    why: 'Two differences from the earlier examples. First, the backend service reference is `myapp-service` — the Ingress must match the Service name in the same namespace. Second, it uses the shared rate-limit middleware annotation, exactly like the Go guide.',
    yaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: myapp
  annotations:
    kubernetes.io/ingress.class: "traefik"
    traefik.ingress.kubernetes.io/router.entrypoints: web, websecure
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.middlewares: kube-system-global-ratelimit@kubernetescrd
spec:
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-service
                port:
                  number: 3007
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls`,
  },
];

const gotchas = [
  {
    title: 'Ingress service name must match the Service',
    detail: 'The Ingress references `myapp-service` — that Service must exist in `myapp` and have exactly that name. Traefik will apply the Ingress and return 404 if it cannot resolve the backend. This is the bug you find at 11 PM.',
  },
  {
    title: 'Readiness probe is commented out',
    detail: 'Without a readinessProbe, Kubernetes considers the pod Ready immediately after the container starts. During a rolling update, traffic can be sent to a pod that has not yet started gunicorn. Uncomment the probe and add a livenessProbe before this reaches production.',
  },
  {
    title: 'exec "$@" is what makes shutdown clean',
    detail: 'If the entrypoint script ended with `gunicorn ...` (without exec), the shell would be PID 1 and gunicorn would be a child. When Kubernetes sends SIGTERM, the shell receives it, not gunicorn — and in-flight requests get killed. exec replaces the shell with gunicorn so signals reach the right process.',
  },
  {
    title: 'PVC has no storageClassName',
    detail: 'This PVC does not specify a storage class, so it uses the cluster default. If the cluster default ever changes, new PVCs will silently end up on different storage than old ones. Declare the storage class explicitly — even if it matches today\'s default.',
  },
  {
    title: 'Background listeners in the entrypoint need their own supervision',
    detail: '`python manage.py start_listeners &` runs as a background job inside the container. If it crashes, the container keeps running — Kubernetes only knows about the main gunicorn process. Consider a supervisor or a separate Deployment for the listener.',
  },
  {
    title: 'The Dockerfile installs djangorestframework conditionally',
    detail: 'The line `if ! grep -q "djangorestframework" requirements.txt; then pip install djangorestframework; fi` means the framework is installed even when it is not in requirements.txt. That is convenient but hides a missing dependency. It should be in requirements.txt — then this fallback can be deleted.',
  },
];

export default function DeployPythonPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ DEPLOY / PYTHON + POSTGRES ]</p>
        <h1 className={style.title}>
          DEPLOY A<br />
          <span className={style.titleMuted}>DJANGO API + DB</span>
        </h1>
        <p className={style.sub}>
          Python deployments have their own shape: gunicorn is the runtime,
          an entrypoint script handles the wait-for-db + migrate + exec pattern,
          and background listeners run alongside the WSGI process. Here is the
          full <span className={style.strong}>myapp</span> stack — Dockerfile,
          entrypoint, manifests, and the two bugs lurking in it.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT NEEDS</p>
        <h2 className={style.h2}>The shape of a Django + Postgres deploy.</h2>

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
        <p className={style.label}>// BUILD ARTIFACT</p>
        <h2 className={style.h2}>The Dockerfile.</h2>
        <p className={style.lede}>
          Python needs build-time system packages for psycopg2. Everything
          else — gunicorn, the entrypoint — is Python-level.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>{dockerfile.name}</h3>
              <span className={style.manifestFile}>Dockerfile</span>
            </div>
            <p className={style.manifestWhy}>{dockerfile.why}</p>
            <pre className={style.code}>
              <code>{dockerfile.code}</code>
            </pre>
          </article>
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// ENTRYPOINT</p>
        <h2 className={style.h2}>Wait, migrate, exec.</h2>
        <p className={style.lede}>
          The entrypoint is where Django handles pre-start work. It is the
          equivalent of the migration initContainer in the Node/Go backends —
          but implemented inside the container instead of beside it.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>{entrypoint.name}</h3>
              <span className={style.manifestFile}>entrypoint.sh</span>
            </div>
            <p className={style.manifestWhy}>{entrypoint.why}</p>
            <pre className={style.code}>
              <code>{entrypoint.code}</code>
            </pre>
          </article>
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// SECRETS FLOW</p>
        <h2 className={style.h2}>How Vault gets to Django.</h2>

        <div className={style.pipeline}>
          {secretsFlow.map(v => (
            <div key={v.step} className={style.pipelineStep}>
              <span className={style.stepNum}>{v.step}</span>
              <div>
                <h3 className={style.stepTitle}>{v.title}</h3>
                <p className={style.stepDetail}>{v.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// MANIFESTS</p>
        <h2 className={style.h2}>In dependency order.</h2>

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