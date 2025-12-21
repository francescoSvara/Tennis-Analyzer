# 📥 Come Ottenere i Loghi dei Tornei

## Dove scaricare i loghi

### 1. Siti ufficiali dei tornei
- **Australian Open**: https://ausopen.com/
- **Roland Garros**: https://www.rolandgarros.com/
- **Wimbledon**: https://www.wimbledon.com/
- **US Open**: https://www.usopen.org/
- **United Cup**: https://www.unitedcup.com/

### 2. Wikipedia
Cerca il torneo su Wikipedia (es. "United Cup Wikipedia") e scarica il logo dalla pagina

### 3. Google Images
Cerca: `"[nome torneo] logo png transparent"`
- Preferisci immagini con sfondo trasparente
- Cerca loghi ufficiali, non fan-made

### 4. Siti ATP/WTA
- ATP: https://www.atptour.com/
- WTA: https://www.wtatennis.com/

## Come salvare il logo

1. **Scarica l'immagine** dal sito
2. **Rinomina il file** secondo le regole:
   - United Cup → `united-cup.png`
   - Australian Open → `australian-open.png`
   - Roland Garros → `roland-garros.png`
3. **Salva in**: `public/logos/tournaments/`
4. **Dimensione ideale**: 200x200 px (quadrato)
5. **Formato**: PNG con sfondo trasparente

## Esempio: United Cup

1. Vai su https://www.unitedcup.com/
2. Clicca con il tasto destro sul logo nell'header
3. "Salva immagine con nome..."
4. Rinomina in: `united-cup.png`
5. Salva in: `public/logos/tournaments/united-cup.png`

## Logo placeholder

Se non trovi il logo, puoi usare un **logo generico**:
- Tornei ATP → usa `atp-default.png`
- Tornei WTA → usa `wta-default.png`

## Verifica

Ricarica la pagina e controlla la **Console (F12)**:
- Se vedi `[Logo mancante]` → il logo non è stato trovato
- Controlla il nome del file suggerito nel messaggio
