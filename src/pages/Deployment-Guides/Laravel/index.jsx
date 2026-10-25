import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'php:8.4-apache — mod_php in the web container, no separate FPM pool',
  'Apache serves /public, never the app root',
  'A single entrypoint that does wait, migrate, start workers, then exec apache',
  'SQLite with a background sync loop copying the DB to a persistent volume',
  'Five RabbitMQ consumers started as background jobs in the same container',
  'Laravel scheduler wired into cron inside the pod',
  'Traefik Ingress in FastCGI mode — not HTTP',
];

const dockerfile = {
  name: 'Dockerfile',
  why: 'This is an Apache+mod_php image — not FPM+nginx. Laravel routes all traffic through /public via Apache VirtualHost rewrite. Extensions are installed for MySQL, Postgres, intl, zip, bcmath, soap, sockets. Composer install runs with --no-dev and --optimize-autoloader. The scheduler is installed as a cron job inside the image, so it runs on every tick without a separate CronJob resource.',
  code: `FROM php:8.4-apache

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    curl unzip git libxml2-dev libpq-dev libicu-dev libzip-dev \\
    procps cron nano freeradius-utils \\
    && rm -rf /var/lib/apt/lists/*

# PHP extensions
RUN docker-php-ext-install -j$(nproc) \\
    pdo_mysql pdo_pgsql pgsql intl zip bcmath soap opcache sockets

# Apache modules + DocumentRoot
RUN a2enmod rewrite headers expires
ENV APACHE_DOCUMENT_ROOT=/var/www/public
RUN sed -ri \\
    -e 's!/var/www/html!\${APACHE_DOCUMENT_ROOT}!g' \\
    /etc/apache2/sites-available/*.conf \\
    /etc/apache2/apache2.conf \\
    /etc/apache2/conf-available/*.conf

# Composer
WORKDIR /var/www
COPY composer.json composer.lock ./
RUN curl -sS https://getcomposer.org/installer | php -- \\
    --install-dir=/usr/local/bin --filename=composer
RUN composer install --no-dev --no-scripts --prefer-dist --optimize-autoloader

# App
COPY . .
RUN composer dump-autoload --optimize

# Laravel dirs + permissions
RUN mkdir -p \\
    /var/www/storage/logs \\
    /var/www/storage/framework/cache \\
    /var/www/storage/framework/sessions \\
    /var/www/storage/framework/views \\
    /var/www/bootstrap/cache \\
    /var/www/database

RUN chown -R www-data:www-data \\
    /var/www/storage /var/www/bootstrap/cache /var/www/database
RUN chmod -R 775 \\
    /var/www/storage /var/www/bootstrap/cache /var/www/database

# Laravel scheduler via cron
RUN echo "* * * * * cd /var/www && /usr/local/bin/php artisan schedule:run >> /var/www/storage/logs/scheduler.log 2>&1" \\
    > /etc/cron.d/laravel-scheduler \\
    && chmod 0644 /etc/cron.d/laravel-scheduler \\
    && crontab /etc/cron.d/laravel-scheduler

# Entrypoint
COPY docker/common/php-fpm/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]`,
};

