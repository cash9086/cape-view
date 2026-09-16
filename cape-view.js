/* ==========================================================================
   cape-view.js  —  the cape studio
   La scritta "View" accanto al puntatore, e basta.

   A cosa serve
   ------------
   E' la scritta che facevi comparire con `ink-invert`, staccata da tutto il
   resto: niente pennello, niente inchiostro, niente canvas. Solo la parola.
   Stessi numeri di prima (corpo, tracking, salita, ritardo), cosi' dove la
   rimetti e' identica a com'era.

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
var LAG    = 0.45;     /* quanto insegue: 1 = incollata al mouse. Meno
                          intuitivo di quel che sembra, il ritardo che si
                          vede va come (1-LAG)/LAG                          */
var CAP    = 26;       /* e comunque non si stacca mai piu' di tanti px:
                          su una passata veloce resta leggibile             */
var TR     = 0.16;     /* tracking a regime (em). Su un corpo piccolo tutto
                          maiuscolo serve aria, altrimenti e' un blocco     */
var TR_IN  = 0.18;     /* tracking IN PIU' all'inizio della salita (em): si
                          stringe mentre sale, e' quello che la fa sembrare
                          una cosa sola invece di due                       */
var IN_MS  = 460;      /* la salita (ms)                                    */
var OUT_MS = 260;      /* l'uscita verso l'alto (ms)                        */
var DELAY  = 90;       /* quanto aspetta prima di salire (ms)               */
var FONT   = '600 11px/1 Inter, system-ui, sans-serif';
                       /* Nota: Inter sul sito non e' caricato, quindi cade
                          su system-ui — com'e' sempre stato. Per averla in
                          Jost come il resto: CAPE_VIEW = {FONT:'600 11px/1
                          Jost, system-ui, sans-serif'}                     */
var MIN_W  = 992;      /* sotto questa larghezza non parte (px)             */
var HIDE   = '#capecur';
                       /* il cursore-logo gia' in pagina: finche' sei sopra
                          a un .cursor-view si spegne, cosi' resta la sola
                          scritta. Se un giorno quel cursore cambia nome,
                          si cambia qui                                     */
var Z      = 2147483646;
                       /* uno sotto al cursore che c'e' gia': tanto e'
                          spento, ma se si incrociano passa sopra lui       */

var EASE     = 'cubic-bezier(.16,1,.3,1)';   /* la salita  */
var EASE_OUT = 'cubic-bezier(.6,0,.9,.2)';   /* l'uscita   */

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
  if(o.OUT_MS !== undefined) OUT_MS = o.OUT_MS;
  if(o.DELAY  !== undefined) DELAY  = o.DELAY;
  if(o.FONT   !== undefined) FONT   = o.FONT;
  if(o.MIN_W  !== undefined) MIN_W  = o.MIN_W;
  if(o.HIDE   !== undefined) HIDE   = o.HIDE;
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
   overflow:hidden sul contenitore e' la finestra che la ritaglia: e' lei a
   fare la rivelazione, non una dissolvenza. */

var CSS =
  /* Il cursore-logo si spegne INTERO finche' sei sulla scritta. Si spegne
     il contenitore, non i suoi tre pezzi uno per uno: se quel codice un
     giorno cambia il nome di una classe interna, cosi' non resta un pezzo
     acceso addosso alla scritta. Il suo codice non si tocca: scrive
     opacita' inline a ogni frame, e una regola !important le batte tutte.
     Il cursore di sistema resta nascosto anche lui: deve restare la sola
     parola, anche se un domani il cursore-logo non ci fosse piu'. */
  'html.capeview-on ' + HIDE + '{opacity:0!important}' +
  HIDE + '{transition:opacity 180ms cubic-bezier(.4,0,1,1)!important}' +
  'html.capeview-on,html.capeview-on *{cursor:none!important}' +
  '#capeview{position:fixed;top:0;left:0;z-index:' + Z + ';pointer-events:none;' +
    'mix-blend-mode:difference;color:#fff;font:' + FONT + ';' +
    'text-transform:uppercase;white-space:nowrap;overflow:hidden;' +
    'opacity:0;transition:opacity 200ms linear;will-change:transform}' +
  '#capeview.is-on{opacity:1}' +
  '#capeview b{display:block;font-weight:inherit;font-style:normal;' +
    'line-height:1.3;letter-spacing:' + TR + 'em;' +
    'transform:translateY(110%);will-change:transform}';

