import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const overviewPoints = [
  'Grafana is the visualization layer — it does not collect metrics itself.',
  'Prometheus collects and stores time-series data; Grafana queries and displays it.',
  'Dashboards are composable: panels, rows, variables, and annotations.',
  'Alerting can route to Slack, PagerDuty, email, or a custom webhook.',
  'Data sources are pluggable — Prometheus, Loki, Postgres, CloudWatch, and 150+ more.',
  'In this cluster: Prometheus scrapes the workloads, Grafana makes them readable.',
];

const whyPoints = [
  {
    title: 'Prometheus is the database, not the view',
    detail: 'Prometheus stores metrics as a time-series. Querying it with PromQL from a terminal works, but nobody debugs a production incident by typing PromQL into a shell. Grafana turns those queries into graphs that show trends, spikes, and correlations at a glance.',
  },
  {
    title: 'One dashboard, many sources',
    detail: 'A single Grafana instance can show Prometheus metrics, Loki logs, and Postgres query results side by side. That means one URL for "is the cluster healthy?" instead of five different tools.',
  },
  {
    title: 'Alerting lives where the data is',
    detail: 'Grafana Alerting evaluates rules against Prometheus (or any data source) and routes notifications to Slack, PagerDuty, or email. You do not need a separate alerting service — the alert rule is defined next to the graph it watches.',
  },
  {
    title: 'Dashboards as code',
    detail: 'The ArgoCD Application below proves the point: the entire Grafana install — persistence, admin credentials, ingress, TLS — is declared in a manifest stored in Git. Rebuilding the cluster rebuilds the dashboards.',
  },
];

const manifestSections = [
  {
    title: 'Application CRD + finalizer',
    detail: 'This is an ArgoCD Application, not a raw Grafana manifest. Argo watches the Helm chart and reconciles the cluster toward it. The finalizer ensures that deleting the Application also cleans up Grafana resources — no orphaned PVCs or Services.',
  },
  {
    title: 'Helm source — chart, not a repo path',
    detail: 'Unlike the deployment pages that point at a Git path, this points at the Grafana Helm repository directly. Argo runs `helm template` on the chart and applies the result. targetRevision: "*" means "latest stable" — convenient, but it also means the chart can change underneath you without a commit.',
  },
  {
    title: 'Persistence — 10Gi',
    detail: 'Grafana stores dashboards, users, and preferences in a database (SQLite by default). Enabling persistence means those survive pod restarts. Without it, every restart resets the instance to defaults.',
  },
  {
    title: 'Admin credentials — inline password',
    detail: 'adminPassword is set directly in the manifest. That works for a lab, but it means the password is in Git. The chart supports existingSecret — point it at a Vault-backed Kubernetes Secret instead, and the password never appears in a manifest.',
  },
  {
    title: 'Service — ClusterIP',
    detail: 'Internal only. Grafana is not exposed directly; traffic flows through the Ingress. That is the correct default — only the ingress controller should talk to the Service.',
  },
  {
    title: 'Ingress + TLS',
    detail: 'Same Traefik + cert-manager pattern used everywhere else in this cluster. cert-manager issues the certificate for grafana.example.com, Traefik terminates TLS, and the Service receives plain HTTP.',
  },
  {
    title: 'Destination — monitoring namespace',
    detail: 'Grafana lives in monitoring, not default. CreateNamespace: true means Argo creates the namespace if it does not exist. This is why the Application can be applied to a fresh cluster without a manual `kubectl create namespace` step.',
  },
  {
    title: 'syncPolicy — automated + selfHeal',
    detail: 'Argo re-syncs whenever the chart or values drift from the manifest. If someone manually edits the Grafana Deployment, selfHeal reverts it. The manifest is the source of truth.',
  },
];

const gotchas = [
  {
    title: 'The admin password is in the manifest — fix this',
    detail: 'adminPassword: "changeme-in-production" is committed to Git. Anyone with repo access can read it. Use the chart\'s existingSecret option to reference a Vault-backed Secret instead. This is the single most important change before production.',
  },
  {
    title: 'targetRevision: "*" is risky for GitOps',
    detail: 'A wildcard chart version means Argo can deploy a new Grafana release without any commit to the repo. That breaks the audit trail: you cannot point at a commit and say "this is what deployed." Pin to a specific chart version (e.g. "8.5.0").',
  },
  {
    title: 'Persistence needs a StorageClass that exists',
    detail: 'The manifest requests 10Gi but does not specify a storageClassName. It uses the cluster default. If that default changes — or if Grafana is deployed to a cluster without a default — the PVC will stay Pending forever. Declare storageClassName explicitly.',
  },
  {
    title: 'Grafana does not collect metrics by itself',
    detail: 'This Application only deploys Grafana. It does not install Prometheus, node-exporter, or kube-state-metrics. Those must already exist in the cluster, and Grafana must have a data source pointing at Prometheus. Without that, Grafana opens to an empty dashboard.',
  },
  {
    title: 'The ingress host must resolve before cert-manager can issue a cert',
    detail: 'grafana.example.com needs a DNS A record pointing at the cluster before the Ingress is applied. Let\'s Encrypt validates via HTTP-01 or DNS-01; without DNS, the certificate stays in Pending and HTTPS fails.',
  },
  {
    title: 'Finalizer means manual kubectl delete can hang',
    detail: 'If Argo is unavailable when you delete the Application, the finalizer blocks deletion until Argo processes it. In an emergency, remove the finalizer manually: `kubectl patch application grafana -n argocd --type json -p \'[{"op":"remove","path":"/metadata/finalizers"}]\'`.',
  },
];

export default function DeployGrafanaPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ OBSERVABILITY / GRAFANA ]</p>
        <h1 className={style.title}>
          WHAT IS<br />
          <span className={style.titleMuted}>GRAFANA?</span>
        </h1>
        <p className={style.sub}>
          Grafana is the visualization layer of the observability stack. It
          does not collect metrics — Prometheus does. Grafana queries those
          metrics and turns them into dashboards you can actually read during
          an incident. Here is what it does, why it is in this cluster, and the
          ArgoCD Application that deploys it.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT GRAFANA IS</p>
        <h2 className={style.h2}>A window into your time-series data.</h2>
        <p className={style.lede}>
          Grafana is an open-source visualization and alerting platform.
          It connects to a time-series database — in this stack, Prometheus —
          and renders that data as graphs, tables, heatmaps, and single-stat
          panels.
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
        <h2 className={style.h2}>Prometheus stores. Grafana explains.</h2>

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
        <p className={style.label}>// THE ARGOCD APPLICATION</p>
        <h2 className={style.h2}>Declared once, reconciled forever.</h2>
        <p className={style.lede}>
          This manifest is what actually deploys Grafana. Argo watches the
          Grafana Helm chart and reconciles the cluster toward the values
          below — persistence, admin user, Ingress, TLS, namespace.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Grafana Application</h3>
              <span className={style.manifestFile}>argocd/grafana.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: grafana
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://grafana.github.io/helm-charts
    chart: grafana
    targetRevision: "*"
    helm:
      values: |
        persistence:
          enabled: true
          size: 10Gi

        adminUser: admin
        adminPassword: "changeme-in-production"

        service:
          type: ClusterIP

        ingress:
          enabled: true
          hosts:
            - grafana.example.com
          path: /
          pathType: Prefix
          annotations:
            cert-manager.io/cluster-issuer: letsencrypt-prod
          tls:
            - secretName: grafana-tls
              hosts:
                - grafana.example.com
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true`}</code>
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