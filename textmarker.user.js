// ==UserScript==
// @name         Textmarker
// @version      2.2.1
// @description  Markiert Anfahrten über 15 Kilometer, ändert die Rückfahreinstellungen, blendet in der Faxansicht zu spät kommende Fahrzeuge aus und in der Übersicht werden die Standorte mit 0 FE ausgeblendet
// @author       DrTraxx
// @match        https://*.lkw-sim.com/firma:disponent:fax-auftraege*
// @match        https://*.lkw-sim.com/firma:disponent:auftrag*
// @match        https://*.lkw-sim.com/firma:disponent?start=*
// @match        https://*.lkw-sim.com/firma:disponent
// @match        https://*.lkw-sim.com/firma:disponent:vertragsuebersicht
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lkw-sim.com
// @grant        none
// ==/UserScript==
/* global $ */

(function () {
  'use strict';

  const places = localStorage.placedata ? JSON.parse(localStorage.placedata) : [],
    disLow = +localStorage?.disLow || 50,
    disHig = +localStorage?.disHig || 200,
    colors = { lime: "limegreen", orange: "orange", red: "#F62817" },
    date = new Date(),
    dayDigit = date.getDate() < 10 ? "0" + date.getDate() : date.getDate(),
    todayDate = `${ dayDigit }.${ date.getMonth() + 1 }.${ date.getFullYear() }`,
    oneDay = 1 * 24 * 60 * 60 * 1000,
    twoDays = 2 * 24 * 60 * 60 * 1000;

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

  async function addLocation (location) {
    places.push(location);
    places.sort((a, b) => a > b ? 1 : -1);

    localStorage.placedata = JSON.stringify(places);

    await alert("Ort hinzugefügt.");

    window.location.reload();
  }

  async function removeLocation (location) {
    const newPlaces = places.filter(a => a !== location);

    localStorage.placedata = JSON.stringify(newPlaces);

    await alert("Ort entfernt.");

    window.location.reload();
  }

  function markDistance (deliver) {
    if (places.length > 0 && !places.includes(deliver)) {
      $("select").val("2");
    }

    $(`td:contains(' km')`).each((k, i) => {
      const distance = +i.innerText.replace(/\D+/g, "");

      let colVal = "";

      if (distance <= disLow) {
        colVal = colors.lime;
      } else if (distance > disLow && distance <= disHig) {
        colVal = colors.orange
      } else {
        colVal = colors.red;
      }

      $(i).css("background-color", colVal);
      $(i).parent().children().last().css("background-color", colVal);
    });
  }

  function markTarget () {
    $(`td:contains(' km')`).each((k, i) => {
      const deliver = i.innerText.split("(")[0].trim(),
        delDateElem = $(i).next().next(),
        splittedDate = delDateElem.text().split(","),
        delDate = splittedDate[0],
        delTime = splittedDate[1].trim(),
        delDateSplitted = delDate.split("."),
        delTimeSplitted = delTime.split(":"),
        delDateConst = new Date(+delDateSplitted[2], +delDateSplitted[1] - 1, +delDateSplitted[0], +delTimeSplitted[0], +delTimeSplitted[1]);

      // weniger als 24 Stunden
      if (delDateConst.getTime() - date.getTime() < oneDay) {
        delDateElem.css("background-color", colors.red);
      }
      // mehr als 24, weniger als 48 Stunden
      else if (delDateConst.getTime() - date.getTime() >= oneDay && delDateConst.getTime() - date.getTime() < twoDays) {
        delDateElem.css("background-color", colors.orange);
      }
      // mehr als 48 Stunden
      else if (delDateConst.getTime() - date.getTime() >= twoDays) {
        delDateElem.css("background-color", colors.lime);
      }

      if (places.includes(deliver)) {
        $(i).css("background-color", colors.lime);
        $(i).prepend(`<img src="https://www.lkw-sim.com/pics/icons/adr.png" width="16" height="16" title="Bei Lieferung an diesem Ort zurückfahren" class="place-remove" location="${ deliver }" style="cursor:pointer;padding-right:0.2em;">`);
      } else {
        $(i).css("background-color", colors.orange);
        $(i).prepend(`<img src="https://www.lkw-sim.com/pics/icons/tag_red.png" width="16" height="16" title="Bei Lieferung an diesem Ort stehenbleiben" class="place-add" location="${ deliver }" style="cursor:pointer;padding-right:0.2em;">`);
      }
    });
  }

  let deliver = null;

  if (window.location.pathname === "/firma:disponent:fax-auftraege") {
    const way = $("strong:contains('Strecke:')")?.[0]?.nextSibling?.textContent,
      regExp = /(?:\W\—\W)(?<target>.+)(?:\([\d\W]+km\))/gm,
      matchedLocation = regExp.exec(way);

    deliver = matchedLocation.groups.target.trim();

    markDistance(deliver);

    $("span[style='color:red']").parent().parent().parent().css("display", "none");
  } else if (window.location.pathname.includes("firma:disponent:auftrag")) {
    deliver = $("strong:contains('Lieferort')")?.[0]?.nextSibling?.textContent?.trim();

    markDistance(deliver);

    $("td:contains(0 FE)").each((k, i) => {
      if (i.textContent === "0 FE") $(i).parent().css("display", "none");
    });
  } else if (window.location.pathname === "/firma:disponent") {
    markTarget();
  } else if (window.location.pathname.includes("firma:disponent:vertragsuebersicht")) {
    markTarget();
  }

  $("body")
    .on("click", "#modal_toggle", e => $("#modal_places").css("display", "block"))
    .on("click", "#modal_dismiss", e => $("#modal_places").css("display", "none"))
    .on("click", "#modal_save", e => saveSettings())
    .on("click", ".place-add", e => addLocation(e.currentTarget.attributes.location.value))
    .on("click", ".place-remove", e => removeLocation(e.currentTarget.attributes.location.value));

})();