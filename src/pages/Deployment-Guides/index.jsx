import { Link } from 'react-router-dom';
import style from './index.module.css';
import { DEPLOYMENT_ORDER } from '../../components/DeploymentNav';

const guideMeta = {
  '/deployment-guides/vite': {
    desc: 'Frontend: multi-stage Docker build, nginx, SPA routing.',
    tag: 'Frontend',
    docs: 'https://vite.dev/guide/',
  },
  '/deployment-guides/node': {
    desc: 'Node.js API + Postgres, Vault secrets, initContainer migrations.',
    tag: 'Backend',
    docs: 'https://nodejs.org/docs/latest/api/',
  },
  '/deployment-guides/go': {
    desc: 'Go API + Postgres, Goose migrations baked into the image, templated .env from Vault.',
    tag: 'Backend',
    docs: 'https://go.dev/doc/',
  },
  '/deployment-guides/python': {
    desc: 'Django + Postgres, gunicorn, entrypoint migrations, background listeners.',
    tag: 'Backend',
    docs: 'https://docs.djangoproject.com/en/stable/',
  },
  '/deployment-guides/laravel': {
    desc: 'PHP + SQLite, Apache, FastCGI ingress, six processes in one pod.',
    tag: 'Backend',
    docs: 'https://laravel.com/docs',
  },
  '/deployment-guides/rabbitmq': {
    desc: 'Message broker for microservices — StatefulSet, Vault credentials, Longhorn storage.',
    tag: 'Messaging',
    docs: 'https://www.rabbitmq.com/docs',
  },
  '/deployment-guides/redis': {
    desc: 'Redis cache and queue backend — ConfigMap-driven config, AOF persistence.',
    tag: 'Cache',
    docs: 'https://redis.io/docs/latest/',
  },
  '/deployment-guides/minio': {
    desc: 'S3-compatible object storage — dual hostnames, Traefik IngressRoute, Recreate strategy.',
    tag: 'Storage',
    docs: 'https://min.io/docs/minio/kubernetes/upstream/',
  },
  '/deployment-guides/mailu': {
    desc: 'Full mail stack — SMTP, IMAP, webmail, admin UI. Multi-source ArgoCD Application.',
    tag: 'Email',
    docs: 'https://mailu.io/master/',
  },
  '/deployment-guides/github-actions': {
    desc: 'Three workflows: CI/CD, Gitleaks scanner, Discord notify.',
    tag: 'CI/CD',
    docs: 'https://docs.github.com/en/actions',
  },
  '/deployment-guides/grafana': {
    desc: 'Observability — visualizing Prometheus metrics, alerting.',
    tag: 'Observability',
    docs: 'https://grafana.com/docs/grafana/latest/',
  },
  '/deployment-guides/vault': {
    desc: 'HashiCorp Vault + External Secrets Operator — the secrets backbone.',
    tag: 'Secrets',
    docs: 'https://developer.hashicorp.com/vault/docs',
  },
  '/deployment-guides/uptime-kuma': {
    desc: 'External reachability + certificate monitoring.',
    tag: 'Observability',
    docs: 'https://github.com/louislam/uptime-kuma/wiki',
  },
  '/deployment-guides/longhorn': {
    desc: 'Distributed block storage — the storage layer under every stateful app.',
    tag: 'Storage',
    docs: 'https://longhorn.io/docs/',
  },
};

export default function DeploymentIndex() {
  return (
    <div className={style.page}>

      <div className={style.breadcrumb}>
        <Link to="/devops" className={style.breadcrumbLink}>
          ← Back to DevOps
        </Link>
      </div>

      <section className={style.hero}>
        <p className={style.label}>[ DEPLOYMENT GUIDES ]</p>
        <h1 className={style.title}>
          {DEPLOYMENT_ORDER.length} GUIDES.<br />
          <span className={style.titleMuted}>ONE PLATFORM.</span>
        </h1>
        <p className={style.sub}>
          Every deployment pattern on this cluster, from a static Vite
          frontend to Longhorn's storage layer. Read in order, or jump to
          whichever stack you want to see. Each guide links to the official
          documentation for the tool it deploys.
        </p>
      </section>

      <section className={style.list}>
        {DEPLOYMENT_ORDER.map((g, i) => {
          const meta = guideMeta[g.path] || { desc: '', tag: '', docs: '' };
          return (
            <div key={g.path} className={style.row}>
              <span className={style.num}>{String(i + 1).padStart(2, '0')}</span>
              <div className={style.rowMain}>
                <Link to={g.path} className={style.rowName}>
                  {g.label}
                </Link>
                <p className={style.rowDesc}>{meta.desc}</p>
              </div>
              <span className={style.rowTag}>{meta.tag}</span>
              {meta.docs && (
                <a
                  href={meta.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={style.rowDocs}
                  title={`${g.label} documentation`}
                >
                  docs ↗
                </a>
              )}
              <Link to={g.path} className={style.rowArrow}>→</Link>
            </div>
          );
        })}
      </section>
    </div>
  );
}