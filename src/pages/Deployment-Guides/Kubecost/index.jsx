import style from './index.module.css';
import { DeploymentBreadcrumb, DeploymentPrevNext } from '../../../components/DeploymentNav';

const overviewPoints = [
  'Kubecost is the cost-visibility layer — it does not bill you, it explains the bill.',
  'It watches Kubernetes objects (pods, PVCs, nodes) and maps them to cloud or on-prem prices.',
  'The UI answers: who is spending, on what, and is it worth it?',
  'It runs entirely inside the cluster — no external SaaS account required for the free tier.',
  'Alerts can fire when a namespace exceeds a budget or when a workload is idle.',
  'In this cluster: Kubecost reads Longhorn PVCs and Traefik traffic to price every workload.',
];

const whyPoints = [
  {
    title: 'Kubernetes hides cost behind abstraction',
    detail: 'A Deployment does not have a price tag. Kubecost reconstructs cost from the underlying nodes, disks, and network egress — then attributes it back to the namespace, controller, or label that caused it.',
  },
  {
    title: 'Idle resources are visible, not guessed',
    detail: 'The UI separates "requested" from "used." A pod requesting 3Gi and using 200Mi shows up as waste. That is the number you act on when trimming the cluster.',
  },
  {
    title: 'The free tier is enough for a homelab',
    detail: 'Kubecost Free covers unlimited clusters up to 250 cores each, with 15-day metric retention. A single-node K3s cluster sits far below that ceiling, so the entire stack runs at zero cost.',
  },
  {
    title: 'Everything is GitOps-managed',
    detail: 'The installation is a Helm chart plus a values file. Once ArgoCD adopts the release, the cost dashboards are as reproducible as any other workload in the cluster.',
  },
];

const installSteps = [
  {
    title: '1. Export the K3s kubeconfig',
    detail: 'Helm defaults to ~/.kube/config, which does not exist on a fresh K3s install. Point it at the K3s admin config first, or every Helm command will fail with "cluster unreachable".',
    code: `export KUBECONFIG=/etc/rancher/k3s/k3s.yaml`,
  },
  {
    title: '2. Write kubecost-values.yaml',
    detail: 'Helm --set cannot express comma-separated annotation values. Use a values file instead. This is also the file ArgoCD will render from later.',
    code: `global:
  clusterId: homelab-k8s
  defaultStorageClass: longhorn

persistentVolume:
  storageClass: longhorn

aggregator:
  aggregatorDbStorage:
    storageRequest: 10Gi

ingress:
  enabled: true
  className: traefik
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.entrypoints: "web,websecure"
    traefik.ingress.kubernetes.io/router.middlewares: "kubecost-kubecost-auth@kubernetescrd"
  hosts:
    - kubecost.example.domain
  tls:
    - secretName: kubecost-tls
      hosts:
        - kubecost.example.domain`,
  },
  {
    title: '3. Create the basic-auth Secret and Middleware',
    detail: 'These live outside the Helm release on purpose. Same Secret name in three namespaces (argocd, longhorn-system, kubecost) means three independent credential sets — none of them shared.',
    code: `htpasswd -nb kubecost 'YourKubecostPassword!' > /tmp/auth
kubectl create secret generic basic-auth \\
  --from-file=users=/tmp/auth \\
  -n kubecost
rm /tmp/auth

kubectl apply -f kubecost-auth-middleware.yaml`,
  },
  {
    title: '4. Install with Helm',
    detail: 'The first install will take several minutes. Pods come up in two waves: controllers and frontend first, aggregator and local-store after their PVCs bind.',
    code: `helm upgrade --install kubecost kubecost \\
  --repo https://kubecost.github.io/kubecost \\
  --namespace kubecost \\
  -f kubecost-values.yaml`,
  },
  {
    title: '5. Watch the pods settle',
    detail: 'kubecost-aggregator-0 is the slowest. If it stays in ContainerCreating for more than two minutes, check Longhorn volume state — the default 128Gi request does not fit on a single node and must be reduced (see gotchas).',
    code: `kubectl get pods -n kubecost
kubectl get pvc -n kubecost
kubectl get volumes.longhorn.io -n longhorn-system`,
  },
  {
    title: '6. Verify TLS and auth',
    detail: 'cert-manager issues kubecost-tls in the background. The first request should return 401 (no credentials), and the second should return 200.',
    code: `curl -I https://kubecost.example.domain
curl -u kubecost:'YourKubecostPassword!' -I https://kubecost.example.domain`,
  },
];

const argocdAdoption = [
  {
    title: 'Why adoption, not reinstallation',
    detail: 'The resources already exist after the Helm install. ArgoCD does not own the Helm release secret, so the only way to bring the release under GitOps is to render the same chart with the same values and patch the live objects with ServerSideApply.',
  },
  {
    title: 'ServerSideApply is the mechanism',
    detail: 'Without it, ArgoCD would try to recreate objects that already exist and the sync would fail. With it, ArgoCD patches managedFields and adopts ownership without touching the running pods or bound PVCs.',
  },
  {
    title: 'Diff before sync',
    detail: 'Always run argocd app diff first. A clean diff shows only metadata drift (resourceVersion, managedFields). Any change to a PVC or a Deployment strategy means the values are wrong — stop and fix the Application before syncing.',
  },
  {
    title: 'After adoption, Helm is retired',
    detail: 'Do not run helm upgrade again. ArgoCD reconciles on drift, and a manual Helm release would conflict with it. The stale sh.helm.release.v1.kubecost.* secret can be left alone or deleted — it has no effect either way.',
  },
];

