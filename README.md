# cape-view

La scritta **View** che insegue il puntatore da lontano.

E' la scritta che compariva con `ink-invert`, staccata dal resto: niente
pennello, niente inchiostro, niente canvas. Stessi numeri di prima — corpo,
tracking, salita, ritardo — cosi' dov'e' rimessa e' identica a com'era.

## Come si usa

In Webflow dai a un'immagine (o a qualunque blocco) la classe:

```
cursor-view
```

La classe puo' restare vuota, senza nessuna proprieta'. Poi metti lo script
in fondo al **Before `</body>`**:

```html
<script defer src="https://cdn.jsdelivr.net/gh/cash9086/cape-view@6c8606941630244dcd1f9be99913e69d8e6da95e/cape-view.js"></script>
```

## Su un singolo elemento

Dalla scheda Element Settings → Custom attributes:

| attributo | valore | effetto |
|---|---|---|
| `data-cursor` | `Shop` | li' dice Shop invece di View |
| `data-cursor` | *(vuoto)* | li' non dice niente |

## Le manopole

Il file sta su un CDN e non lo puoi aprire per cambiare un numero. Se in
pagina, **prima** dello script, scrivi:

```html
<script>window.CAPE_VIEW = { DY: 24, LABEL: 'Apri' };</script>
```

quei valori vincono su quelli di default.

| nome | default | cos'e' |
|---|---|---|
| `LABEL` | `View` | la parola |
| `SEL` | `.cursor-view` | a chi si attacca |
| `DY` | `18` | quanto sta sotto al puntatore (px) |
| `LAG` | `0.06` | quanto insegue: 1 = incollata. E' l'inerzia |
| `CAP` | `400` | e comunque non si stacca mai piu' di tanti px |
| `TR` | `0.16` | tracking a regime (em) |
| `TR_IN` | `0.18` | tracking in piu' all'inizio della salita (em) |
| `IN_MS` | `460` | la salita (ms) |
| `OUT_MS` | `260` | l'uscita verso l'alto (ms) |
| `DELAY` | `90` | quanto aspetta prima di salire (ms) |
| `FONT` | `600 11px/1 Inter, system-ui, sans-serif` | vedi sotto |
| `MIN_W` | `992` | sotto questa larghezza non parte (px) |
| `Z` | `2147483646` | uno sotto al cursore che c'e' gia' |

## Il font

Il default e' la riga esatta dell'inchiostro. Attenzione pero': **Inter sul
sito non e' caricato** — carichi solo Jost — quindi quella scritta cade su
`system-ui`, e li' e' sempre stata. Per averla in Jost come il resto:

```html
<script>window.CAPE_VIEW = { FONT: '600 11px/1 Jost, system-ui, sans-serif' };</script>
```

## Quando non parte

Sotto i 992px, dove non c'e' un mouse vero (`hover: hover`), o se il sistema
chiede meno animazioni. Le stesse condizioni del resto del sito: una scritta
appesa al puntatore su un telefono non ha un puntatore a cui appendersi.

## L'inerzia

E' tutta in `LAG`. A 1 la scritta e' incollata al mouse; piu' il numero e'
piccolo piu' resta indietro e piu' ci mette ad arrivare. A `0.06` si stacca
di un centinaio di pixel appena muovi e ci mette mezzo secondo buono a
raggiungerti quando ti fermi.

Il ritardo che si vede va come `(1-LAG)/LAG`: fra `0.45` e `0.06` non c'e'
il doppio di differenza, ce n'e' tredici volte tanta. Conviene cambiarlo a
piccoli passi, e si cambia **dalla pagina** senza ripubblicare il file:

```html
<script>window.CAPE_VIEW = { LAG: 0.09 };</script>
```

`CAP` e' il guinzaglio: quanto puo' allontanarsi al massimo, in pixel. Serve
perche' su una sventagliata da una parte all'altra dello schermo la scritta
non finisca a mezzo metro dall'immagine di cui sta parlando.

## Il cursore-logo resta

Il cursore dell'onda (`#capecur`) **non** si spegne piu': sopra un
`.cursor-view` ci sono tutti e due, il cursore e la scritta che lo insegue.
Il cursore di sistema invece resta nascosto.

Perche' i due non si trasformino nello stesso momento a un palmo l'uno
dall'altra, e' `cape-cursore.js` a farsi da parte: sopra un `.cursor-view`
resta il logo e non diventa ne' anello ne' punto. Quel pezzo sta li', non
qui.

## Note

- Il colore non si imposta: `mix-blend-mode: difference` la fa bianca sul
  nero e nera sul bianco da sola. E' lo stesso trucco della punta del
  pennello.
- Se su un elemento lasci **sia** `ink-invert` **sia** `cursor-view`, le
  scritte View diventano due.
- La scritta non rende cliccabile niente. Se l'immagine non e' dentro un
  Link Block o un Lightbox, dice View e poi non succede nulla.