var d = document;
var st = d.createElement('style');
st.textContent = CSS;
(d.head || d.documentElement).appendChild(st);

/* ——— lo stato ——————————————————————————————————————————————————————— */

var box = null, word = null;
var on = false, outT = 0, raf = 0;
var cur = null;        /* su chi siamo adesso. Serve per due motivi: non
                          rifare l'entrata a ogni figlio che si attraversa
                          dentro lo stesso elemento, e accorgersi quando si
                          passa da un'immagine a quella accanto — li' il
                          mouse non esce mai dal selettore, quindi senza
                          questo la parola resterebbe quella di prima. */
var mx = innerWidth / 2, my = innerHeight / 2, lx = mx, ly = my;

function build(){
  box = d.createElement('div');
  box.id = 'capeview';
  word = d.createElement('b');
  box.appendChild(word);
  d.body.appendChild(box);
}

/* data-cursor sull'elemento sovrascrive la parola.
   data-cursor="" (vuoto) la toglie solo li'. */
function testo(el){
  var w = el.getAttribute('data-cursor');
  return w === null ? LABEL : w;
}

/* ——— il giro ————————————————————————————————————————————————————————
   Un fotogramma alla volta, e solo mentre serve: appena la scritta e'
   fuori e l'uscita e' finita, il giro si ferma da solo. */

function kick(){ if(!raf) raf = requestAnimationFrame(giro); }

function giro(){
  raf = 0;
  lx += (mx - lx) * LAG;
  ly += (my - ly) * LAG;
  var ox = lx - mx, oy = ly - my, om = Math.sqrt(ox * ox + oy * oy);
  if(om > CAP){ var q = CAP / om; ox *= q; oy *= q; }
  box.style.transform = 'translate(-50%,-50%) translate(' +
    (mx + ox).toFixed(2) + 'px,' + (my + oy + DY).toFixed(2) + 'px)';
  if(on || outT) kick();
}

/* ——— accendi / spegni ——————————————————————————————————————————————— */

function show(el){
  if(el === cur) return;
  cur = el;

  var t = testo(el);
  if(!t){ hide(); return; }        /* data-cursor="" : qui non si dice niente */
  if(!box) build();

  /* Gia' accesa con la stessa parola — due immagini di fila che dicono
     tutte e due View. Non si rifa' l'entrata: continua a seguire e basta,
     altrimenti a passare il bordo fra l'una e l'altra fa un sussulto. */
  if(on && word.textContent === t) return;

  word.textContent = t;
  on = true;
  clearTimeout(outT); outT = 0;
  lx = mx; ly = my;                /* niente scodinzolio all'ingresso */
  box.classList.add('is-on');
  d.documentElement.classList.add('capeview-on');   /* il logo esce ora */

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

  kick();
}

function hide(){
  if(!on) return;
  on = false;

  /* la parola prosegue verso l'alto: non torna indietro, esce dalla parte
     opposta da cui e' entrata. Il logo rientra quando lei se n'e' andata,
     cosi' non si sovrappongono. */
  word.style.transition = 'transform ' + OUT_MS + 'ms ' + EASE_OUT;
  word.style.transform = 'translateY(-110%)';

  clearTimeout(outT);
  outT = setTimeout(function(){
    outT = 0;
    box.classList.remove('is-on');
    d.documentElement.classList.remove('capeview-on');
  }, OUT_MS + 20);
}

/* ——— gli ascoltatori ————————————————————————————————————————————————
   Uno solo, in cima al documento. Vale anche per le immagini che arrivano
   dopo — dal CMS, da uno slider che clona le slide — senza stare a
   ricontrollare la pagina ogni volta che cambia qualcosa. */

addEventListener('mousemove', function(e){
  mx = e.clientX; my = e.clientY;
  if(on || outT) kick();
}, { passive:true });

d.addEventListener('mouseover', function(e){
  var t = e.target, el = (t && t.closest) ? t.closest(SEL) : null;
  if(el) show(el);
  else { cur = null; hide(); }
}, true);

/* il mouse esce dalla finestra: relatedTarget vuoto vuol dire "fuori" */
d.addEventListener('mouseout', function(e){
  if(!e.relatedTarget){ cur = null; hide(); }
}, true);

})();
