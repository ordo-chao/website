import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'Multi-stage Go build — compiled binary in a tiny Alpine runtime',
  'Goose migrations baked into the image, not the app code',
  'Vault templating generates a literal .env file — Go does not read env vars like Node',
  'Postgres with local-path storage (this app does not need Longhorn)',
  'Rate limiting via a Traefik middleware reference',
  'Traefik Ingress with cert-manager TLS',
];

const dockerfile = {
  name: 'Dockerfile',
  why: 'Two stages. The builder installs git (goose needs it), downloads modules, installs goose, then compiles a statically linked binary with `CGO_ENABLED=0`. The runtime image is alpine with only ca-certificates, the goose binary, the compiled app, and the SQL migrations. Result: a ~30 MB image with no Go toolchain inside.',
  code: `# Stage 1: Build the Go application
FROM golang:1.26-alpine AS builder

# Install git (required for go install/download)
RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

# Now this will work because git is available
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o main -ldflags "-s -w" .

# Stage 2: Final runtime image
FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates

# Copy goose binary
COPY --from=builder /go/bin/goose /usr/local/bin/goose

# Copy the compiled Go binary
COPY --from=builder /app/main .

# Copy migration files
COPY internal/sql /app/internal/sql

EXPOSE 3006

CMD ["/bin/sh", "-c", "goose -dir /app/internal/sql postgres \\"user=\${DB_USER} password=\${DB_PASSWORD} host=\${DB_HOST} port=\${DB_PORT} dbname=\${DB_NAME} sslmode=disable\\" up && ./main"]`,
};

const migrations = {
  title: 'Why Goose in the container?',
  points: [
    'The migration runner ships with the app — no separate Job, no CI step, no drift between "app is deployed" and "schema is deployed".',
    'Goose runs at container start via the CMD. It applies any pending migrations, then execs ./main.',
    'The command uses `&&` not `;` — if migrations fail, the app does not start. Fail-closed by design.',
    'Migration files live at /app/internal/sql inside the image. The version of the schema is tied to the version of the image.',
    'The DB connection string is built from env vars the Deployment already provides (from Vault). No extra credential path.',
  ],
};

const envDifference = {
  title: 'Why Go needs a .env file (and Node does not)',
  intro: 'Node and Go handle secrets in the container differently. Both have valid reasons — but they require different Kubernetes manifests. If you copy the Node pattern into a Go service, the app will read empty strings and fail with cryptic "connection refused" errors.',
  comparison: [
    {
      runtime: 'Node.js',
      how: 'Node reads environment variables directly at runtime via `process.env.DATABASE_URL`. Every value exists in the process environment because the Deployment used `envFrom.secretRef` — one K8s Secret key becomes one env var.',
      manifest: 'envFrom:\n  - secretRef:\n      name: myapp-db-secrets',
      result: 'The app works. `process.env` has every key from the Secret.',
    },
    {
      runtime: 'Go',
      how: 'A Go binary reads config however the app was written to read it. Most Go services use a library like `godotenv` or `viper` that expects a `.env` file at a known path. `os.Getenv()` works too — but only if the Deployment populates the env vars individually, not via envFrom.',
      manifest: 'volumeMounts:\n  - mountPath: /app/.env\n    subPath: .env',
      result: 'The app reads /app/.env as a file. Without it, the binary starts with empty config.',
    },
  ],
  whyNotEnvFrom: 'The reason Go needs the .env file here is that the app was written to load config from a file — not because Go is incapable of reading env vars. `os.Getenv("DATABASE_URL")` works in Go. But if the app uses `godotenv.Load()` at startup, only the file path works.',
  whyTemplate: 'The templated ExternalSecret assembles the .env file from individual Vault keys. Without templating, you would get a K8s Secret with one key per value — and no way to mount them as a single coherent file. Templating produces one key, `.env`, whose content is the full file.',
};

const vaultTemplate = {
  name: 'Vault ExternalSecret with templating',
  why: 'This is a step beyond the simple ExternalSecret used by the Node and Python guides. Instead of materializing each secret as a separate K8s key, this uses engineVersion: v2 templating to assemble a single literal .env file from many Vault values. The Secret then holds one key: .env. The Deployment mounts that key as /app/.env via subPath. The result: the Go app reads its config from a real .env file exactly as it would locally — but the values came from Vault, never from Git.',
  yaml: `apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-vault-secrets
  namespace: myapp
spec:
  refreshInterval: 1m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: myapp-secrets
    creationPolicy: Owner
    template:
      engineVersion: v2
      mergePolicy: Merge
      data:
        .env: |
          SERVER_PORT={{ .SERVER_PORT }}
          SERVER_HOST={{ .SERVER_HOST }}
          DATABASE_USER={{ .DATABASE_USER }}
          DATABASE_PASSWORD={{ .DATABASE_PASSWORD }}
          DATABASE_HOST={{ .DATABASE_HOST }}
          DATABASE_PORT={{ .DATABASE_PORT }}
          DATABASE_NAME={{ .DATABASE_NAME }}
          JWT_SECRET={{ .JWT_SECRET }}
          RABBITMQ_HOST={{ .RABBITMQ_HOST }}
          RABBITMQ_PORT={{ .RABBITMQ_PORT }}
          RABBITMQ_USER={{ .RABBITMQ_USER }}
          RABBITMQ_PASSWORD={{ .RABBITMQ_PASSWORD }}
          RABBITMQ_EXCHANGE_NAME={{ .RABBITMQ_EXCHANGE_NAME }}
  dataFrom:
    - extract:
        key: Services/MyApp/prod`,
};