const entrypoint = {
  name: 'entrypoint.sh',
  why: 'The entrypoint is the entire orchestration layer for this container. It does six things in order: guards against double-start, fixes storage permissions, restores SQLite from the persistent volume if present, waits for RabbitMQ, runs migrations, sets up queue infra, starts five background consumers, kicks off a SQLite sync loop, and finally execs apache2-foreground. Every step is idempotent — the container can be restarted and it will pick up where it left off.',
  code: `#!/bin/bash
set -e

# Guard: refuse to double-start
if pgrep -x apache2 >/dev/null 2>&1; then
    echo "Apache is already running. Refusing to start."
    exit 0
fi

# Fix Laravel storage permissions
mkdir -p /var/www/storage /var/www/storage/logs \\
    /var/www/storage/framework/cache \\
    /var/www/storage/framework/sessions \\
    /var/www/storage/framework/views \\
    /var/www/bootstrap/cache

chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# SQLite: restore from persistent volume
if [ "$DB_CONNECTION" = "sqlite" ]; then
    INTERNAL_DB_FILE="/var/www/database/database.sqlite"
    PERSISTENT_DB_FILE="/data/database.sqlite"

    mkdir -p /var/www/database
    chown -R www-data:www-data /var/www/database
    chmod -R 775 /var/www/database

    if [ -f "$PERSISTENT_DB_FILE" ]; then
        cp "$PERSISTENT_DB_FILE" "$INTERNAL_DB_FILE"
    else
        [ ! -f "$INTERNAL_DB_FILE" ] && touch "$INTERNAL_DB_FILE"
    fi

    chown www-data:www-data "$INTERNAL_DB_FILE"
    chmod 664 "$INTERNAL_DB_FILE"
    export DB_DATABASE="$INTERNAL_DB_FILE"
fi

# Wait for RabbitMQ
if [ -n "$RABBITMQ_HOST" ] && [ -n "$RABBITMQ_PORT" ]; then
    until (echo > /dev/tcp/$RABBITMQ_HOST/$RABBITMQ_PORT) >/dev/null 2>&1; do
        sleep 5
    done
fi

# Clear caches + migrate
su -s /bin/bash www-data -c "php artisan optimize:clear"
su -s /bin/bash www-data -c "php artisan migrate --force"

# Setup + start RabbitMQ consumers
su -s /bin/bash www-data -c "php artisan hotspot:setup-payments"
su -s /bin/bash www-data -c "php artisan hotspot:setup-products"

su -s /bin/bash www-data -c "php artisan rabbitmq:consume-payment-results" &
su -s /bin/bash www-data -c "php artisan rabbitmq:consume-hotspot-products" &
su -s /bin/bash www-data -c "php artisan queue:work rabbitmq \\
    --queue=station_queue,package_queue,accounts_queue,vouchers_queue \\
    --sleep=3 --tries=3 --timeout=90" &

# SQLite persistence sync loop
if [ "$DB_CONNECTION" = "sqlite" ]; then
    mkdir -p /data
    cp "$INTERNAL_DB_FILE" "$PERSISTENT_DB_FILE.tmp"
    mv "$PERSISTENT_DB_FILE.tmp" "$PERSISTENT_DB_FILE"

    (while true; do
        sleep 10
        if [ -f "$INTERNAL_DB_FILE" ]; then
            cp "$INTERNAL_DB_FILE" "$PERSISTENT_DB_FILE.tmp"
            mv "$PERSISTENT_DB_FILE.tmp" "$PERSISTENT_DB_FILE"
        fi
    done) &
fi

exec apache2-foreground`,
};

const workloads = [
  {
    name: 'Apache (mod_php)',
    role: 'HTTP server + PHP execution',
    source: 'Container PID 1 via exec apache2-foreground',
    note: 'Serves /public. Handles the Laravel request lifecycle.',
  },
  {
    name: 'Laravel scheduler',
    role: 'Cron runner',
    source: 'system cron reading /etc/cron.d/laravel-scheduler',
    note: 'Runs artisan schedule:run every minute. Logs to storage/logs/scheduler.log.',
  },
  {
    name: 'Laravel queue worker',
    role: 'Default queue consumer',
    source: 'Background job in entrypoint (queue:work rabbitmq)',
    note: 'Listens to station_queue, package_queue, accounts_queue, vouchers_queue.',
  },
  {
    name: 'Payment results consumer',
    role: 'RabbitMQ consumer',
    source: 'Background job in entrypoint (rabbitmq:consume-payment-results)',
    note: 'Reacts to payment callbacks from the payment provider.',
  },
  {
    name: 'Hotspot products consumer',
    role: 'RabbitMQ consumer',
    source: 'Background job in entrypoint (rabbitmq:consume-hotspot-products)',
    note: 'Handles product events between Hotspot and the billing system.',
  },
  {
    name: 'SQLite sync loop',
    role: 'Persistence sync',
    source: 'Background shell loop in entrypoint',
    note: 'Copies /var/www/database/database.sqlite to /data/database.sqlite every 10 seconds. Only safe with 1 replica.',
  },
];

