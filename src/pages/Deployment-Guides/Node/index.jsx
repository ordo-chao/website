import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const sections = [
  {
    title: 'What a backend deployment needs',
    points: [
      'Its own namespace — myapp, isolated from every other app',
      'Vault-backed secrets — no passwords in Git, ever',
      'A Longhorn PVC for Postgres data, backed up daily',
      'A config map for non-sensitive env vars (PORT, POSTGRES_HOST)',
      'Postgres + App Deployments, pinned to the worker node',
      'A migration initContainer that runs before the app starts',
      'ClusterIP Service for Postgres, NodePort Service for the app',
      'A Traefik Ingress with TLS',
    ],
  },
];

const dockerfiles = [
  {
    name: 'Dockerfile',
    filename: 'Dockerfile',
    why: 'A single-stage Node image is correct here. Backend apps ship their source, not a compiled bundle — the container is the runtime. Installing all dependencies (dev included) matters because tools like migration runners are usually devDependencies that "production-only" installs would strip out.',
    code: `# Use official Node.js LTS image
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy package files first
COPY package*.json ./

# Install ALL dependencies (important: no --production)
RUN npm install

# Copy the rest of the app
COPY . .

# Expose the app port (Express default)
EXPOSE 3003

# Start both app and worker
CMD ["npm", "start"]`,
  },
];

const vaultFlow = [
  {
    step: '01',
    title: 'Secret is written to Vault',
    detail: 'A password, JWT key, or DB credential is stored at Services/MyApp/prod in Vault. It never enters Git.',
  },
  {
    step: '02',
    title: 'ExternalSecret declares the intent',
    detail: 'A Kubernetes manifest (secrets.yaml) says: read Services/MyApp/prod from ClusterSecretStore vault-backend, and materialize a K8s Secret named myapp-db-secrets.',
  },
  {
    step: '03',
    title: 'ESO syncs every 60 seconds',
    detail: 'External Secrets Operator polls Vault on a 1-minute refreshInterval. Any change in Vault is reflected in the K8s Secret within one cycle — no pod restart needed for the Secret to update.',
  },
  {
    step: '04',
    title: 'Pods read the K8s Secret via envFrom',
    detail: 'The Deployment references myapp-db-secrets via envFrom.secretRef. Every key in the Vault entry becomes an environment variable. No password appears anywhere in a manifest.',
  },
];

