import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SiteContext } from './SiteContext.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import './index.css';

// Import Pages
import HomePage from './pages/HomePage/index.jsx';
import DevOpsPage from './pages/DevOpsPage/index.jsx';
import Vite from './pages/Deployment-Guides/Vite/index.jsx';
import Node from './pages/Deployment-Guides/Node/index.jsx';
import Go from './pages/Deployment-Guides/Go/index.jsx';
import Python from './pages/Deployment-Guides/Python/index.jsx';
import Laravel from './pages/Deployment-Guides/Laravel/index.jsx';
import GithubActions from './pages/Deployment-Guides/GithubActions/index.jsx';
import Grafana from './pages/Deployment-Guides/Grafana/index.jsx';
import Vault from './pages/Deployment-Guides/Vault/index.jsx';
import UptimeKuma from './pages/Deployment-Guides/UptimeKuma/index.jsx';
import Longhorn from './pages/Deployment-Guides/Longhorn/index.jsx';
import RabbitMQ from './pages/Deployment-Guides/RabbitMQ/index.jsx';
import Mailu from './pages/Deployment-Guides/Mailu/index.jsx';
import Redis from './pages/Deployment-Guides/Redis/index.jsx';
import MinIO from './pages/Deployment-Guides/MinIO/index.jsx';
import Helm from './pages/Deployment-Guides/Helm/index.jsx';
import ArgoCD from './pages/Deployment-Guides/ArgoCD/index.jsx';
import GitOpsRepo from './pages/Deployment-Guides/GitOpsRepo/index.jsx';
import ClusterSetup from './pages/Deployment-Guides/ClusterSetup/index.jsx';
import DeploymentGuides from './pages/Deployment-Guides/index.jsx';


const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/devops', element: <DevOpsPage /> },
  { path: '/deployment-guides/vite', element: <Vite /> },
  { path: '/deployment-guides/node', element: <Node /> },
  { path: '/deployment-guides/go', element: <Go /> },
  { path: '/deployment-guides/python', element: <Python /> },
  { path: '/deployment-guides/laravel', element: <Laravel /> },
  { path: '/deployment-guides/github-actions', element: <GithubActions /> },
  { path: '/deployment-guides/grafana', element: <Grafana /> },
  { path: '/deployment-guides/vault', element: <Vault /> },
  { path: '/deployment-guides/uptime-kuma', element: <UptimeKuma /> },
  { path: '/deployment-guides/longhorn', element: <Longhorn /> },
  { path: '/deployment-guides/rabbitmq', element: <RabbitMQ /> },
  { path: '/deployment-guides/mailu', element: <Mailu /> },
  { path: '/deployment-guides/redis', element: <Redis /> },
  { path: '/deployment-guides/minio', element: <MinIO /> },
  { path: '/deployment-guides/helm', element: <Helm /> },
  { path: '/deployment-guides/argocd', element: <ArgoCD /> },
  { path: '/deployment-guides/gitops-repo', element: <GitOpsRepo /> },
  { path: '/deployment-guides/cluster-setup', element: <ClusterSetup /> },
  { path: '/deployment-guides', element: <DeploymentGuides /> },
]);

export default function AppWrapper() {
  const getValue = (key, fallback = '') => sessionStorage.getItem(key) || fallback;

  // Global site state
  const [theme, setTheme] = useState(() => getValue('theme', 'dark'));
  const [activeSection, setActiveSection] = useState(() => getValue('activeSection', 'hero'));
  const [hasSeenIntro, setHasSeenIntro] = useState(() => {
    return localStorage.getItem('hasSeenIntro') === 'true';
  });
  const [contactOpen, setContactOpen] = useState(false);
  const [filter, setFilter] = useState('All');

  // Sync state to sessionStorage
  useEffect(() => {
    if (theme) sessionStorage.setItem('theme', theme);
    else sessionStorage.removeItem('theme');
  }, [theme]);

  useEffect(() => {
    if (activeSection) sessionStorage.setItem('activeSection', activeSection);
    else sessionStorage.removeItem('activeSection');
  }, [activeSection]);

  useEffect(() => {
    if (filter) sessionStorage.setItem('filter', filter);
    else sessionStorage.removeItem('filter');
  }, [filter]);

  useEffect(() => {
    localStorage.setItem('hasSeenIntro', JSON.stringify(hasSeenIntro));
  }, [hasSeenIntro]);

  return (
    <ErrorBoundary>
      <SiteContext.Provider
        value={{
          theme, setTheme,
          activeSection, setActiveSection,
          hasSeenIntro, setHasSeenIntro,
          contactOpen, setContactOpen,
          filter, setFilter,
        }}
      >
        <RouterProvider router={router} />
      </SiteContext.Provider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')).render(<AppWrapper />);