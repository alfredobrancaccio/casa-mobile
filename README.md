# casa-mobile

Dashboard web mobile-first per Home Assistant, personalizzata per utente.
Progetto indipendente dalla vecchia app `/config/www/pannello`.

## Avvio locale

```bash
cd casa-mobile
npm install
npm run dev
```

Apri <http://localhost:5173>. Il server di sviluppo inoltra `/auth`, `/api` e le risorse
del login a Home Assistant (`http://172.16.137.20:8123`, modificabile con `HA_URL` in `.env.local`),
cosi l'app e il login di HA risultano sulla stessa origine.

1. Premi **Accedi con Home Assistant**.
2. Entra con il **tuo** account (alfredo, giacomo, elisabetta, salvatore…).
3. L'app legge `auth/current_user` e sceglie il profilo in base all'id dell'account.

I token restano nel `localStorage` di quel browser. Nessun token e nel codice.

### Istantanea di sviluppo (senza login)

Per lavorare sulla UI senza credenziali:

```bash
py tools/make_snapshot.py --token-file ../../HA/.ha_token
```

Lo script usa `ha_tools` in **sola lettura** e salva in `dev-data/snapshot.json` (escluso da git)
uno stato reale ripulito: senza coordinate, indirizzi di rete o immagini con token.
Poi apri `http://localhost:5173/?demo=alfredo` (oppure `giacomo`, `elisabetta`, `salvatore`, `casa`).
Questa modalita esiste solo con `npm run dev` e non entra nella build.

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo con proxy verso HA |
| `npm run build` | controllo dei tipi + build in `dist/` |
| `npm test` | test della logica (profili, capability, modello casa, comandi, energia) |

## Struttura

```
src/
  config/     configurazione centrale: aree, profili, dispositivi personali, energia
  ha/         sorgente dati (live via WebSocket, demo da istantanea), comandi
  model/      logica pura: modello casa, profilo, stato, energia, riepiloghi
  ui/         componenti, pagine, icone
  app/        store (signals), router, shell
tools/        script di sviluppo in sola lettura
```

Tutti gli entity_id specifici stanno in `src/config/`. Per cambiare telefono a una persona
basta aggiornare `haDeviceId` in `src/config/profiles.ts`.

## Personalizzazione

- Ruoli delle aree e proprietari: `AREAS` in `src/config/house.ts`
  (`private`, `shared_personal`, `common`, `service`, `technical`, `ignored`).
- Regole centralizzate: `src/model/areaPolicy.ts` (`isAreaPersonalForUser`, `canAreaAppearInHome`,
  `canAreaAppearInShortcuts`, ...). La Home e costruita da `src/model/home.ts`.
- La Home mostra solo le aree personali proprie, le comuni e quelle di servizio;
  la pagina Stanze resta completa per tutti. I profili non limitano i controlli.

## Navigazione

Barra inferiore a icone: Home, Stanze, Dispositivi, Energia, Altro.
"Altro" apre un menu sopra la schermata corrente con Sicurezza, Meteo e ambiente,
Lista della spesa, I miei dispositivi, Stato e manutenzione, Rete e connessione,
Impostazioni, Informazioni ed Esci.

## Controlli: sola lettura

Ogni azione passa da `src/ha/commands.ts`. Il gateway attuale **non invia comandi**:
costruisce la chiamata di servizio, la registra in console e mostra un avviso.
L'attivazione dei controlli reali richiede un'autorizzazione esplicita.

## Deploy

Non ancora effettuato. La build (`dist/`) e pensata per essere servita da
`/config/www/casa-mobile/`, cioe `/local/casa-mobile/index.html`.
