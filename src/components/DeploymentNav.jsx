import { Link, useLocation } from 'react-router-dom';
import style from './DeploymentNav.module.css';

export const DEPLOYMENT_ORDER = [
  { path: '/deployment-guides/cluster-setup',  label: 'Cluster Setup' },
  { path: '/deployment-guides/github-actions', label: 'GitHub Actions' },
  { path: '/deployment-guides/gitops-repo',    label: 'GitOps Repo' },
  { path: '/deployment-guides/helm', label: 'Helm' },
  { path: '/deployment-guides/argocd', label: 'ArgoCD' },
    { path: '/deployment-guides/vault', label: 'Vault' },
      { path: '/deployment-guides/longhorn', label: 'Longhorn' },
      { path: '/deployment-guides/rabbitmq', label: 'RabbitMQ' },
  { path: '/deployment-guides/vite', label: 'Vite' },
  { path: '/deployment-guides/node', label: 'Node' },
  { path: '/deployment-guides/go', label: 'Go' },
  { path: '/deployment-guides/python', label: 'Python' },
  { path: '/deployment-guides/laravel', label: 'Laravel' },

  { path: '/deployment-guides/grafana', label: 'Grafana' },

  { path: '/deployment-guides/uptime-kuma', label: 'Uptime Kuma' },

  { path: '/deployment-guides/mailu', label: 'Mailu' },

  { path: '/deployment-guides/redis', label: 'Redis' },

  { path: '/deployment-guides/minio', label: 'MinIO' },

];

export function DeploymentBreadcrumb() {
  return (
    <div className={style.breadcrumb}>
      <Link to="/devops" className={style.breadcrumbLink}>
        ← Back to DevOps
      </Link>
      <span className={style.breadcrumbSep}>/</span>
      <Link to="/deployment-guides" className={style.breadcrumbLink}>
        All guides
      </Link>
    </div>
  );
}

export function DeploymentPrevNext() {
  const { pathname } = useLocation();
  const index = DEPLOYMENT_ORDER.findIndex(d => d.path === pathname);
  const prev = index > 0 ? DEPLOYMENT_ORDER[index - 1] : null;
  const next = index >= 0 && index < DEPLOYMENT_ORDER.length - 1 ? DEPLOYMENT_ORDER[index + 1] : null;

  return (
    <div className={style.nav}>
      <div className={style.navCol}>
        {prev ? (
          <>
            <p className={style.navLabel}>PREVIOUS</p>
            <Link to={prev.path} className={style.navLink}>
              ← {prev.label}
            </Link>
          </>
        ) : (
          <>
            <p className={style.navLabel}>START</p>
            <Link to="/devops" className={style.navLink}>
              ← DevOps overview
            </Link>
          </>
        )}
      </div>
      <div className={style.navCol + ' ' + style.navColRight}>
        {next ? (
          <>
            <p className={style.navLabel}>NEXT</p>
            <Link to={next.path} className={style.navLink}>
              {next.label} →
            </Link>
          </>
        ) : (
          <>
            <p className={style.navLabel}>END</p>
            <Link to="/devops" className={style.navLink}>
              Back to overview →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}