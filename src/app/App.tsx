import { useEffect } from 'preact/hooks';
import { startLogin } from '../ha/live';
import { securityReport } from '../model/status';
import { BottomNav } from '../ui/components/BottomNav';
import { EntitySheet } from '../ui/components/EntitySheet';
import { MoreMenu } from '../ui/components/MoreMenu';
import { Icon } from '../ui/components/Icon';
import { Toasts } from '../ui/components/Toasts';
import { CategoryPage, DevicesPage } from '../ui/pages/DevicesPage';
import { EnergyPage } from '../ui/pages/EnergyPage';
import { HomePage } from '../ui/pages/HomePage';
import { InfoPage, NetworkPage, PersonalPage, SettingsPage, ShoppingPage, StatusPage, WeatherPage } from '../ui/pages/AltroPages';
import { SecurityPage } from '../ui/pages/SecurityPage';
import { moreMenuGroups } from '../ui/moreMenu';
import { readPersonal } from '../model/profile';
import { RoomPage, RoomsPage } from '../ui/pages/RoomsPage';
import { route } from './router';
import { boot, connection, house, now, phase, profile, source, states } from './store';

export function App() {
  useEffect(() => void boot(), []);
  const ph = phase.value;
  if (ph.kind === 'boot') return <Splash text="Connessione a Home Assistant…" />;
  if (ph.kind === 'login') return <Login expired={ph.expired} />;
  if (ph.kind === 'error') return <ErrorScreen message={ph.message} />;
  return <Shell />;
}

function Shell() {
  const r = route.value;
  const h = house.value;
  if (!h) return <Splash text="Preparazione della casa…" />;
  const security = securityReport(h, states.value);
  const p = profile.value;
  const phone = p.kind === 'person' ? p.devices.find((d) => d.primary) : undefined;
  const hasPersonal = !!phone && Object.keys(readPersonal(phone, source.value!.registries.entities, states.value, now.value)).length > 1;
  const groups = moreMenuGroups({ hasPersonal, securityBadge: security.badge, canLogout: source.value?.kind === 'live' });
  return (
    <>
      <a class="skip-link" href="#main">
        Vai al contenuto
      </a>
      {source.value?.kind === 'demo' && (
        <p class="demo-banner" role="note">
          Istantanea di sviluppo · dati reali non in tempo reale
        </p>
      )}
      {connection.value === 'reconnecting' && (
        <p class="demo-banner demo-banner--warn" role="status">
          Riconnessione a Home Assistant…
        </p>
      )}
      <main id="main" class="main" tabIndex={-1}>
        <Page tab={r.tab} param={r.param} />
      </main>
      <MoreMenu groups={groups} />
      <BottomNav moreBadge={security.critical} />
      <EntitySheet />
      <Toasts />
    </>
  );
}

function Page({ tab, param }: { tab: string; param?: string }) {
  switch (tab) {
    case 'stanze':
      return param ? <RoomPage id={param} /> : <RoomsPage />;
    case 'dispositivi':
      return param ? <CategoryPage id={param} /> : <DevicesPage />;
    case 'energia':
      return <EnergyPage />;
    case 'altro':
      switch (param) {
        case 'sicurezza': return <SecurityPage />;
        case 'personale': return <PersonalPage />;
        case 'stato': return <StatusPage />;
        case 'meteo': return <WeatherPage />;
        case 'spesa': return <ShoppingPage />;
        case 'rete': return <NetworkPage />;
        case 'impostazioni': return <SettingsPage />;
        case 'info': return <InfoPage />;
        default: return <HomePage />;
      }
    default:
      return <HomePage />;
  }
}

function Splash({ text }: { text: string }) {
  return (
    <div class="screen" role="status" aria-live="polite">
      <span class="screen__mark" aria-hidden="true">
        <Icon name="home" size="hero" />
      </span>
      <p class="screen__text">{text}</p>
    </div>
  );
}

function Login({ expired }: { expired?: boolean }) {
  return (
    <div class="screen">
      <span class="screen__mark" aria-hidden="true">
        <Icon name="home" size="hero" />
      </span>
      <h1 class="screen__title">Casa.</h1>
      <p class="screen__text">
        {expired ? 'La sessione è scaduta. Accedi di nuovo con il tuo account.' : 'Accedi con il tuo account di Home Assistant.'}
      </p>
      <button type="button" class="button button--primary button--pill" onClick={startLogin}>
        Accedi con Home Assistant
      </button>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div class="screen" role="alert">
      <span class="screen__mark screen__mark--error" aria-hidden="true">
        <Icon name="alert" size="hero" />
      </span>
      <h1 class="screen__title">Connessione non riuscita.</h1>
      <p class="screen__text">{message}</p>
      <button type="button" class="button button--primary button--pill" onClick={() => window.location.reload()}>
        Riprova
      </button>
    </div>
  );
}
