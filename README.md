# Shaker Escape Room

Mini esperienza web mobile per una escape room Watt About.

Il giocatore preme **Ricarica** e scuote il telefono per 20 secondi, senza limite massimo di joule. Allo scadere scopre quanta energia ha prodotto e, da 100 joule in su, riceve un codice diverso per l’elettrodomestico raggiunto.

La conversione del movimento in joule replica la taratura del progetto `shake`: accelerazione raddoppiata da p5, soglia di movimento 0,5 per asse, campionamento ogni 4 frame e mappatura di 30.000 unità di movimento su 350 joule.

Le tacche cambiano colore ogni 50 joule, ripetendo la sequenza anche oltre 200 joule. I risultati riprendono le soglie di `shake`: lampada da 100 J, ventilatore da 200 J, modem da 300 J, PC da 400 J, microonde da 500 J e phon da 600 J. Sotto 100 J viene proposto di riprovare e non viene mostrato alcun codice. Durante la partita, “Scuoti” sopra la batteria lascia il posto all’elettrodomestico raggiunto. Ogni risultato ha un copy dedicato.

| Elettrodomestico | Soglia | Codice |
| --- | --- | --- |
| Lampada | 100 J | `LUM3N` |
| Ventilatore | 200 J | `W4TT` |
| Modem | 300 J | `V0LT` |
| PC | 400 J | `J0ULE` |
| Microonde | 500 J | `PO73NZA` |
| Phon | 600 J | `EN3R61A` |

## Avvio locale

L'accesso ai sensori di movimento richiede un contesto sicuro (`https`) sui dispositivi mobili. Per un test rapido su computer:

```sh
python3 -m http.server 8080
```

Aprire `http://localhost:8080`. Su computer viene mostrato un messaggio che invita ad aprire la pagina sul telefono: il gioco è bloccato e i controlli di simulazione sono rimossi.

## Pubblicazione

Pubblicare l'intera cartella su un host HTTPS. Su iPhone il permesso per il movimento viene richiesto dopo il tap su **Ricarica**.