const manifests = [
  {
    name: 'Namespace',
    filename: 'namespace.yaml',
    why: 'Its own namespace, like every other app. Everything below lives in myapp.',
    yaml: `apiVersion: v1
kind: Namespace
metadata:
  name: myapp`,
  },
  {
    name: 'PVC (local-path)',
    filename: 'pvc.yaml',
    why: 'Unlike the Node guide, this Postgres volume uses storageClassName: local-path instead of Longhorn. That is a real choice: MyApp is a smaller, single-node app, and local-path volumes bind to the node without replication overhead. The trade-off is that if the node dies, the volume does not follow — which is why not every app uses the same storage class.',
    yaml: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-postgres-pvc
  namespace: myapp
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 5Gi
  storageClassName: local-path`,
  },
  {
    name: 'Postgres Deployment',
    filename: 'deployment.yaml (db)',
    why: 'Note how the Postgres env vars come from the templated Secret rather than direct envFrom. Each POSTGRES_* value is pulled by secretKeyRef from a specific key. This works with the templating variant because the Deployment and the templated Secret agree on the keys.',
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
                secretKeyRef: { name: myapp-secrets, key: DATABASE_NAME }
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef: { name: myapp-secrets, key: DATABASE_USER }
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef: { name: myapp-secrets, key: DATABASE_PASSWORD }
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: myapp-postgres-pvc`,
  },
  {
    name: 'Postgres Service',
    filename: 'service.yaml (db)',
    why: 'ClusterIP — internal only. Same pattern as every other backend: database is not exposed outside the cluster.',
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
      targetPort: 5432`,
  },
  {
    name: 'App Deployment',
    filename: 'deployment.yaml (app)',
    why: 'Two things are unusual here. First, the DATABASE_* env vars are declared individually with secretKeyRef — even though the .env file is also mounted. That is because goose expands ${VAR} in the CMD using the shell, so the vars must exist in the process environment. Second, the .env file is mounted via subPath at /app/.env — so the app reads it as a normal file, not as a directory mount.',
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
          image: ghcr.io/example-org/myapp:b283f6e8
          ports:
            - containerPort: 3006
          env:
            - name: DATABASE_USER
              valueFrom:
                secretKeyRef: { name: myapp-secrets, key: DATABASE_USER }
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef: { name: myapp-secrets, key: DATABASE_PASSWORD }
            - name: DATABASE_HOST
              valueFrom:
                secretKeyRef: { name: myapp-secrets, key: DATABASE_HOST }
            - name: DATABASE_PORT
              valueFrom:
                secretKeyRef: { name: myapp-secrets, key: DATABASE_PORT }
            - name: DATABASE_NAME
              valueFrom:
                secretKeyRef: { name: myapp-secrets, key: DATABASE_NAME }
          volumeMounts:
            - name: env-file
              mountPath: /app/.env
              subPath: .env
          command:
            - /bin/sh
            - -c
            - |
              echo "Waiting for Postgres..."
              until goose -dir /app/internal/sql postgres "user=\${DATABASE_USER} password=\${DATABASE_PASSWORD} host=\${DATABASE_HOST} port=\${DATABASE_PORT} dbname=\${DATABASE_NAME} sslmode=disable" up; do
                echo "DB not ready, retrying..."
                sleep 10
              done
              echo "Migrations complete. Starting app..."
              exec ./main
      volumes:
        - name: env-file
          secret:
            secretName: myapp-secrets
            items:
              - key: .env
                path: .env`,
  },
  {
    name: 'App Service',
    filename: 'service.yaml (app)',
    why: 'NodePort on 3006. No fixed nodePort value — Kubernetes picks one from the range. That is fine here because Traefik will resolve the Service by name, not by nodePort.',
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
    - port: 3006
      targetPort: 3006`,
  },
  {
    name: 'Ingress',
    filename: 'ingress.yaml',
    why: 'Identical shape to every other backend on the cluster — with one extra annotation: `traefik.ingress.kubernetes.io/router.middlewares: kube-system-global-ratelimit@kubernetescrd`. That attaches a shared rate-limit middleware defined once in kube-system. Per-Ingress rate limiting without duplicating the CRD per app.',
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
                  number: 3006
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls`,
  },
];

