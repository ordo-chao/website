import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const pipeline = [
  {
    step: '01',
    title: 'Push to main',
    detail: 'Vite app pushed to GitHub. GitHub Actions triggers the CI workflow.',
  },
  {
    step: '02',
    title: 'Build image',
    detail: 'CI runner executes the multi-stage Dockerfile. Stage 1 builds the Vite bundle; stage 2 copies it into nginx:stable-alpine.',
  },
  {
    step: '03',
    title: 'Push to GHCR',
    detail: 'Image tagged with commit SHA — ghcr.io/example-org/website:{sha}. Traceable back to the commit.',
  },
  {
    step: '04',
    title: 'Update GitOps repo',
    detail: 'CI writes the new SHA into Services/frontend/prod/deployment.yaml and commits to the GitOps repo.',
  },
  {
    step: '05',
    title: 'Argo syncs',
    detail: 'Argo detects the change and applies it. Rolling update replaces pods — maxUnavailable: 0.',
  },
  {
    step: '06',
    title: 'Ingress routes',
    detail: 'Traefik picks up the Ingress and terminates TLS via cert-manager. The site is live at the host.',
  },
];

const dockerfiles = [
  {
    name: 'Dockerfile',
    filename: 'Dockerfile',
    why: 'Two stages. The builder stage installs dev dependencies and runs `vite build`; the production stage is nginx:stable-alpine with only the compiled dist/ folder. Result: a ~25 MB image instead of ~500 MB, with no node_modules and no source code inside.',
    code: `# ==========================
# Stage 1: Build
# ==========================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile
COPY . .
# Run production build
RUN npm run build

# ==========================
# Stage 2: Production (The Slick Part)
# ==========================
FROM nginx:stable-alpine
# Copy your custom config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy build assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
  },
  {
    name: 'nginx.conf',
    filename: 'nginx.conf',
    why: 'The critical line is `try_files $uri $uri/ /index.html;`. Without it, refreshing any non-root route in a React/Vue SPA returns 404 — nginx tries to serve a file that does not exist. This line falls back to index.html and lets the client-side router take over.',
    code: `server {
    listen 80;
    server_name localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Optional: Cache static assets for performance
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /usr/share/nginx/html;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}`,
  },
];

const manifests = [
  {
    name: 'Namespace',
    filename: 'namespace.yaml',
    why: 'Everything lives in website. Namespace isolation means this app cannot accidentally touch backend resources.',
    yaml: `apiVersion: v1
kind: Namespace
metadata:
  name: website`,
  },
  {
    name: 'ConfigMap',
    filename: 'configmap.yaml',
    why: 'Non-sensitive runtime values. Vite injects VITE_* variables at build time, so this ConfigMap mostly holds the port and base URL for the served container.',
    yaml: `apiVersion: v1
kind: ConfigMap
metadata:
  name: website-config
  namespace: website
data:
  PORT: "5180"
  NODE_ENV: "production"
  VITE_BASE_URL: "https://api.example.com"`,
  },
  {
    name: 'Deployment',
    filename: 'deployment.yaml',
    why: 'Pinned to worker-node. The image is built from this repo — the SHA changes every push, and the GitOps bot writes it here.',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: website-app
  namespace: website
spec:
  replicas: 1
  selector:
    matchLabels:
      app: website
  template:
    metadata:
      labels:
        app: website
    spec:
      nodeSelector:
        kubernetes.io/hostname: worker-node
      imagePullSecrets:
        - name: ghcr-secret
      containers:
        - name: website
          image: ghcr.io/example-org/website:7875fc0c
          imagePullPolicy: Always
          ports:
            - containerPort: 5180
          envFrom:
            - configMapRef:
                name: website-config
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"`,
  },
  {
    name: 'Service',
    filename: 'service.yaml',
    why: 'NodePort 30085 is fixed so the port never collides with other apps. The Service selector matches the pod labels above.',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: website-service
  namespace: website
spec:
  selector:
    app: website
  type: NodePort
  ports:
    - port: 5180
      targetPort: 5180
      nodePort: 30085`,
  },
  {
    name: 'Ingress',
    filename: 'ingress.yaml',
    why: 'Traefik picks this up and issues a cert-manager certificate for www.example.com. Once the certificate is Ready, HTTPS works automatically.',
    yaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: website-ingress
  namespace: website
  annotations:
    kubernetes.io/ingress.class: "traefik"
    traefik.ingress.kubernetes.io/router.entrypoints: web, websecure
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  rules:
    - host: www.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: website-service
                port:
                  number: 5180
  tls:
    - hosts:
        - www.example.com
      secretName: website-tls`,
  },
];

const gotchas = [
  {
    title: 'VITE_* variables are build-time, not runtime',
    detail: 'Vite inlines VITE_* values during `vite build`. Adding them to a ConfigMap at runtime does nothing — they must be provided at build time (via GitHub Actions env or build args).',
  },
  {
    title: 'SPA routing breaks without try_files',
    detail: 'Refreshing /dashboard on a React Router app returns 404 unless nginx falls back to index.html. The `try_files $uri $uri/ /index.html;` line is what makes deep links work.',
  },
  {
    title: 'NodePort collisions',
    detail: 'NodePort 30085 is fixed for this app. If you add another frontend, pick a different port from the 30000–32767 range — otherwise kubectl will reject the Service.',
  },
  {
    title: 'Ingress namespace must match the Service',
    detail: 'The Ingress references website-service — that Service must exist in website, not in default. Cross-namespace references are not allowed.',
  },
  {
    title: 'cert-manager needs DNS pointed at the cluster first',
    detail: "Let's Encrypt will only issue a certificate after DNS resolves the host to the cluster's public IP. Add the A record before deploying the Ingress.",
  },
];

export default function DeployFrontendPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ DEPLOY / FRONTEND ]</p>
        <h1 className={style.title}>
          DEPLOY A<br />
          <span className={style.titleMuted}>VITE APP</span>
        </h1>
        <p className={style.sub}>
          End-to-end walkthrough of what happens when a Vite frontend pushes to
          main — from Docker build to a live TLS-terminated URL. Every
          Dockerfile, nginx config, and manifest below is the template you
          copy into <span className={style.strong}>your own</span> namespace.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// PIPELINE</p>
        <h2 className={style.h2}>Push to live in six steps.</h2>

        <div className={style.pipeline}>
          {pipeline.map(p => (
            <div key={p.step} className={style.pipelineStep}>
              <span className={style.stepNum}>{p.step}</span>
              <div>
                <h3 className={style.stepTitle}>{p.title}</h3>
                <p className={style.stepDetail}>{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// BUILD ARTIFACTS</p>
        <h2 className={style.h2}>The Dockerfile and the nginx config.</h2>
        <p className={style.lede}>
          Two files turn a Vite source tree into a production-ready container.
          The Dockerfile is multi-stage — the build happens in Node, the
          runtime is nginx. The nginx config is what makes client-side routing
          and static asset caching work correctly.
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
        <p className={style.label}>// MANIFESTS</p>
        <h2 className={style.h2}>The five files that make it run.</h2>
        <p className={style.lede}>
          Each manifest does one job. The annotations, selectors, and
          nodeSelector are where the actual decisions live. Change
          <code> website </code> to your app name and this is ready to deploy.
        </p>

        <div className={style.manifests}>
          {manifests.map(m => (
            <article key={m.name} className={style.manifest}>
              <div className={style.manifestHead}>
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
        <h2 className={style.h2}>What will break if you skip these.</h2>

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