const manifests = [
  {
    name: 'Namespace',
    filename: 'namespace.yaml',
    why: 'One namespace per environment. myapp cannot read myapp-staging secrets, and vice versa — the API enforces it.',
    yaml: `apiVersion: v1
kind: Namespace
metadata:
  name: myapp`,
  },
  {
    name: 'ExternalSecret',
    filename: 'secrets.yaml',
    why: 'The only manifest that mentions Vault. External Secrets Operator reads from ClusterSecretStore vault-backend and materializes a K8s Secret named myapp-db-secrets, refreshing every minute.',
    yaml: `apiVersion: external-secrets.io/v1
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
    why: 'Non-sensitive runtime values. Notice POSTGRES_HOST points at the ClusterIP Service — never at a pod IP, which would break on restart.',
    yaml: `apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: myapp
data:
  PORT: "3003"
  POSTGRES_HOST: "myapp-postgres-service.myapp.svc.cluster.local"
  POSTGRES_PORT: "5432"
  NODE_ENV: "production"`,
  },
  {
    name: 'PVC (Longhorn)',
    filename: 'pvc.yaml',
    why: 'The annotations attach two recurring jobs directly to the volume: daily-backup (retained 3 times) and hourly-snapshot (retained 24 times). This is why every Postgres volume is recoverable without any extra scripting.',
    yaml: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-postgres-pvc
  namespace: myapp
  annotations:
    longhorn.io/backup: "enabled"
    longhorn.io/recurring-jobs: |
      [
        {
          "name": "daily-backup",
          "cron": "0 2 * * *",
          "task": "backup",
          "retain": 3
        },
        {
          "name": "hourly-snapshot",
          "cron": "0 * * * *",
          "task": "snapshot",
          "retain": 24
        }
      ]
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 5Gi`,
  },
  {
    name: 'Postgres Deployment',
    filename: 'deployment.yaml (db)',
    why: 'Pinned to the worker node where Longhorn volumes live. The initContainer cleans a freshly mounted PVC so the Postgres entrypoint does not see a partial data directory and refuse to start — a common gotcha when using persistent storage on Longhorn.',
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
      nodeSelector:
        kubernetes.io/hostname: worker-node
      initContainers:
        - name: clean-pvc
          image: busybox
          command:
            - sh
            - -c
            - |
              echo "Cleaning PVC and preparing data directory..."
              rm -rf /var/lib/postgresql/data/*
              rm -rf /var/lib/postgresql/data/.[!.]*
              mkdir -p /var/lib/postgresql/data/pgdata
              echo "PVC prepared successfully"
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
      containers:
        - name: postgres
          image: postgres:15
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: myapp-db-secrets
          env:
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            exec:
              command: [pg_isready, -U, postgres]
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command: [pg_isready, -U, postgres]
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: myapp-postgres-pvc`,
  },
  {
    name: 'Postgres Service',
    filename: 'service.yaml (db)',
    why: 'ClusterIP — internal only. The Postgres port is not exposed outside the cluster, which is why the app connects via myapp-postgres-service.myapp.svc.cluster.local.',
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
    why: 'The app pod reads both the ConfigMap and the Vault-materialized Secret via envFrom. The image is replaced by the GitOps bot on every push — you never edit this file manually.',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
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
      nodeSelector:
        kubernetes.io/hostname: worker-node
      imagePullSecrets:
        - name: ghcr-secret
      containers:
        - name: myapp
          image: ghcr.io/example-org/myapp:c2a33b8f
          imagePullPolicy: Always
          ports:
            - containerPort: 3003
          envFrom:
            - configMapRef:
                name: myapp-config
            - secretRef:
                name: myapp-db-secrets
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
          readinessProbe:
            httpGet:
              path: /
              port: 3003
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 3003
            initialDelaySeconds: 30
            periodSeconds: 10`,
  },
  {
    name: 'App Service',
    filename: 'service.yaml (app)',
    why: 'NodePort 30003 is fixed. This is the port the Ingress will point at — pick a port from 30000–32767 that no other app in the cluster uses.',
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
    - port: 3003
      targetPort: 3003
      nodePort: 30003`,
  },
  {
    name: 'Ingress',
    filename: 'ingress.yaml',
    why: 'The namespace MUST match the Service namespace. Traefik will not resolve myapp-service if the Ingress is deployed in a different namespace. cert-manager issues the TLS cert here.',
    yaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: myapp
  annotations:
    kubernetes.io/ingress.class: "traefik"
    traefik.ingress.kubernetes.io/router.entrypoints: web, websecure
    cert-manager.io/cluster-issuer: letsencrypt-prod
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
                  number: 3003
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls`,
  },
];

const initContainerExample = {
  name: 'Migration initContainer',
  why: 'An initContainer runs to completion BEFORE the app container starts. It uses the same image as the app, has access to the same envFrom (ConfigMap + Vault Secret), and runs a single migration command. If migrations fail, the pod never starts — which is exactly right: you never want the app to serve traffic against an un-migrated schema.',
  yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
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
      initContainers:
        - name: migrate
          image: ghcr.io/example-org/myapp:b047d026
          imagePullPolicy: Always
          command: ["sh", "-c"]
          args:
            - |
              export DATABASE_URL="postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:\${POSTGRES_PORT}/\${POSTGRES_DB}"
              echo "Running migrations against \${POSTGRES_HOST}:\${POSTGRES_PORT}/\${POSTGRES_DB}"
              npm run migrate:up
          envFrom:
            - configMapRef:
                name: myapp-config
            - secretRef:
                name: myapp-db-secrets
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
      containers:
        - name: myapp
          image: ghcr.io/example-org/myapp:b047d026
          imagePullPolicy: Always
          ports:
            - containerPort: 3003
          envFrom:
            - configMapRef:
                name: myapp-config
            - secretRef:
                name: myapp-db-secrets
          readinessProbe:
            httpGet:
              path: /
              port: 3003
            initialDelaySeconds: 5
            periodSeconds: 10`,
};

const ingressExample = {
  name: 'Second Ingress — same pattern, different host',
  why: 'Same shape as the first Ingress. Different app, different namespace, different hostname — but the annotations, entrypoints, TLS block, and backend reference all follow the same contract. That consistency is the point: every backend on the cluster exposes traffic the same way, so a new deployment is a copy-paste with four substitutions (namespace, service name, host, TLS secret).',
  yaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-api-ingress
  namespace: myapp
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
spec:
  rules:
    - host: api.myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-service
                port:
                  number: 3003
  tls:
    - hosts:
        - api.myapp.example.com
      secretName: myapp-api-tls`,
};

const gotchas = [
  {
    title: 'Postgres on a fresh Longhorn PVC needs the initContainer',
    detail: 'The Longhorn mount directory contains a lost+found directory. Postgres refuses to initialize into a non-empty data directory. The initContainer cleans it and creates the pgdata subdirectory, which is why PGDATA points there.',
  },
  {
    title: 'Vault paths are case-sensitive',
    detail: 'Services/MyApp/prod works. services/myapp/prod does not. The ExternalSecret will report SecretSyncedError if the path is wrong — always check `kubectl describe externalsecret` first.',
  },
  {
    title: 'Migrations must fail closed',
    detail: 'If the migration initContainer fails, the pod does NOT start. This is intentional — serving traffic against an un-migrated schema is worse than being down. Watch `kubectl logs pod/myapp -c migrate` when the pod is stuck in Init.',
  },
  {
    title: 'Never edit the app image tag by hand',
    detail: 'The CI bot writes the new SHA. If you commit a different tag manually, the next CI run will overwrite it — and you will not know which SHA is actually deployed. Trust the pipeline.',
  },
  {
    title: 'PVC cannot change storage class after creation',
    detail: 'Longhorn volumes are bound at creation. If you need more storage, patch the PVC and Longhorn will expand it. But you cannot move an existing volume to a different storage class without a full backup-and-restore.',
  },
  {
    title: 'Ingress namespace must match the Service namespace',
    detail: 'Ingresses cannot reference services across namespaces. A mismatched namespace will silently 404 at the router — the Ingress is applied but Traefik cannot resolve myapp-service.',
  },
];

export default function DeployBackendPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ DEPLOY / BACKEND ]</p>
        <h1 className={style.title}>
          DEPLOY A<br />
          <span className={style.titleMuted}>NODE + POSTGRES</span>
        </h1>
        <p className={style.sub}>
          A backend service is not one deployment — it is ten manifests that
          each own a piece of the contract. Here is the complete set for a
          generic <span className={style.strong}>myapp</span> service: Vault
          secrets, Postgres with Longhorn, a migration initContainer, two
          Services, and a Traefik Ingress with TLS.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT NEEDS</p>
        <h2 className={style.h2}>Every backend has the same shape.</h2>

        <div className={style.checklist}>
          {sections[0].points.map(p => (
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
          Backend containers ship source, not a compiled bundle — the container
          IS the runtime. That is why a single-stage Node image is correct
          here, and why installing all dependencies matters.
        </p>

        <div className={style.manifests}>
          {dockerfiles.map(f => (
            <article key={f.name} className={style.manifest}>
              <div className={style.manifestHead}>
                <h3 className={style.manifestName}>{f.name}</h3>
                <span className={style.manifestFile}>{f.filename}</span>
              </div>
              <p className={style.manifestWhy}>{f.why}</p>
              <pre className={style.code}>
                <code>{f.code}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// SECRETS FLOW</p>
        <h2 className={style.h2}>How Vault gets to the app.</h2>
        <p className={style.lede}>
          Four steps from "password is stored" to "pod has it as an env var".
          Nothing in that chain touches Git.
        </p>

        <div className={style.pipeline}>
          {vaultFlow.map(v => (
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
        <p className={style.label}>// PRE-START HOOKS</p>
        <h2 className={style.h2}>Migrations, seeding, whatever runs first.</h2>
        <p className={style.lede}>
          If something has to happen before the app accepts traffic — database
          migrations, seed scripts, waiting for a dependency — it goes in an
          initContainer. The app container does not start until the init
          container exits 0.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>{initContainerExample.name}</h3>
              <span className={style.manifestFile}>deployment.yaml (app)</span>
            </div>
            <p className={style.manifestWhy}>{initContainerExample.why}</p>
            <pre className={style.code}>
              <code>{initContainerExample.yaml}</code>
            </pre>
          </article>
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// MANIFESTS</p>
        <h2 className={style.h2}>Ten files. In dependency order.</h2>
        <p className={style.lede}>
          Apply these in order the first time. After the app is running, only
          deployment.yaml changes — and only via the GitOps bot.
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
        <p className={style.label}>// INGRESS — SECOND EXAMPLE</p>
        <h2 className={style.h2}>The same pattern, a different host.</h2>
        <p className={style.lede}>
          Once you understand the first Ingress, the second is a copy-paste
          with four substitutions: namespace, service name, hostname, TLS
          secret. That consistency is the point — every backend on the cluster
          exposes traffic the same way.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>{ingressExample.name}</h3>
              <span className={style.manifestFile}>ingress.yaml</span>
            </div>
            <p className={style.manifestWhy}>{ingressExample.why}</p>
            <pre className={style.code}>
              <code>{ingressExample.yaml}</code>
            </pre>
          </article>
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