/* ==========================================================================
   cape-view.js  —  the cape studio
   La scritta "View" che insegue il puntatore da lontano.

   A cosa serve
   ------------
   E' la scritta che facevi comparire con `ink-invert`, staccata da tutto il
   resto: niente pennello, niente inchiostro, niente canvas. Solo la parola.
   Stessi numeri di prima (corpo, tracking, salita, ritardo), cosi' dove la
   rimetti e' identica a com'era.

   Come la parola sta nell'immagine
   --------------------------------
   Non compare e non sparisce: appartiene all'immagine e ci vive dentro. Il
   riquadro dell'immagine e' la sua finestra, quindi quando il puntatore esce
   la parola lo segue, arriva al bordo e ci finisce sotto — tagliata, non
   spenta. Rientrando riesce dal bordo da sola. Solo la primissima volta sale
   da sotto il proprio bordo, che e' l'unica entrata vera.

   Come si usa
   -----------
   In Webflow dai a un'immagine — o a qualunque blocco — la classe

       cursor-view

   e basta. Non serve darle nessuna proprieta': puo' restare vuota.

   Su un singolo elemento, dalla scheda Element Settings:
       data-cursor = "Shop"   ->  dice Shop invece di View
       data-cursor = ""       ->  li' non dice niente

   Dove si tocca
   -------------
   Il file sta su un CDN e non lo puoi aprire per cambiare un numero. Quindi
   se in pagina, PRIMA di questo script, scrivi

       <script>window.CAPE_VIEW = { DY: 24, LABEL: 'Apri' };</script>

   quei valori vincono su quelli qui sotto. I nomi buoni sono quelli del
   blocco "le manopole".

   Quando non parte
   ----------------
   Sotto i 992px, dove non c'e' un mouse vero, o se il sistema chiede meno
   animazioni. Le stesse condizioni del resto del sito: una scritta appesa
   al puntatore su un telefono non ha un puntatore a cui appendersi.
   ========================================================================== */

