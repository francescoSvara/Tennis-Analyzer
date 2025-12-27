# 🧠 FILOSOFIA MADRE – TENNIS ANALYZER (CONCETTO)

> **Costituzione del sistema**
> Questo documento definisce le **verità non negoziabili** del progetto Tennis Analyzer.
> Ogni scelta architetturale, tecnica e concettuale **discende da qui**.

---

## 1️⃣ Perché esiste questo sistema

Il sistema esiste per:
- trasformare **eventi grezzi di tennis** in **conoscenza strutturata**
- separare **dato**, **interpretazione** e **decisione**
- permettere analisi, strategie e visualizzazione **senza ambiguità**

Il progetto è **AI-first**: progettato per essere compreso e mantenuto da umani e AI.

---

## 2️⃣ Principio di Verità

> **Il dato grezzo non è mai verità.**
> La verità nasce solo dopo interpretazione controllata.

Conseguenze:
- l’interpretazione avviene **solo nel backend**
- il frontend **consuma**, non deduce
- nessuna metrica vive senza contesto

---

## 3️⃣ MatchBundle come unità di realtà

Il **MatchBundle** è l’unica rappresentazione valida di un match.

- tutto converge lì
- tutto viene versionato lì
- tutto viene consumato da lì

Non esistono:
- scorciatoie
- endpoint alternativi
- calcoli fuori bundle

---

## 4️⃣ Separazione dei ruoli

Il sistema cresce per **ruoli**, non per file:

- Data Engineer → Repository
- Analyst → Calculations
- Domain Architect → Services
- Strategist → Strategy Engine
- Frontend Engineer → UI

Un ruolo non invade mai un altro.

---

## 5️⃣ Tempo, Versioni, Qualità

Ogni dato:
- ha un **tempo**
- ha una **versione**
- ha una **qualità osservabile**

Un dato senza questi attributi è **incompleto**.

---

## 6️⃣ AI come cittadino vincolato

L’AI:
- non modifica filosofie
- non inventa scorciatoie
- segnala violazioni

Il codice si adatta alla filosofia, **mai il contrario**.

---

## 7️⃣ Regola finale

> **Se una decisione non è documentata, non è valida.**

---

**Fine FILOSOFIA MADRE – Concetto**