const manifests = [
  {
    name: 'Namespace',
    filename: 'namespace.yaml',
    why: 'Its own namespace. Standard.',
    yaml: `apiVersion: v1
kind: Namespace
metadata:
  name: myapp`,
  },
  {
    name: 'ExternalSecret',
    filename: 'secrets.yaml',
    why: 'Same pattern as every other backend. Reads Services/MyApp/prod from Vault. Every key becomes a K8s Secret key. The Deployment pulls the entire Secret via envFrom.',
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
    why: 'One unusual key: DB_DATABASE points at the internal container path /var/www/html/database/database.sqlite. This path is the read/write target inside the container — the persistent volume is mounted at /var/www/html/database, so the SQLite file lives on the PVC and the entrypoint syncs it to /data for backup.',
    yaml: `apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  namespace: myapp
data:
  APP_ENV: "production"
  APP_DEBUG: "false"
  DB_CONNECTION: "sqlite"
  DB_DATABASE: "/var/www/html/database/database.sqlite"`,
  },
  {
    name: 'PVC (Longhorn)',
    filename: 'pvc.yaml',
    why: '5Gi on Longhorn. This is the only data volume for this app — SQLite lives here. The volume is mounted at /var/www/html/database inside the container. Because SQLite is a single file, this app must run with exactly 1 replica. Longhorn is used rather than local-path because the scheduler jobs on the volume are what make recovery meaningful.',
    yaml: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: myapp-sqlite-pvc
  namespace: myapp
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 5Gi`,
  },
  {
    name: 'App Deployment',
    filename: 'deployment.yaml',
    why: 'Pinned to worker-node. The readinessProbe uses a custom binary /usr/local/bin/php-fpm-healthcheck which was baked into the image. Replicas are fixed at 1 because SQLite is a single file locked by the first writer. If you scale this, you will see "database is locked" errors immediately.',
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
          image: ghcr.io/example-org/myapp:9a7880b2
          imagePullPolicy: Always
          ports:
            - containerPort: 9000
          envFrom:
            - configMapRef:
                name: myapp-config
            - secretRef:
                name: myapp-db-secrets
          readinessProbe:
            exec:
              command:
                - /usr/local/bin/php-fpm-healthcheck
            initialDelaySeconds: 5
            periodSeconds: 10
          volumeMounts:
            - name: sqlite-storage
              mountPath: /var/www/html/database
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "200m"
      volumes:
        - name: sqlite-storage
          persistentVolumeClaim:
            claimName: myapp-sqlite-pvc`,
  },
  {
    name: 'App Service',
    filename: 'service.yaml',
    why: 'NodePort 30009 on port 9000. Port 9000 here is FastCGI, not HTTP — which is unusual for a Service, but it is what allows the Traefik Ingress to speak FastCGI directly to the container.',
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
    - port: 9000
      targetPort: 9000
      nodePort: 30009`,
  },
  {
    name: 'Ingress',
    filename: 'ingress.yaml',
    why: 'One annotation changes the whole behavior: traefik.ingress.kubernetes.io/service.serversscheme: "fastcgi". Instead of HTTP, Traefik routes to port 9000 as FastCGI. This is required because the container serves PHP-FPM, not an HTTP server on 9000. The Apache server inside the container listens on 80 — but this Ingress bypasses Apache and speaks to FPM directly.',
    yaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: myapp
  annotations:
    kubernetes.io/ingress.class: "traefik"
    traefik.ingress.kubernetes.io/router.entrypoints: "web, websecure"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    traefik.ingress.kubernetes.io/service.serversscheme: "fastcgi"
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
                  number: 9000
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls`,
  },
];