const gotchas = [
  {
    title: 'Default aggregator storage is 128Gi and will not schedule',
    detail: 'On a single-node Longhorn disk, a 128Gi PVC fails with "insufficient storage" and the volume enters a faulted state. The aggregator pod then hangs in ContainerCreating forever. The fix is aggregator.aggregatorDbStorage.storageRequest: 10Gi in the values file.',
  },
  {
    title: 'Helm --set cannot parse comma-separated annotations',
    detail: 'Passing web,websecure with --set fails with "key websecure has no value". Backslash escaping does not work in Helms strvals parser. Use a values file for anything involving commas, lists, or nested annotations.',
  },
  {
    title: 'The Ingress must be enabled for cert-manager to run',
    detail: 'cert-manager only creates a certificate when it sees an Ingress referencing the ClusterIssuer. If ingress.enabled is false, no certificate is requested and HTTPS on kubecost.example.domain will not work — even if the secret exists.',
  },
  {
    title: 'ArgoCD sync will not prune the Middleware or Secret',
    detail: 'Both objects live outside the Helm chart, so ArgoCD does not track them. They survive an Application deletion and are not reverted by selfHeal. If you want them GitOps-managed too, move them into extraManifests or a separate Application.',
  },
  {
    title: 'Kubecost 3.x needs ~25 minutes before the UI is useful',
    detail: 'The aggregator ingests metrics in batches. The first UI load shows a progress bar at the top. Cost data populates gradually — do not assume something is broken in the first ten minutes.',
  },
  {
    title: 'Basic auth over plain HTTP sends credentials in cleartext',
    detail: 'The Traefik annotation web,websecure keeps port 80 reachable. If basic auth is active on both entrypoints, a curl over http:// leaks the credential. Restrict the router to websecure only, or add a redirect middleware.',
  },
];

export default function DeployKubecostPage() {
  return (
    <div className={style.page}>

      <DeploymentBreadcrumb />

      <section className={style.hero}>
        <p className={style.label}>[ OBSERVABILITY / KUBECOST ]</p>
        <h1 className={style.title}>
          HOW TO<br />
          <span className={style.titleMuted}>INSTALL KUBECOST.</span>
        </h1>
        <p className={style.sub}>
          Kubecost is the cost-visibility layer of the observability stack. It
          does not collect metrics — Prometheus does. Kubecost reads those
          metrics, maps them to node and disk pricing, and shows which namespace
          is burning money. Here is the exact install procedure used in this
          cluster, the ArgoCD Application that adopts the release, and the
          gotchas that cost us hours.
        </p>
      </section>

      <section className={style.section}>
        <p className={style.label}>// WHAT KUBECOST IS</p>
        <h2 className={style.h2}>A price tag for every Kubernetes object.</h2>
        <p className={style.lede}>
          Kubecost is an open-source cost-monitoring platform for Kubernetes.
          It runs inside the cluster, queries Prometheus for usage, joins that
          against node and storage pricing, and attributes cost to namespaces,
          controllers, and labels.
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
        <h2 className={style.h2}>Kubernetes hides cost. Kubecost exposes it.</h2>

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
        <p className={style.label}>// THE INSTALL PROCEDURE</p>
        <h2 className={style.h2}>Six steps, in order.</h2>
        <p className={style.lede}>
          Each step is a prerequisite for the next. Skipping the kubeconfig
          export makes Helm unreachable. Skipping the values file makes Helm
          choke on annotations. Skipping the Secret makes Traefik return 500
          instead of 401.
        </p>

        <div className={style.manifests}>
          {installSteps.map((s, i) => (
            <article key={s.title} className={style.manifest}>
              <div className={style.manifestHead}>
                <span className={style.manifestNum}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={style.manifestName}>{s.title}</h3>
              </div>
              <p className={style.manifestWhy}>{s.detail}</p>
              <pre className={style.code}>
                <code>{s.code}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>

      <section className={style.section}>
        <p className={style.label}>// ADOPTING WITH ARGOCD</p>
        <h2 className={style.h2}>Helm installs once. ArgoCD reconciles forever.</h2>
        <p className={style.lede}>
          The Helm release is the bootstrap. The ArgoCD Application is the
          long-term owner. Adoption works because ArgoCD renders the same chart
          with the same values — the only difference is who applies the result.
        </p>

        <div className={style.manifests}>
          <article className={style.manifest}>
            <div className={style.manifestHead}>
              <h3 className={style.manifestName}>Kubecost Application</h3>
              <span className={style.manifestFile}>argocd/kubecost.yaml</span>
            </div>
            <pre className={style.code}>
              <code>{`apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kubecost
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://kubecost.github.io/kubecost
    chart: kubecost
    targetRevision: 3.3.1
    helm:
      values: |
        global:
          clusterId: homelab-k8s
          defaultStorageClass: longhorn
        persistentVolume:
          storageClass: longhorn
        aggregator:
          aggregatorDbStorage:
            storageRequest: 10Gi
        ingress:
          enabled: true
          className: traefik
          annotations:
            cert-manager.io/cluster-issuer: letsencrypt-prod
            traefik.ingress.kubernetes.io/router.entrypoints: "web,websecure"
            traefik.ingress.kubernetes.io/router.middlewares: "kubecost-kubecost-auth@kubernetescrd"
          hosts:
            - kubecost.example.domain
          tls:
            - secretName: kubecost-tls
              hosts:
                - kubecost.example.domain
  destination:
    server: https://kubernetes.default.svc
    namespace: kubecost
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
      - CreateNamespace=false`}</code>
            </pre>
          </article>
        </div>

        <h3 className={style.subhead}>What adoption actually does</h3>
        <div className={style.checklist}>
          {argocdAdoption.map(s => (
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