import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const stackPoints = [
  'Helm is the package manager for Kubernetes — charts bundle manifests into versioned packages',
  'Charts use templating and values.yaml to customize resources per environment',
  'A chart can be installed, upgraded, and rolled back as a single unit called a release',
  'In this cluster, Helm is the packaging format for every ArgoCD Application that deploys a third-party tool',
  'ArgoCD renders Helm charts itself — no separate helm install is needed',
];

const whyPoints = [
  {
    title: 'One chart, many environments',
    detail: 'A Helm chart is a template. The same chart deploys to staging and production with different values.yaml files. Without Helm, you would maintain duplicate manifests per environment and they would drift.',
  },
  {
    title: 'Versioned releases with rollback',
    detail: 'Every Helm install or upgrade creates a new release revision. If a deploy breaks, helm rollback <release> <revision> restores the previous state [citation:3]. This is the same safety net ArgoCD provides at the Git level — Helm provides it at the chart level.',
  },
  {
    title: 'ArgoCD renders charts natively',
    detail: 'ArgoCD treats Helm as a manifest generator. It runs helm template internally, applies the result, and manages the lifecycle — without helm install ever running in the cluster. That means helm ls will not show ArgoCD-managed releases [citation:1][citation:7]. This is expected.',
  },
  {
    title: 'The standard for third-party tools',
    detail: 'Grafana, Vault, Longhorn, Mailu, and Prometheus all ship as Helm charts. Their official documentation provides charts, not raw manifests. Using Helm means updating a tool is a chart version bump — not a manual edit of 40 YAML files.',
  },
];

const chartStructure = [
  {
    title: 'Chart.yaml',
    detail: 'Metadata: chart name, chart version, app version, description, dependencies. The chart version and app version are independent — you can bump the chart (add a template) without changing the app version, or vice versa [citation:14].',
  },
  {
    title: 'values.yaml',
    detail: 'Default configuration values. These are overridden at install time — by a values file, a --set flag, or (in ArgoCD) a values block or valueFiles array in the Application manifest [citation:10].',
  },
  {
    title: 'templates/',
    detail: 'Kubernetes manifest templates. Placeholders like {{ .Values.replicaCount }} are replaced with values during rendering. Helm sends the rendered result to the Kubernetes API — it does not patch the cluster directly [citation:9].',
  },
];

const commands = [
  {
    name: 'helm repo add',
    detail: 'Adds a chart repository and caches its index locally. Must run helm repo update before installing from that repo to get the latest chart versions [citation:3].',
    code: `helm repo add grafana https://grafana.github.io/helm-charts
helm repo update`,
  },
  {
    name: 'helm show values',
    detail: 'Prints the default values.yaml for a chart. This is how you discover what can be overridden before writing your own values file [citation:3].',
    code: `helm show values grafana/grafana`,
  },
  {
    name: 'helm install',
    detail: 'Installs a chart as a release. The --values flag points at your override file. --version pins the chart version [citation:3].',
    code: `helm install my-grafana grafana/grafana \\
  --version 8.5.0 \\
  --values my-values.yaml \\
  --namespace monitoring`,
  },
  {
    name: 'helm upgrade',
    detail: 'Upgrades an existing release. Can change chart version and/or values. Each upgrade creates a new revision [citation:3].',
    code: `helm upgrade my-grafana grafana/grafana \\
  --version 8.6.0 \\
  --values my-values.yaml`,
  },
  {
    name: 'helm rollback',
    detail: 'Restores a release to a previous revision. This is the safety net when an upgrade breaks something [citation:3].',
    code: `helm rollback my-grafana 1`,
  },
  {
    name: 'helm list',
    detail: 'Lists releases managed by Helm in the current namespace. Note: ArgoCD-managed charts will NOT appear here because ArgoCD does not create Helm release records [citation:1][citation:7].',
    code: `helm list --namespace monitoring`,
  },
];

const gotchas = [
  {
    title: 'ArgoCD-managed charts do not appear in helm ls',
    detail: 'This is the most common confusion. ArgoCD renders the chart and applies the manifests, but does not create a Helm release record in the cluster. Use argocd app get <name> to inspect the application, not helm ls [citation:1][citation:7].',
  },
  {
    title: 'helm install is for local/CI use only',
    detail: 'In this cluster, you never run helm install against the cluster directly. ArgoCD is the only writer. Running helm install manually would create resources outside Git — ArgoCD would then report the app as OutOfSync and selfHeal would revert it.',
  },
  {
    title: 'targetRevision controls the chart version',
    detail: 'In an ArgoCD Application, targetRevision is the chart version. A wildcard "*" means "latest stable" — convenient for a lab, wrong for production. Pin the version so a chart release cannot change the cluster without a commit [citation:7].',
  },
  {
    title: 'values precedence matters',
    detail: 'In ArgoCD, valuesObject takes precedence over values (inline YAML), which takes precedence over valueFiles [citation:10]. If a value is not taking effect, check the precedence order before assuming the chart is broken.',
  },
  {
    title: 'Chart CRDs need special handling',
    detail: 'Some charts ship CRDs. ArgoCD applies them before the rest of the chart by default, but skipCrds: true can be set if you manage CRDs separately [citation:10]. Longhorn and Vault both ship CRDs — check before changing this.',
  },
  {
    title: 'helm repo update is not automatic',
    detail: 'The local chart index is cached. If a chart version exists in the repository but helm install says "not found", run helm repo update first. ArgoCD does not use this cache — it fetches the chart directly.',
  },
];

export default function DeployHelmPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ INFRA / HELM ]</p>
        <h1 className={style.title}>
          PACKAGE<br />
          <span className={style.titleMuted}>WITH HELM</span>
        </h1>
        <p className={style.sub}>
          Helm is how third-party tools are packaged for this cluster. Grafana,
          Vault, Longhorn, and Mailu all ship as charts. Here is what a chart
          actually is, how ArgoCD renders it, and the CLI commands you need —
          even though ArgoCD is the only thing that writes to the cluster.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT IT IS</p>
        <h2 className={style.h2}>The package manager for Kubernetes.</h2>

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
        <h2 className={style.h2}>One chart, many tools, one format.</h2>

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
        <p className={style.label}>// CHART STRUCTURE</p>
        <h2 className={style.h2}>Three files that make a chart.</h2>

        <div className={style.manifests}>
          {chartStructure.map((c, i) => (
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
        <p className={style.label}>// COMMANDS</p>
        <h2 className={style.h2}>What you run locally.</h2>
        <p className={style.lede}>
          These commands are for inspecting charts and testing values. In
          production, ArgoCD renders the chart — you do not run helm install
          against the cluster.
        </p>

        <div className={style.manifests}>
          {commands.map((c, i) => (
            <article key={c.name} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{c.name}</h3>
              </div>
              <p className={style.manifestWhy}>{c.detail}</p>
              <pre className={style.code}>
                <code>{c.code}</code>
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