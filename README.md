# Shaker Escape Room

Mini esperienza web mobile per una escape room Watt About.

Il giocatore preme **Ricarica** e scuote il telefono fino a riempire una batteria da 200 joule. Al completamento scopre quanta energia ha prodotto e riceve il codice `£N3R6Y`.

La conversione del movimento in joule replica la taratura del progetto `shake`: accelerazione raddoppiata da p5, soglia di movimento 0,5 per asse, campionamento ogni 4 frame e mappatura di 30.000 unità di movimento su 350 joule.

## Avvio locale

L'accesso ai sensori di movimento richiede un contesto sicuro (`https`) sui dispositivi mobili. Per un test rapido su computer:

```sh
python3 -m http.server 8080
```

Aprire `http://localhost:8080`. Su computer è disponibile il pulsante **Simula uno scossone** e si può usare anche la barra spaziatrice.

## Pubblicazione

Pubblicare l'intera cartella su un host HTTPS. Su iPhone il permesso per il movimento viene richiesto dopo il tap su **Ricarica**.
