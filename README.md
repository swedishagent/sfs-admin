# SFS Admin — Swedish Food Shop Admin Panel

Mobile-first admin panel för Swedish Food Shop. Hanterar ordrar, inköpslistor, fraktbokning (UPS), frakter, återbetalningar och analys.

**Production:** https://api.olav.se/admin/

## Funktioner

### 📦 Ordrar
- Lista och filtrera ordrar från Magento 2 (processing, complete, canceled etc)
- Orderdetaljer med produkter, bilder, vikter, priser
- Packningsstatus — markera produkter som packade/saknas
- Kundmail direkt i ordervyn
- UPS-fraktkostnad per order (om billing-data finns)

### 🚚 Fraktbokning (UPS)
- **Boka frakt direkt från en order** — knappen "Boka frakt" i ordervyn
- Automatisk förberedelse: hämtar mottagare, produkter, vikter, HTS-koder från Magento
- **Kundens fraktval** visas — vilken fraktmetod kunden valde i Magento + vad de betalade
- **Beräknad vikt** från produktdata visas med uppdelning per produkt
- Fältet "Faktisk vikt" fylls i manuellt (det som faktiskt skickas)
- Välj kartongstorlek (S/M/L/XL) med automatiska dimensioner
- Välj frakttjänst (Standard, Expedited, Express Saver, Express)
- **Prisuppskattning** — UPS Rating API anropas vid validering, visar kostnad per tjänst med leveransdatum
- Klicka på en tjänst i prislistan för att byta val
- Tullinfo genereras automatiskt för icke-EU-länder (Commercial Invoice)
- Validering innan skapande
- Skapar frakt via UPS Shipping API → tracking-nummer + fraktbrev
- Makulera frakt som säkerhetsnät
- Alla endpoints bakom TOTP/JWT-autentisering

### 🛒 Inköpslistor
- Generera inköpslista från valda ordrar (aggregerar produkter)
- Markera produkter som köpta/hoppade
- Produktbilder, vikter, kategorier
- Kylvaror flaggas

### 📋 Frakter
- Översikt av alla skickade frakter med UPS-tracking
- Spåra paket i realtid via UPS Tracking API
- SLA-beräkning för Express-tjänster
- UPS billing-data per frakt (kostnad, rabatt, zon)

### ⚖️ Fraktjämförelse
- UPS billing-data upload (CSV)
- Jämför kundens fraktavgift vs faktisk UPS-kostnad
- Marginalanalys per frakt

### 💰 Återbetalningar
- Pending refunds från saknade produkter
- Markera som hanterad

### 📊 Analys
- Orderstatistik (antal, intäkt, snittordervärde)
- Leveranstider (order → skickat → levererat)
- Topp-länder
- Packningsstatistik

## Arkitektur

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐     SSH tunnel     ┌──────────┐
│                 │ ◄─────────────► │                      │ ◄────────────────► │          │
│  React SPA      │                 │  FastAPI (port 443)  │                    │ Magento  │
│  (admin-dist/)  │                 │  api.olav.se         │                    │ MySQL DB │
│                 │                 │                      │     OAuth2         │          │
└─────────────────┘                 │  ├─ main.py          │ ◄───────────────► ┌──────────┐
                                    │  ├─ admin_routes.py  │                   │ UPS API  │
                                    │  ├─ shipping_routes  │                   └──────────┘
                                    │  ├─ ups_shipping.py  │
                                    │  ├─ auth.py          │
                                    │  └─ database.py      │
                                    └──────────────────────┘
```

### Frontend
- **React 19** + **Vite 7** + **TypeScript**
- **Tailwind CSS 4** — styling
- **shadcn/ui** (new-york) — UI-komponenter
- **Radix UI** — accessible primitives
- **Lucide React** — ikoner
- **Sonner** — toast-notifikationer

### Backend
- **FastAPI** — webhook-server med HTTPS (Let's Encrypt)
- **Magento 2 MySQL** — read-only via SSH-tunnel (ordrar, produkter, kunder)
- **UPS Shipping API** — fraktskapande, tracking, void
- **SQLite** — lokal state (packing, shopping lists, tracking cache, UPS billing)
- **pyotp / PyJWT** — TOTP-auth + JWT-tokens

## Autentisering

Appen använder **TOTP (2FA)** — samma typ av kod som Google Authenticator.

1. Användaren anger 6-siffrig TOTP-kod på login-sidan
2. Backend verifierar koden → returnerar JWT-token (15 min livstid)
3. JWT sparas i localStorage och skickas med alla API-anrop
4. Alla admin- och shipping-endpoints kräver giltig JWT + API-nyckel

TOTP-secret finns i `webhook_server/config.json` (`totp_secret`). Scanna QR-kod med valfri authenticator-app.

## Miljövariabler

Skapa `.env` i projektets rot:

```env
VITE_API_URL=https://api.olav.se
VITE_API_KEY=din-api-nyckel
```

Dessa bakas in vid build (`npm run build`) — inte runtime.

## Utveckling

```bash
# Installera dependencies
npm install

# Starta dev-server (port 5173)
npm run dev

# Lint
npm run lint
```

Dev-server: http://localhost:5173/admin/

## Build & Deploy

```bash
# Bygg för produktion
npm run build

