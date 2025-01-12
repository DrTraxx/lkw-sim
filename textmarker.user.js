// ==UserScript==
// @name         Textmarker
// @version      2.0.0
// @description  Markiert Anfahrten über 15 Kilometer, ändert die Rückfahreinstellungen, blendet in der Faxansicht zu spät kommende Fahrzeuge aus und in der Übersicht werden die Standorte mit 0 FE ausgeblendet
// @author       DrTraxx
// @match        https://*.lkw-sim.com/firma:disponent:fax-auftraege*
// @match        https://*.lkw-sim.com/firma:disponent:auftrag*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lkw-sim.com
// @grant        none
// ==/UserScript==
/* global $ */

(function () {
    'use strict';

    const places = localStorage.placedata ? JSON.parse(localStorage.placedata) : [],
        disLow = +localStorage?.disLow || 50,
        disHig = +localStorage?.disHig || 200;

    $(".navbar-inner.blue > div:first > div.nav-collapse > .nav")
        .append(`<li class="dropdown">
  					<a class="dropdown-toggle" style="cursor:pointer;" id="modal_toggle">Liefereinstellungen</a>
  				</li>`);

    $("body")
        .append(`<div class="modal" tabindex="-1" role="dialog" id="modal_places" style="display:none;">
                   <div class="modal-dialog" role="document">
                     <div class="modal-content">
                       <div class="modal-header">
                         <h5 class="modal-title">Einstellungen</h5>
                       </div>
                       <div class="modal-body">
                         <strong>Lieferorte, an denen die LKW nicht zurückfahren sollen</strong>
                         <p>Bitte die Orte korrekt schreiben und mit einem Komma voneinander trennen!<br>
                         Bleibt das Textfeld leer, werden die Rückfahreinstellungen nicht geändert.</p>
                         <textarea id="modal_stay" style="height:140px;width:520px">${ places.join(", ") }</textarea>
                         <br>
                         <!--<div class="span4">-->
                           Fahrtstrecke grün bis (km)
                           <input id="modal_low" type="number" min="15" max="${ disHig - 1 }" value="${ disLow }" style="width:75px;">
                         <!--</div>
                         <div class="span4">-->
                         <br>
                           Fahrtstrecke rot ab (km)
                           <input id="modal_hig" type="number" min="${ disLow + 1 }" value="${ disHig }" style="width:75px;">
                         <!--</div>-->
                       </div>
                       <div class="modal-footer">
                         <button type="button" class="btn btn-primary" id="modal_save">Speichern</button>
                         <button type="button" class="btn btn-secondary" id="modal_dismiss">Abbrechen</button>
                       </div>
                     </div>
                   </div>
                 </div>`);

    async function saveSettings () {
        const newPlaces = $("#modal_stay").val().trim() ? $("#modal_stay").val().split(",").map(a => a.trim()).sort((a, b) => a > b ? 1 : -1) : [],
            newLow = +$("#modal_low").val(),
            newHig = +$("#modal_hig").val();

        localStorage.placedata = JSON.stringify(newPlaces);
        localStorage.disLow = JSON.stringify(newLow);
        localStorage.disHig = JSON.stringify(newHig);

        await alert("Erfolgreich gespeichert!");

        window.location.reload();
    }

    $("body")
        .on("click", "#modal_toggle", e => $("#modal_places").css("display", "block"))
        .on("click", "#modal_dismiss", e => $("#modal_places").css("display", "none"))
        .on("click", "#modal_save", e => saveSettings());

    let deliver = null;

    if (window.location.pathname === "/firma:disponent:fax-auftraege") {
        const way = $("strong:contains('Strecke:')")?.[0]?.nextSibling?.textContent,
            regExp = /(?:\W\—\W)(?<target>.+)(?:\(\d+\Wkm\))/gm,
            matchedLocation = regExp.exec(way);

        deliver = matchedLocation.groups.target.trim();

        $("span[style='color:red']").parent().parent().parent().css("display", "none");
    } else if (window.location.pathname.includes("firma:disponent:auftrag")) {
        deliver = $("strong:contains('Lieferort')")?.[0]?.nextSibling?.textContent?.trim();

        $("td:contains(0 FE)").each((k, i) => {
            if (i.textContent === "0 FE") $(i).parent().css("display", "none");
        });
    }

    if (places.length > 0 && !places.includes(deliver)) {
        $("select").val("2");
    }

    $(`td:contains(' km')`).each((k, i) => {
        const distance = +i.innerText.replace(/\D+/g, "");

        let colVal = "";

        if (distance <= disLow) {
            colVal = "limegreen";
        } else if (distance > disLow && distance <= disHig) {
            colVal = "orange"
        } else {
            colVal = "#F62817";
        }

        $(i).css("background-color", colVal);
        $(i).parent().children().last().css("background-color", colVal);
    });

})();