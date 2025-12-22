# 🎾 Filosofia Database e Acquisizione Dati

> Documento di riferimento per capire come funziona il sistema di raccolta, organizzazione e consumo dei dati tennis.

---

## 📋 Indice

1. [Visione d'Insieme](#visione-dinsieme)
2. [Fonti Dati](#fonti-dati)
   - [SofaScore Scraper](#sofascore-scraper)
   - [Import XLSX](#import-xlsx)
3. [Schema Database](#schema-database)
4. [Flusso Dati](#flusso-dati)
5. [Dati Mancanti e Soluzioni](#dati-mancanti-e-soluzioni)
6. [Frontend - Consumo Dati](#frontend---consumo-dati)
7. [Sviluppi Futuri](#sviluppi-futuri)

---

## 🎯 Visione d'Insieme

Il sistema è diviso in **due sezioni principali**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SEZIONE 1: ACQUISIZIONE DATI                     │
│                                                                      │
│   ┌──────────────┐         ┌──────────────┐                         │
│   │  SofaScore   │         │    XLSX      │                         │
│   │   Scraper    │         │   Import     │                         │
│   └──────┬───────┘         └──────┬───────┘                         │
│          │                        │                                  │
│          └────────────┬───────────┘                                  │
│                       ▼                                              │
│              ┌────────────────┐                                      │
│              │   DATABASE     │                                      │
│              │   (Supabase)   │                                      │
│              └────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     SEZIONE 2: CONSUMO DATI                          │
│                                                                      │
│              ┌────────────────┐                                      │
│              │   DATABASE     │                                      │
│              │   (Supabase)   │                                      │
│              └────────┬───────┘                                      │
│                       │                                              │
│                       ▼                                              │
│              ┌────────────────┐                                      │
│              │  Backend API   │                                      │
│              │   (Node.js)    │                                      │
│              └────────┬───────┘                                      │
│                       │                                              │
│                       ▼                                              │
│              ┌────────────────┐                                      │
│              │   Frontend     │                                      │
│              │    (React)     │                                      │
│              └────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Fonti Dati

### SofaScore Scraper

**File**: `backend/scraper/sofascoreScraper.js`

Lo scraper SofaScore recupera dati **in tempo reale** e **storici** dalle API di SofaScore.

#### Dati Recuperati:

| Categoria | Dati | Endpoint API | Dove Salvati |
|-----------|------|--------------|--------------|
| **Match Base** | ID, data, round, status, punteggio | `/api/v1/event/{id}` | `matches_new` |
| **Giocatori** | Nome, paese, ranking, seed | `/api/v1/event/{id}` | `players_new` |
| **Torneo** | Nome, categoria, superficie | `/api/v1/event/{id}` | `tournaments_new` |
| **Statistiche** | Ace, doppi falli, % prima, break points | `/api/v1/event/{id}/statistics` | `match_statistics_new` |
| **Momentum** | Power rankings game-by-game | `/api/v1/event/{id}/tennis-power-rankings` | `match_power_rankings_new` |
| **Point by Point** | Ogni punto giocato | `/api/v1/event/{id}/point-by-point` | `match_point_by_point_new` |
| **Live Score** | Punteggio in tempo reale | WebSocket | Cache in memoria |

#### Esempio Chiamata Scraper:
```javascript
const scraper = require('./scraper/sofascoreScraper');

// Scrape singolo match
const matchData = await scraper.scrapeMatch(eventId);

// Scrape match live
const liveMatches = await scraper.scrapeLiveMatches();
```

#### Punti di Forza SofaScore:
- ✅ Dati dettagliati (statistiche, momentum)
- ✅ Aggiornamenti real-time
- ✅ Point-by-point completo
- ✅ ID univoci per giocatori e tornei

#### Limitazioni SofaScore:
- ❌ Rate limiting API
- ❌ Non tutti i match hanno momentum
- ❌ Dati storici limitati
- ❌ Nessuna quota betting

---

### Import XLSX

**File**: `backend/importXlsx.js`

Import di dati storici da file Excel (es. tennis-data.co.uk).

#### Dati Recuperati:

| Campo XLSX | Descrizione | Dove Salvato |
|------------|-------------|--------------|
| `Winner` | Nome vincitore | `players_new` + `matches_new.winner_id` |
| `Loser` | Nome perdente | `players_new` + `matches_new.player2_id` |
| `WRank` / `LRank` | Ranking ATP | `matches_new.player1_rank/player2_rank` |
| `WPts` / `LPts` | Punti ATP | `player_rankings` |
| `Surface` | Superficie | `matches_new.surface` |
| `Tournament` | Nome torneo | `tournaments_new` |
| `Round` | Fase torneo | `matches_new.round` |
| `Date` | Data match | `matches_new.match_date` |
| `W1-W5, L1-L5` | Punteggio set | `matches_new.set1_p1`, etc. |
| `B365W/B365L` | Quote Bet365 | `match_odds` |
| `PSW/PSL` | Quote Pinnacle | `match_odds` |
| `MaxW/MaxL` | Quote Max | `match_odds` |
| `AvgW/AvgL` | Quote Media | `match_odds` |
| `Best of` | Al meglio di | `matches_new.best_of` |

#### Esempio Import XLSX:
```javascript
const importer = require('./importXlsx');

// Import file
await importer.importFile('./data/atp_2024.xlsx');
```

#### Punti di Forza XLSX:
- ✅ Dati storici completi (anni di match)
- ✅ Quote betting multiple
- ✅ Ranking al momento del match
- ✅ Tutti i tornei (anche minori)

#### Limitazioni XLSX:
- ❌ Nessuna statistica dettagliata
- ❌ Nessun momentum/power ranking
- ❌ Nessun point-by-point
- ❌ Nomi giocatori possono variare (es. "De Minaur" vs "de Minaur")

---

## 🗄️ Schema Database

### Entità Principali

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENTITÀ SEPARATE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐ │
│  │    PLAYERS      │     │     MATCHES      │     │  TOURNAMENTS   │ │
│  │  (Tennista)     │     │    (Partita)     │     │   (Torneo)     │ │
│  ├─────────────────┤     ├─────────────────┤     ├────────────────┤ │
│  │ • id            │     │ • id            │     │ • id           │ │
│  │ • name          │     │ • player1_id ───┼─────│ • name         │ │
│  │ • country       │     │ • player2_id    │     │ • surface      │ │
│  │ • birth_date    │     │ • tournament_id─┼─────│ • category     │ │
│  │ • height        │     │ • match_date    │     │ • country      │ │
│  │ • plays (R/L)   │     │ • score         │     │ • prize_money  │ │
│  │ • turned_pro    │     │ • winner_id     │     └────────────────┘ │
│  │ • sofascore_id  │     │ • round         │                        │
│  └────────┬────────┘     │ • best_of       │                        │
│           │              │ • data_quality  │                        │
│           │              └────────┬────────┘                        │
└───────────┼────────────────────────┼────────────────────────────────┘
            │                        │
            ▼                        ▼
┌───────────────────────┐  ┌───────────────────────┐
│   PLAYER_ALIASES      │  │   MATCH_DATA_SOURCES  │
│ (Per matching nomi)   │  │  (Traccia fonti)      │
├───────────────────────┤  ├───────────────────────┤
│ • player_id           │  │ • match_id            │
│ • alias_name          │  │ • source_type         │
│ • alias_normalized    │  │ • has_statistics      │
│ • source              │  │ • has_power_rankings  │
└───────────────────────┘  │ • has_point_by_point  │
                           │ • has_odds            │
                           └───────────────────────┘
```

### Tabelle Dettaglio

| Tabella | Scopo | Fonte Principale |
|---------|-------|------------------|
| `players_new` | Anagrafica tennista | SofaScore + XLSX |
| `player_aliases` | Mapping nomi varianti | Auto-generato |
| `player_rankings` | Storico ranking settimanale | XLSX |
| `player_career_stats` | Statistiche carriera per superficie | Calcolato |
| `tournaments_new` | Info tornei | SofaScore + XLSX |
| `matches_new` | Dati base partita | SofaScore + XLSX |
| `match_data_sources` | Quali fonti hanno dati | Auto-generato |
| `match_statistics_new` | Stats dettagliate partita | SofaScore |
| `match_power_rankings_new` | Momentum game-by-game | SofaScore |
| `match_point_by_point_new` | Ogni punto | SofaScore |
| `match_odds` | Quote betting | XLSX |
| `head_to_head` | H2H tra giocatori | Calcolato |

---

## 🔄 Flusso Dati

### 1. Acquisizione

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FLUSSO ACQUISIZIONE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  XLSX Import:                                                        │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────┐                │
│  │  File    │───▶│ Normalizza  │───▶│ findOrCreate │                │
│  │  .xlsx   │    │   nomi      │    │   Player     │                │
│  └──────────┘    └─────────────┘    └──────┬───────┘                │
│                                            │                         │
│                                            ▼                         │
│                                     ┌──────────────┐                │
│                                     │  Crea Match  │                │
│                                     │  + Odds      │                │
│                                     └──────┬───────┘                │
│                                            │                         │
│  SofaScore:                                │                         │
│  ┌──────────┐    ┌─────────────┐          │                         │
│  │  API     │───▶│   Scrape    │          │                         │
│  │ Request  │    │   Event     │          │                         │
│  └──────────┘    └─────────────┘          │                         │
│                         │                  │                         │
│                         ▼                  │                         │
│                  ┌─────────────┐           │                         │
│                  │ findOrCreate│           │                         │
│                  │   Player    │           │                         │
│                  └──────┬──────┘           │                         │
│                         │                  │                         │
│                         ▼                  ▼                         │
│                  ┌──────────────────────────────┐                    │
│                  │          DATABASE            │                    │
│                  │   (matches_new + dettagli)   │                    │
│                  └──────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Consumo (Frontend)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FLUSSO CONSUMO                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Frontend React                                                     │
│   ┌───────────────────────────────────────────────────┐             │
│   │                                                    │             │
│   │  useEffect(() => {                                │             │
│   │    fetch('/api/match/123/card')                   │             │
│   │      .then(data => setMatchCard(data))            │             │
│   │  }, [matchId])                                    │             │
│   │                                                    │             │
│   └────────────────────────┬──────────────────────────┘             │
│                            │                                         │
│                            ▼                                         │
│   Backend API                                                        │
│   ┌───────────────────────────────────────────────────┐             │
│   │  GET /api/match/:id/card                          │             │
│   │                                                    │             │
│   │  matchCardService.getMatchCard(id)                │             │
│   │    ├── getMatchWithPlayers()    → matches_new     │             │
│   │    ├── getPlayerStats()         → player_stats    │             │
│   │    ├── getHeadToHead()          → head_to_head    │             │
│   │    ├── getMatchStatistics()     → match_stats     │             │
│   │    ├── getPowerRankings()       → power_rankings  │             │
│   │    ├── getPointByPoint()        → point_by_point  │             │
│   │    └── getOdds()                → match_odds      │             │
│   │                                                    │             │
│   └────────────────────────┬──────────────────────────┘             │
│                            │                                         │
│                            ▼                                         │
│   Risposta JSON                                                      │
│   ┌───────────────────────────────────────────────────┐             │
│   │  {                                                 │             │
│   │    match: { id, date, score, ... },               │             │
│   │    player1: { name, ranking, stats, form },       │             │
│   │    player2: { name, ranking, stats, form },       │             │
│   │    h2h: { total: "5-3", onClay: "2-1" },          │             │
│   │    statistics: { aces, doubleFaults, ... },       │             │
│   │    momentum: [ { set, game, value }, ... ],       │             │
│   │    odds: { opening, closing },                    │             │
│   │    dataQuality: 85                                │             │
│   │  }                                                 │             │
│   └───────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ❓ Dati Mancanti e Soluzioni

### Matrice Disponibilità Dati

| Dato | SofaScore | XLSX | Soluzione se Manca |
|------|:---------:|:----:|-------------------|
| Nome giocatore | ✅ | ✅ | - |
| Punteggio | ✅ | ✅ | - |
| Ranking match | ⚠️ | ✅ | Usa XLSX |
| Quote betting | ❌ | ✅ | Solo da XLSX |
| Statistiche | ✅ | ❌ | Solo da SofaScore |
| Momentum | ⚠️ | ❌ | Cerca su SofaScore per nome |
| Point-by-point | ⚠️ | ❌ | Cerca su SofaScore per nome |
| H2H | ❌ | ❌ | **Calcolato** dai match |
| Stats carriera | ❌ | ❌ | **Calcolato** dai match |
| ELO superficie | ❌ | ❌ | **Calcolato** (futuro) |

### Strategia per Dati Mancanti

#### 1. Match XLSX senza statistiche dettagliate
```
Problema: Match importato da XLSX non ha momentum/statistiche
Soluzione: Endpoint /api/match/:id/find-sofascore
  - Cerca su SofaScore per nome giocatori + data
  - Se trova match, recupera statistiche
  - Salva in match_statistics_new e match_power_rankings_new
  - Aggiorna match_data_sources
```

#### 2. Nomi giocatori che non matchano
```
Problema: "Alex De Minaur" (XLSX) ≠ "Alex de Minaur" (SofaScore)
Soluzione: Tabella player_aliases
  - Ogni variante del nome è salvata normalizzata (lowercase, no accenti)
  - playerService.findOrCreate() cerca prima negli alias
  - Se trova, usa ID esistente; se no, crea nuovo player + alias
```

#### 3. H2H non presente
```
Problema: Nessuna fonte ha H2H pre-calcolato
Soluzione: Tabella head_to_head + trigger
  - Trigger automatico su INSERT in matches_new
  - Calcola e aggiorna H2H tra i due giocatori
  - Include breakdown per superficie
```

#### 4. Statistiche carriera non presenti
```
Problema: Nessuna fonte ha stats carriera
Soluzione: Calcolo periodico
  - Job schedulato che analizza tutti i match di un giocatore
  - Calcola: win%, ace rate, 1st serve %, etc. per superficie
  - Salva in player_career_stats
```

---

## 🖥️ Frontend - Consumo Dati

Il frontend **NON** gestisce logica di acquisizione dati. Chiama solo API.

### API da Chiamare

| Endpoint | Metodo | Descrizione | Uso nel Frontend |
|----------|--------|-------------|------------------|
| `/api/match/:id/card` | GET | Card completa match | Pagina dettaglio match |
| `/api/matches` | GET | Lista match | Homepage, filtri |
| `/api/player/:id` | GET | Dettagli giocatore | Pagina giocatore |
| `/api/player/:id/matches` | GET | Match di un giocatore | Storico giocatore |
| `/api/search/players?q=` | GET | Cerca giocatori | Autocomplete |
| `/api/live` | GET | Match in corso | Sezione live |
| `/api/live` | WebSocket | Aggiornamenti real-time | Live scores |

### Esempio Componente React

```jsx
// MatchCard.jsx
import { useEffect, useState } from 'react';
import { apiUrl } from '../config';

function MatchCard({ matchId }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl(`/api/match/${matchId}/card`))
      .then(res => res.json())
      .then(data => {
        setCard(data);
        setLoading(false);
      });
  }, [matchId]);

  if (loading) return <Spinner />;

  return (
    <div className="match-card">
      {/* Header con giocatori */}
      <MatchHeader 
        player1={card.player1} 
        player2={card.player2}
        score={card.match.score}
      />
      
      {/* H2H */}
      {card.h2h && <H2HSection h2h={card.h2h} />}
      
      {/* Statistiche */}
      {card.statistics && <StatsSection stats={card.statistics} />}
      
      {/* Grafico Momentum */}
      {card.momentum?.length > 0 && <MomentumChart data={card.momentum} />}
      
      {/* Quote */}
      {card.odds && <OddsSection odds={card.odds} />}
      
      {/* Qualità dati */}
      <DataQualityBadge quality={card.dataQuality} sources={card.dataSources} />
    </div>
  );
}
```

### Cosa Mostrare per Tipo Match

| Tipo Match | Dati Disponibili | Componenti da Mostrare |
|------------|------------------|------------------------|
| **Solo XLSX** | Score, ranking, odds | Header, Score, Odds, H2H calcolato |
| **Solo SofaScore** | Score, stats, momentum | Header, Score, Stats, Momentum |
| **XLSX + SofaScore** | Tutto | Tutti i componenti |
| **Match Live** | Score real-time | Header, Live Score, Stats parziali |

---

## 🚀 Sviluppi Futuri

### Priorità Alta
- [ ] **Calcolo ELO per superficie** - Rating dinamico basato su risultati
- [ ] **Import automatico XLSX** - Watcher su cartella per nuovi file
- [ ] **Cache Redis** - Per query frequenti e dati live

### Priorità Media
- [ ] **Previsioni ML** - Modello per prevedere vincitore
- [ ] **Alerts** - Notifiche per match interessanti
- [ ] **Storico quote** - Tracciare movimento quote nel tempo

### Priorità Bassa
- [ ] **WTA completo** - Attualmente focus su ATP
- [ ] **ITF/Challenger** - Circuiti minori
- [ ] **Doubles** - Match di doppio

---

## 📁 File di Riferimento

| File | Scopo |
|------|-------|
| `backend/services/matchCardService.js` | Assembla card match |
| `backend/services/playerService.js` | Gestisce giocatori |
| `backend/scraper/sofascoreScraper.js` | Scraping SofaScore |
| `backend/importXlsx.js` | Import file Excel |
| `backend/db/matchRepository.js` | Query database |
| `backend/migrations/create-new-schema.sql` | Schema DB |
| `backend/migrations/migrate-to-new-schema.js` | Migrazione dati |

---

## 🆘 Troubleshooting

### "Player non trovato"
```
1. Verifica nome in player_aliases: 
   SELECT * FROM player_aliases WHERE alias_normalized LIKE '%nome%'
   
2. Se non esiste, aggiungi alias:
   INSERT INTO player_aliases (player_id, alias_name, alias_normalized, source)
   VALUES (123, 'Nome Variante', 'nome variante', 'manual');
```

### "Match senza statistiche"
```
1. Verifica data_sources:
   SELECT * FROM match_data_sources WHERE match_id = 123;
   
2. Se manca SofaScore, chiama endpoint:
   POST /api/match/123/find-sofascore
```

### "H2H non aggiornato"
```
1. Ricalcola manualmente:
   SELECT * FROM matches_new 
   WHERE (player1_id = 1 AND player2_id = 2) OR (player1_id = 2 AND player2_id = 1);
   
2. Aggiorna head_to_head con i risultati
```

---

*Ultimo aggiornamento: Dicembre 2025*