const gotchas = [
  {
    title: 'The CMD must fail-closed',
    detail: 'The `&&` between goose up and exec ./main is not decoration. If migrations fail, the app must not start. `;` would let the app run against a broken schema — which is worse than being down.',
  },
  {
    title: 'Goose needs git during build',
    detail: '`go install github.com/pressly/goose/v3/cmd/goose@latest` fetches the source. Without `apk add --no-cache git` the install fails with a cryptic error. The builder stage installs git; the runtime stage does not need it.',
  },
  {
    title: 'Templated .env and secretKeyRef are two separate paths',
    detail: 'The .env file is what the Go app reads. The DATABASE_* env vars are what goose expands in the shell. Both come from the same Vault entry, but they arrive by different routes — and both must be wired or the container will start without one of them.',
  },
  {
    title: 'local-path is not replicated',
    detail: 'Unlike Longhorn, local-path volumes bind to a single node. If the node dies, the volume does not follow. That is the trade-off for lower overhead — and the reason MyApp uses local-path while the larger apps use Longhorn.',
  },
  {
    title: 'subPath mounting does not auto-update',
    detail: 'Mounting a Secret key with subPath means the file will NOT be refreshed when the Secret changes. ESO still syncs Vault, but the mounted /app/.env stays at its original content until the pod restarts. That is expected — and why pod restarts are the rollout mechanism when secrets change.',
  },
  {
    title: 'Rate-limit middleware is defined once, referenced here',
    detail: 'The `@kubernetescrd` reference points at a Middleware CRD that lives in kube-system. If you deploy this Ingress without that CRD present, Traefik will fail to resolve the annotation and the Ingress will return 404.',
  },
];

export default function DeployGoPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ DEPLOY / GO + POSTGRES ]</p>
        <h1 className={style.title}>
          DEPLOY A<br />
          <span className={style.titleMuted}>GO API + DB</span>
        </h1>
        <p className={style.sub}>
          A Go service changes two things compared to a Node backend: the build
          produces a compiled binary (smaller, no Node runtime), and the
          migration runner can be baked into the image itself. Here is the full
          <span className={style.strong}> myapp </span>stack — multi-stage Go
          build, Goose migrations, Vault templating, Postgres, and a
          rate-limited Ingress.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT NEEDS</p>
        <h2 className={style.h2}>The shape of a Go + Postgres deploy.</h2>

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
        <h2 className={style.h2}>The Dockerfile — two stages.</h2>
        <p className={style.lede}>
          The builder stage compiles the binary and installs Goose. The runtime
          stage is alpine with only the binary, Goose, and the migration files.
          No Go toolchain ships to production.
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
        <p className={style.label}>// MIGRATIONS</p>
        <h2 className={style.h2}>{migrations.title}</h2>

        <div className={style.checklist}>
          {migrations.points.map(p => (
            <div key={p} className={style.checkItem}>
              <span className={style.checkMark}>›</span>
              <span className={style.checkText}>{p}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// SECRETS — TEMPLATING</p>
        <h2 className={style.h2}>Vault that assembles a .env file.</h2>
        <p className={style.lede}>
          MyApp uses a templated ExternalSecret — the Secret holds one key,
          .env, whose content is built from many Vault values. The Deployment
          mounts that key as /app/.env. The Go app reads config from a real
          file, exactly as it does locally.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>{vaultTemplate.name}</h3>
              <span className={style.manifestFile}>secrets.yaml</span>
            </div>
            <p className={style.manifestWhy}>{vaultTemplate.why}</p>
            <pre className={style.code}>
              <code>{vaultTemplate.yaml}</code>
            </pre>
          </article>
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// GO VS NODE — SECRETS</p>
        <h2 className={style.h2}>{envDifference.title}</h2>
        <p className={style.lede}>{envDifference.intro}</p>

        <div className={style.manifests}>
          {envDifference.comparison.map(c => (
            <article key={c.runtime} className={style.manifest}>
              <div className={style.manifestHead}>
                <h3 className={style.manifestName}>{c.runtime}</h3>
                <span className={style.manifestFile}>
                  {c.runtime === 'Node.js' ? 'envFrom' : 'volumeMounts'}
                </span>
              </div>
              <p className={style.manifestWhy}>
                <strong style={{ color: '#f0f0f0' }}>How it reads config:</strong> {c.how}
              </p>
              <p className={style.manifestWhy}>
                <strong style={{ color: '#d4663a' }}>The manifest difference:</strong>
              </p>
              <pre className={style.code}>
                <code>{c.manifest}</code>
              </pre>
              <p className={style.manifestWhy} style={{ marginTop: 12 }}>
                <strong style={{ color: '#f0f0f0' }}>Result:</strong> {c.result}
              </p>
            </article>
          ))}
        </div>

        <div className={style.note}>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: '#f0f0f0' }}>Why not just use envFrom for Go too?</strong>
          </p>
          <p style={{ marginBottom: 12 }}>{envDifference.whyNotEnvFrom}</p>
          <p style={{ marginBottom: 0 }}>
            <strong style={{ color: '#f0f0f0' }}>Why the templated ExternalSecret?</strong>{' '}
            {envDifference.whyTemplate}
          </p>
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// MANIFESTS</p>
        <h2 className={style.h2}>In dependency order.</h2>
        <p className={style.lede}>
          Apply in this order the first time. The templated .env is what makes
          everything downstream work — Postgres reads individual keys, the app
          reads the file, and Goose reads env vars the Deployment declares.
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