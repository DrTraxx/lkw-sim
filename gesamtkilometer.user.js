// ==UserScript==
// @name         Gesamtkilometer
// @version      1.0.2
// @description  Gefahrene Kilometer aktueller Monat
// @author       DrTraxx
// @match        https://*.lkw-sim.com/firma:eigenes-buero:firmeninfo
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lkw-sim.com
// @grant        none
// ==/UserScript==
/* global $ */

(function () {
    'use strict';

    const ktp = +$("strong:contains(Kleintransporter)")[0].nextSibling.textContent.replace(/\D+/g, ""),
        lkw = +$("strong:contains(LKW)")[0].nextSibling.textContent.replace(/\D+/g, ""),
        szm = +$("strong:contains(Sattelzugmaschine)")[0].nextSibling.textContent.replace(/\D+/g, ""),
        gil = +$("strong:contains(Gigaliner)")[0].nextSibling.textContent.replace(/\D+/g, ""),
        sum = ktp + lkw + szm + gil;


    $("strong:contains(Gigaliner)").parent().after(`<br><p><strong>Gesamt: </strong>${ sum.toLocaleString() } km</p>`);

})();