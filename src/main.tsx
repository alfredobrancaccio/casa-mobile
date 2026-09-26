// Stili prima dell'app: il tema scelto (app/theme.ts) legge i token gia caricati.
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { render } from 'preact';
import { App } from './app/App';

render(<App />, document.getElementById('app')!);