const gotchas = [
  {
    title: 'SQLite dictates a single-replica deployment',
    detail: 'SQLite is a file. Two processes writing to the same file cause immediate "database is locked" errors. replicas must stay at 1 forever unless the app is migrated to Postgres or MySQL. The comment in the manifest is a warning, not a suggestion.',
  },
  {
    title: 'The SQLite sync loop is a stop-gap, not a solution',
    detail: 'Every 10 seconds, the entrypoint copies /var/www/database/database.sqlite to /data/database.sqlite. If the container dies mid-copy, the destination may be a partial file. The .tmp + mv pattern (write to tmp, then atomic rename) is what prevents corruption. This is safe for a single-node toy deployment; a real production Laravel app should use Postgres.',
  },
  {
    title: 'FastCGI Ingress points at port 9000, not 80',
    detail: 'Inside the container, Apache listens on 80 and PHP-FPM listens on 9000. The Service exposes 9000 and the Ingress annotation sets serversscheme: "fastcgi". This means Traefik talks directly to FPM — bypassing Apache entirely. If you forget the annotation, Traefik sends HTTP to a FastCGI port and the request times out.',
  },
  {
    title: 'Five background consumers in the same container as Apache',
    detail: 'Queue workers, two RabbitMQ consumers, and the SQLite sync loop are all started as background jobs (&) in the entrypoint. If any of them crashes, the container keeps running — Kubernetes only sees the exec apache2-foreground process. Consider splitting these into their own Deployments, or add a supervisor, before scaling.',
  },
  {
    title: 'The scheduler is inside the container, not a Kubernetes CronJob',
    detail: 'Laravel schedule:run runs via cron in the image every minute. That means the scheduler scales with the pod — if you run 3 replicas, you get 3 overlapping scheduler runs. Since this app is fixed at 1 replica, that is fine. If it ever scales, the scheduler must move to a dedicated CronJob.',
  },
  {
    title: 'Composer runs with --no-dev at build time',
    detail: 'The image is built with --no-dev, so dev-only packages (PHPUnit, faker, debug bar) are not in the container. If you need them at runtime, either rebuild with --dev or install them dynamically — but rebuilding is the correct choice.',
  },
];

export default function DeployLaravelPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ DEPLOY / LARAVEL + SQLITE ]</p>
        <h1 className={style.title}>
          DEPLOY A<br />
          <span className={style.titleMuted}>LARAVEL APP</span>
        </h1>
        <p className={style.sub}>
          Laravel deployments look nothing like Node, Go, or Django. PHP runs
          inside Apache, SQLite is a file that has to be persisted manually,
          five queue consumers start in the same container, and the scheduler
          lives inside the image. Here is the full
          <span className={style.strong}> myapp </span> stack — and the six
          places it would break if you scaled it blindly.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT NEEDS</p>
        <h2 className={style.h2}>The shape of a Laravel + SQLite deploy.</h2>

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
          Apache + mod_php serving /public. Composer runs at build time with
          --no-dev. The scheduler is installed as a cron file so it runs every
          minute regardless of the Kubernetes schedule.
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
        <h2 className={style.h2}>The orchestration layer inside the container.</h2>
        <p className={style.lede}>
          This script does more than any other backend in the series. It is
          effectively a supervisor: fix permissions, restore SQLite, wait for
          RabbitMQ, migrate, start five workers, kick off the sync loop, and
          exec Apache. Every step is idempotent.
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
        <p className={style.label}>// PROCESSES IN THE POD</p>
        <h2 className={style.h2}>Six things running in one container.</h2>
        <p className={style.lede}>
          This is what makes the Laravel deployment unusual — the container
          supervises six processes, not one. Each row below is a distinct
          workload that lives inside the same pod.
        </p>

        <div className={style.manifests}>
          {workloads.map((w, i) => (
            <article key={w.name} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{w.name}</h3>
                <span className={style.manifestFile}>{w.role}</span>
              </div>
              <p className={style.manifestWhy}>
                <strong style={{ color: '#f0f0f0' }}>Started by:</strong> {w.source}
                <br />
                {w.note}
              </p>
            </article>
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