# Kopiera till webhook-server
rm -rf ../webhook_server/admin-dist/*
cp -r dist/* ../webhook_server/admin-dist/

# Starta om servern
sudo systemctl restart webhook-server
```

## Projektstruktur

```
sfs-admin/
├── src/
│   ├── api.ts                  # API-klient (auth, ordrar, frakt, etc)
│   ├── App.tsx                 # Huvud-app med navigation
│   ├── main.tsx                # Entry point
│   ├── index.css               # Globala stilar & CSS-variabler
│   ├── components/
│   │   ├── Login.tsx           # TOTP-inloggning
│   │   ├── Orders.tsx          # Ordrar — lista & detalj
│   │   ├── Shipping.tsx        # UPS fraktbokning (prepare → validate → create)
│   │   ├── Shipments.tsx       # Fraktöversikt & tracking
│   │   ├── ShoppingLists.tsx   # Inköpslistor
│   │   ├── Refunds.tsx         # Återbetalningar
│   │   ├── Analytics.tsx       # Dashboard & statistik
│   │   ├── FreightComparison.tsx # UPS billing-jämförelse
│   │   ├── ProductDetail.tsx   # Produktinfo-modal
│   │   ├── ErrorBoundary.tsx   # Felhantering
│   │   ├── OfflineBanner.tsx   # Offline-indikator
│   │   └── ui/                 # shadcn/ui-komponenter
│   ├── hooks/                  # Custom React hooks
│   └── lib/
│       └── utils.ts            # Hjälpfunktioner (cn)
├── .env                        # Miljövariabler (VITE_API_URL, VITE_API_KEY)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Backend-filer (webhook_server/)

| Fil | Rader | Beskrivning |
|-----|-------|-------------|
| `main.py` | 710 | FastAPI-server, databas, produktsök, TOTP/JWT-auth |
| `admin_routes.py` | 2125 | Admin-API: ordrar, inköp, frakt, tracking, billing, analys |
| `ups_shipping.py` | 1075+ | UPS Shipping-wrapper: prepare, validate, rate, create, void |
| `shipping_routes.py` | 179 | Shipping API-endpoints: prepare, validate, rate, create, void (kräver JWT) |
| `auth.py` | 73 | Delad auth-modul (API-nyckel + JWT) |
| `database.py` | 546 | SQLite-schema & queries |
| `config.json` | — | API-nyckel, TOTP-secret, JWT-secret, OpenClaw-config |

## UPS Fraktbokning — Flöde

```
1. POST /api/shipping/prepare   { order_id: "1000016344" }
   → Hämtar order + adress + produkter från Magento
   → Returnerar förifyllt fraktunderlag med vikter, HTS-koder, kartongförslag
   → Inkluderar kundens fraktval från Magento (beskrivning + belopp)
   → Beräknad vikt per produkt + totalt (calculated_weight_kg)

2. POST /api/shipping/validate   { ...preparerad data, ev justerad }
   → Lokal validering (required fields, HTS för tull, viktkontroll)
   → { valid: true/false, errors: [], warnings: [] }

3. POST /api/shipping/rate       { ...preparerad data }
   → Hämtar pris från UPS Rating API
   → Returnerar kostnad per tillgänglig tjänst, leveransdatum, transittid
   → Anropas parallellt med validate i UI

4. POST /api/shipping/create     { ...validerad data }
   → Skapar frakt via UPS Shipping API
   → Returnerar tracking-nummer, fraktbrev (label), kostnad, tulldokument
   → Label sparas i shipping_labels/

5. DELETE /api/shipping/void/{tracking}
   → Makulerar frakt via UPS API (säkerhetsnät)

6. GET  /api/shipping/label/{tracking}
   → Laddar ner sparad fraktbrev-bild
```

### Kartongstorlekar

| Storlek | Mått (cm) | Max vikt |
|---------|-----------|----------|
| S | 25 × 20 × 15 | 2 kg |
| M | 35 × 25 × 20 | 7 kg |
| L | 45 × 35 × 25 | 15 kg |
| XL | 55 × 40 × 30 | 30 kg |

### UPS-tjänster (från SE)

| Kod | Tjänst |
|-----|--------|
| 11 | UPS Standard |
| 08 | UPS Expedited |
| 65 | UPS Express Saver |
| 07 | UPS Express |
| 54 | UPS Express Plus |

### Tullhantering
- **Inom EU (27 länder):** Ingen tulldokumentation
- **Utanför EU (US, GB, NO, CH, etc):** Commercial Invoice genereras automatiskt med HTS-koder, ursprungsland, produktvärden
- HTS-koder och ursprungsland hämtas från Magento-produktattribut

## Design

### Färger (svenskt tema)
- Primary: `#006aa7` (blå)
- Secondary: `#fecc00` (gul)
- Success: `#28a745`
- Destructive: `#dc3545`
- Muted: `#6c757d`

### Mobilanpassning
- Touch targets minst 44×44px
- Safe area insets för notch-enheter
- Bottom navigation på mobil
- Sidebar + topnav på desktop
- 16px font på inputs (förhindrar iOS-zoom)

## Säkerhet

- HTTPS med Let's Encrypt-certifikat
- TOTP 2FA — inga lösenord, bara tidsbaserade koder
- JWT-tokens med 15 min livstid
- API-nyckel som extra lager
- Magento-databas: read-only (SELECT only)
- JWT-secret persistent i config (överlever server-restarts)
- Rate limiting (slowapi) på alla endpoints