(function(){
'use strict';

/* ——— le manopole ——————————————————————————————————————————————————————— */

var LABEL  = 'View';   /* la parola, quando l'elemento non dice la sua      */
var SEL    = '.cursor-view';
var DY     = 18;       /* quanto sta sotto al puntatore (px). Sotto e non
                          sopra perche' sopra finisce dentro al cursore     */
var LAG    = 0.035;    /* quanto insegue: 1 = incollata al mouse. Meno
                          intuitivo di quel che sembra, il ritardo che si
                          vede va come (1-LAG)/LAG — a 0.035 resta indietro
                          parecchio e ci mette quasi un secondo ad arrivare.
                          E' l'inerzia: abbassalo per averne di piu'         */
var CAP    = 520;      /* e comunque non si stacca mai piu' di tanti px: e'
                          il guinzaglio, non il freno. Non serve piu' a
                          tenerla dentro l'immagine — a quello ci pensa il
                          bordo — serve a non farle attraversare mezzo
                          schermo su una sventagliata                        */
var TR     = 0.16;     /* tracking a regime (em). Su un corpo piccolo tutto
                          maiuscolo serve aria, altrimenti e' un blocco     */
var TR_IN  = 0.18;     /* tracking IN PIU' all'inizio della salita (em): si
                          stringe mentre sale, e' quello che la fa sembrare
                          una cosa sola invece di due                       */
var IN_MS  = 460;      /* la salita, la prima volta (ms)                    */
var DELAY  = 90;       /* quanto aspetta prima di salire (ms)               */
var FONT   = '600 11px/1 Inter, system-ui, sans-serif';
                       /* Nota: Inter sul sito non e' caricato, quindi cade
                          su system-ui — com'e' sempre stato. Per averla in
                          Jost come il resto: CAPE_VIEW = {FONT:'600 11px/1
                          Jost, system-ui, sans-serif'}                     */
var MIN_W  = 992;      /* sotto questa larghezza non parte (px)             */
var Z      = 2147483646;
                       /* uno sotto al cursore che c'e' gia': se si
                          incrociano passa sopra lei, non lui               */

var EASE     = 'cubic-bezier(.16,1,.3,1)';   /* la salita  */

/* ——— gli scavalchi dalla pagina ———————————————————————————————————————— */

(function(){
  var o = window.CAPE_VIEW;
  if(!o) return;
  if(o.LABEL  !== undefined) LABEL  = o.LABEL;
  if(o.SEL    !== undefined) SEL    = o.SEL;
  if(o.DY     !== undefined) DY     = o.DY;
  if(o.LAG    !== undefined) LAG    = o.LAG;
  if(o.CAP    !== undefined) CAP    = o.CAP;
  if(o.TR     !== undefined) TR     = o.TR;
  if(o.TR_IN  !== undefined) TR_IN  = o.TR_IN;
  if(o.IN_MS  !== undefined) IN_MS  = o.IN_MS;
  if(o.DELAY  !== undefined) DELAY  = o.DELAY;
  if(o.FONT   !== undefined) FONT   = o.FONT;
  if(o.MIN_W  !== undefined) MIN_W  = o.MIN_W;
  if(o.Z      !== undefined) Z      = o.Z;
})();

/* ——— si parte solo dove ha senso ——————————————————————————————————————— */

function mq(q){ return window.matchMedia && matchMedia(q).matches; }

if(!mq('(min-width:' + MIN_W + 'px)')) return;
if(!mq('(hover: hover)')) return;
if(mq('(prefers-reduced-motion: reduce)')) return;

/* ——— il foglio di stile ———————————————————————————————————————————————
   difference: bianca sul nero, nera sul bianco. E' lo stesso trucco della
   punta del pennello — cosi' non serve andare a leggere che colore c'e'
   sotto, ci pensa il browser.

   LA FINESTRA E' L'IMMAGINE. #capeview viene messo esattamente sopra
   l'elemento su cui siamo, con overflow:hidden, e la parola gli sta dentro:
   quando il puntatore esce, la parola lo segue e finisce sotto il bordo, che
   la taglia. Non sparisce e non sbava fuori — non puo', il suo mondo finisce
   li'. E' anche il motivo per cui la miscela sta su questo riquadro e non su
   tutto lo schermo: si fonde con la fotografia, che e' quello che sta sotto.

   Il riquadro interno .capeview-mov e' la seconda finestra, piccola quanto
   la parola: serve alla salita della prima volta, che e' una rivelazione da
   sotto il proprio bordo e non una dissolvenza. */

var CSS =
  /* Il cursore-logo resta acceso e non lo tocchiamo: la scritta gli sta
     dietro e lo raggiunge quando il mouse si ferma, e finche' corre sono
     due cose lontane, non una addosso all'altra. Quello di sistema invece
     resta nascosto anche qui: deve restare cosi' anche se un domani il
     cursore-logo non ci fosse piu'. */
  'html.capeview-on,html.capeview-on *{cursor:none!important}' +
  '#capeview{position:fixed;left:0;top:0;width:0;height:0;z-index:' + Z + ';' +
    'pointer-events:none;mix-blend-mode:difference;color:#fff;font:' + FONT + ';' +
    'text-transform:uppercase;white-space:nowrap;overflow:hidden;display:none}' +
  '#capeview.is-on{display:block}' +
  '#capeview .capeview-mov{position:absolute;left:0;top:0;overflow:hidden;' +
    'will-change:transform}' +
  '#capeview b{display:block;font-weight:inherit;font-style:normal;' +
    'line-height:1.3;letter-spacing:' + TR + 'em;' +
    'transform:translateY(110%);will-change:transform}';

var d = document;
var st = d.createElement('style');
st.textContent = CSS;
(d.head || d.documentElement).appendChild(st);

/* ——— lo stato ——————————————————————————————————————————————————————— */

var box = null, mov = null, word = null;
var raf = 0;
var att = null;        /* l'elemento a cui la parola appartiene adesso: e'
                          lui la finestra. Non si molla quando il puntatore
                          esce — si molla solo entrando in un altro. E' cosi'
                          che la parola resta a vivere dentro la sua
                          immagine invece di sparire. */
var dentro = false;    /* il puntatore e' sopra att in questo momento */
var mx = innerWidth / 2, my = innerHeight / 2, lx = mx, ly = my;

function build(){
  box = d.createElement('div');
  box.id = 'capeview';
  mov = d.createElement('div');
  mov.className = 'capeview-mov';
  word = d.createElement('b');
  mov.appendChild(word);
  box.appendChild(mov);
  d.body.appendChild(box);
}

/* data-cursor sull'elemento sovrascrive la parola.
   data-cursor="" (vuoto) la toglie solo li'. */
function testo(el){
  var w = el.getAttribute('data-cursor');
  return w === null ? LABEL : w;
}

/* ——— il giro ————————————————————————————————————————————————————————
   Un fotogramma alla volta, e solo mentre serve: quando la parola ha
   raggiunto il puntatore e il puntatore e' fermo, il giro si ferma da solo.

   Ogni fotogramma si rimette il riquadro sopra l'immagine. Costa una misura,
   e serve: l'immagine si muove con lo scroll e nell'orizzontale scorre anche
   di lato, e la finestra deve stare con lei. */

function kick(){ if(!raf && att) raf = requestAnimationFrame(giro); }

function giro(){
  raf = 0;
  if(!att || !box) return;

  var r = att.getBoundingClientRect();
  if(!r.width || !r.height){ box.classList.remove('is-on'); return; }

  box.classList.add('is-on');
  box.style.left   = r.left.toFixed(1)   + 'px';
  box.style.top    = r.top.toFixed(1)    + 'px';
  box.style.width  = r.width.toFixed(1)  + 'px';
  box.style.height = r.height.toFixed(1) + 'px';

  lx += (mx - lx) * LAG;
  ly += (my - ly) * LAG;

  var ox = lx - mx, oy = ly - my, om = Math.sqrt(ox * ox + oy * oy);
  if(om > CAP){ var q = CAP / om; ox *= q; oy *= q; }

  /* dentro al riquadro le coordinate partono dal suo angolo, non dallo
     schermo: per questo si toglie r.left e r.top */
  mov.style.transform = 'translate(-50%,-50%) translate(' +
    (mx + ox - r.left).toFixed(2) + 'px,' +
    (my + oy + DY - r.top).toFixed(2) + 'px)';

  if(dentro || Math.abs(mx - lx) > 0.5 || Math.abs(my - ly) > 0.5) kick();
}

/* ——— entra / esce ——————————————————————————————————————————————————— */

function salita(){
  /* Si riparte da sotto SENZA transizione, si forza il reflow, poi si
     accende la transizione. Senza il reflow in mezzo il browser accorpa i
     due valori e non anima niente. */
  word.style.transition = 'none';
  word.style.transform = 'translateY(110%)';
  word.style.letterSpacing = (TR + TR_IN).toFixed(3) + 'em';
  void word.offsetWidth;
  word.style.transition = 'transform ' + IN_MS + 'ms ' + EASE + ' ' + DELAY + 'ms,' +
                          'letter-spacing ' + IN_MS + 'ms ' + EASE + ' ' + DELAY + 'ms';
  word.style.transform = 'translateY(0)';
  word.style.letterSpacing = TR + 'em';
}

function show(el){
  var t = testo(el);
  if(!t){ spegni(); return; }        /* data-cursor="" : qui non si dice niente */
  if(!box) build();

  dentro = true;
  d.documentElement.classList.add('capeview-on');

  /* Stessa immagine di prima: si rientra e basta. Niente salita, niente
     salto — la parola era li' dietro il bordo e torna fuori da sola. */
  if(el === att && word.textContent === t){ kick(); return; }

  var prima  = !att;                      /* la primissima volta          */
  var cambia = !word.textContent || word.textContent !== t;

  att = el;
  word.textContent = t;

  /* Solo la primissima volta la parola nasce sotto il puntatore. Passando
     da un'immagine all'altra no: arriva da dove si trovava, ed e' l'unico
     modo perche' entri da sotto il bordo invece di comparire in mezzo. */
  if(prima){ lx = mx; ly = my; }
  if(prima || cambia) salita();

  kick();
}

/* Il puntatore e' uscito dall'immagine. Non si spegne niente: la parola
   continua a inseguirlo e finisce sotto il bordo, che la taglia. */
function esci(){
  if(!dentro) return;
  dentro = false;
  d.documentElement.classList.remove('capeview-on');
  kick();
}

/* Qui invece si spegne davvero: data-cursor="" dice che su quell'elemento
   non si deve leggere niente. */
function spegni(){
  dentro = false;
  att = null;
  if(box) box.classList.remove('is-on');
  d.documentElement.classList.remove('capeview-on');
}

/* ——— gli ascoltatori ————————————————————————————————————————————————
   Uno solo, in cima al documento. Vale anche per le immagini che arrivano
   dopo — dal CMS, da uno slider che clona le slide — senza stare a
   ricontrollare la pagina ogni volta che cambia qualcosa. */

addEventListener('mousemove', function(e){
  mx = e.clientX; my = e.clientY;
  kick();
}, { passive:true });

d.addEventListener('mouseover', function(e){
  var t = e.target, el = (t && t.closest) ? t.closest(SEL) : null;
  if(el) show(el);
  else esci();
}, true);

/* il mouse esce dalla finestra: relatedTarget vuoto vuol dire "fuori" */
d.addEventListener('mouseout', function(e){
  if(!e.relatedTarget) esci();
}, true);

/* l'immagine si muove anche senza il mouse: con lo scroll, e di lato dentro
   l'orizzontale. La finestra deve seguirla. */
addEventListener('scroll', kick, { passive:true });
addEventListener('resize', kick, { passive:true });

})();
