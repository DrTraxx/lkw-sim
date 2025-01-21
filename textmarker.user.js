// ==UserScript==
// @name         Textmarker
// @version      2.5.1
// @description  Markiert Anfahrten über 15 Kilometer, ändert die Rückfahreinstellungen, blendet in der Faxansicht zu spät kommende Fahrzeuge aus und in der Übersicht werden die Standorte mit 0 FE ausgeblendet
// @author       DrTraxx
// @match        *://www.lkw-sim.com/firma:disponent*
// @match        *://lkw-sim.com/firma:disponent*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lkw-sim.com
// @grant        GM_addStyle
// ==/UserScript==
/* global $ */

(function () {
    'use strict';

    GM_addStyle(`
        .modal-textmarker {
            display: none;
            position: fixed; /* Stay in place front is invalid - may break your css so removed */
            top: 10em;
            left:50%;
            width: 600px;
            overflow: auto;
            background-color: whitesmoke;
            z-index: 9999;
            border:1px solid #999;
            border-radius:6px;
            box-shadow:0 3px 7px rgba(0,0,0,.3);
            background-clip:padding-box;
        }
        .modal-body {
            overflow-y: auto;
        }`);

    if (localStorage.placedata || localStorage.disLow || localStorage.disHig) {
        localStorage.textmarker = JSON.stringify({
            places: localStorage.placedata ? JSON.parse(localStorage.placedata) : [],
            disLow: +localStorage?.disLow || 50,
            disHig: +localStorage?.disHig || 200,
        });

        localStorage.removeItem("placedata");
        localStorage.removeItem("disLow");
        localStorage.removeItem("disHig");
    }

    const settings = localStorage.textmarker ? JSON.parse(localStorage.textmarker) : { places: [], disLow: 50, disHig: 200, use_distance: false, distance: 500 },
        { places, disLow, disHig } = settings,
        path = window.location.pathname,
        colors = { lime: "limegreen", orange: "orange", red: "#F62817" },
        branches = [],
        date = new Date(),
        dayDigit = date.getDate() < 10 ? "0" + date.getDate() : date.getDate(),
        todayDate = `${ dayDigit }.${ date.getMonth() + 1 }.${ date.getFullYear() }`,
        oneDay = 1 * 24 * 60 * 60 * 1000,
        twoDays = 2 * 24 * 60 * 60 * 1000,
        faxVehicles = [];


    let lateVehicles = false,
        onTimeFe = 0,
        delayedFe = 0;

    $(`a[href*='https://www.lkw-sim.com/firma:niederlassungen:niederlassung-betreten']`)
        .each((k, i) => branches.push(i.textContent));

    console.info(branches);

    $(".navbar-inner.blue > div:first > div.nav-collapse > .nav")
        .append(`<li class="dropdown">
  					<a class="dropdown-toggle" style="cursor:pointer;" id="modal_toggle">Liefereinstellungen</a>
  				</li>`);

    $("body")
        .append(`<div class="modal-textmarker" tabindex="-1" role="dialog" id="modal_places">
                   <div class="modal-dialog" role="document">
                     <div class="modal-content">
                       <div class="modal-header">
                         <h3 class="modal-title">Einstellungen</h3>
                       </div>
                       <div class="modal-body">
                         <strong>Lieferorte, an denen die LKW nicht zurückfahren sollen</strong>
                         <p>Bitte die Orte korrekt schreiben und mit einem Komma voneinander trennen!<br>
                         Bleibt das Textfeld leer, werden die Rückfahreinstellungen nicht geändert.</p>
                         <textarea id="modal_stay" style="height:140px;width:520px">${ places.join(", ") }</textarea>
                         <hr>
                         <div class="form-check" style="display:flex;">
                           <input type="checkbox" class="form-check-input" id="modal_use_distance" ${ settings.use_distance ? 'checked="checked"' : '' }>
                           <label class="form-check-label" for="modal_use_distance" style="margin-left:1em;">Rückfahrten nach Entfernung</label>
                         </div>
                         Zurückfahren ab (km)
                         <input id="modal_distance" type="number" min="0" value="${ settings.distance }" style="width:75px;">
                         <hr>
                         Fahrtstrecke grün bis (km)
                         <input id="modal_low" type="number" min="15" max="${ disHig - 1 }" value="${ disLow }" style="width:75px;background-color:${ colors.lime }">
                         <br>
                         Fahrtstrecke rot ab (km)
                         <input id="modal_hig" type="number" min="${ disLow + 1 }" value="${ disHig }" style="width:75px;background-color:${ colors.red }">
                       </div>
                       <div class="modal-footer">
                         <button type="button" class="btn btn-primary" id="modal_save">Speichern</button>
                         <button type="button" class="btn btn-secondary" id="modal_dismiss">Abbrechen</button>
                       </div>
                     </div>
                   </div>
                 </div>`);

    async function saveSettings () {
        const newPlaces = document.getElementById('modal_stay').value.trim() ? document.getElementById('modal_stay').value.split(",").map(a => a.trim()).sort((a, b) => a > b ? 1 : -1) : [];

        localStorage.textmarker = JSON.stringify({
            places: newPlaces,
            disLow: +document.getElementById('modal_low').value,
            disHig: +document.getElementById('modal_hig').value,
            use_distance: document.getElementById('modal_use_distance').checked,
            distance: +document.getElementById('modal_distance').value
        });

        await alert("Erfolgreich gespeichert!");

        window.location.reload();
    }

    async function toggleLocation (location, add) {

        if (add) places.push(location);

        const newPlaces = add ? places : places.filter(a => a !== location);
        newPlaces.sort((a, b) => a > b ? 1 : -1);

        settings.places = newPlaces;
        localStorage.textmarker = JSON.stringify(settings);

        await alert(`Ort  ${ add ? "hinzugefügt" : "entfernt" }`);

        window.location.reload();
    }

    function createLkwButton () {
        faxVehicles.sort((a, b) => a.distance > b.distance ? 1 : -1);

        for (const vehicle of faxVehicles) {
            const { delay, distance, capacity } = vehicle;

            if (delay && !lateVehicles) continue;

            if ($(`.add-lkw[capacity=${ capacity }]`).length === 0) {
                $("#fax_btn_grp").append(`<a class="btn btn-success add-lkw" capacity="${ capacity }">+ ${ capacity } FE - ${ distance.toLocaleString() } km</a>`);
            }
        }
    }

    function markDistance (deliver, distance, fax = false) {
        if (document.getElementsByName("return").length > 0) {
            if (settings.use_distance) {
                if (distance >= settings.distance) {
                    document.getElementsByName("return")[0].value = "2";
                }
            } else {
                if (places.length > 0 && !places.includes(deliver)) {
                    document.getElementsByName("return")[0].value = "2";
                }
            }
        }

        $(`td:contains(' km')`).each((k, i) => {
            const distance = +i.innerText.replace(/\D+/g, "");

            if (fax) {
                faxVehicles.push({
                    delay: i.parentElement.children[6].children[0].children[1].style.color === "red",
                    distance: distance,
                    capacity: +i.parentElement.children[2].textContent.replace(/\D+/g, ""),
                    toggleElement: $(i.parentElement.children[7].children[0])
                });

                if (i.parentElement.children[6].children[0].children[1].style.color === "red") {
                    delayedFe += +i.parentElement.children[2].textContent.replace(/\D+/g, "");
                } else {
                    onTimeFe += +i.parentElement.children[2].textContent.replace(/\D+/g, "");
                }
            }

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

        if (fax) {
            createLkwButton();

            $("#fax_btn_grp")
                .after(`<div class="alert alert-danger" style="margin-top:2em;">
                  <strong>Verfügbare Frachteinheiten</strong><br><strong>Pünktlich:</strong> ${ onTimeFe.toLocaleString() } FE<br><strong>Verspätet:</strong> ${ delayedFe.toLocaleString() } FE<br><strong>Gesamt:</strong> ${ (onTimeFe + delayedFe).toLocaleString() } FE
                </div>`);
        }
    }

    function addFaxLkw (capacity) {
        const vehicle = lateVehicles ? faxVehicles.find(i => i.capacity === capacity) : faxVehicles.filter(i => i.delay === false).find(i => i.capacity === capacity),
            idx = faxVehicles.findIndex(e => e === vehicle);

        if (idx === -1) {
            alert("Kein passender LKW vorhanden!");
            $(`.add-lkw[capacity=${ capacity }]`).text(`+ ${ capacity } FE - kein Fahrzeug`);
            return;
        }

        vehicle.toggleElement.click();
        faxVehicles.splice(idx, 1);

        const newNearestVehicle = lateVehicles ? faxVehicles.find(i => i.capacity === capacity) : faxVehicles.filter(i => i.delay === false).find(i => i.capacity === capacity),
            btnTxt = newNearestVehicle ? `+ ${ capacity } FE - ${ newNearestVehicle?.distance?.toLocaleString() } km` : `+ ${ capacity } FE - kein Fahrzeug`;

        $(`.add-lkw[capacity=${ capacity }]`).text(btnTxt);
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

            if (!settings.use_distance) {
                if (places.includes(deliver)) {
                    $(i).css("background-color", colors.lime);
                    $(i).prepend(`<img src="https://www.lkw-sim.com/pics/icons/adr.png" width="16" height="16" title="Bei Lieferung an diesem Ort zurückfahren" class="place-remove" location="${ deliver }" style="cursor:pointer;padding-right:0.2em;">`);
                } else {
                    $(i).css("background-color", colors.orange);
                    $(i).prepend(`<img src="https://www.lkw-sim.com/pics/icons/tag_red.png" width="16" height="16" title="Bei Lieferung an diesem Ort stehenbleiben" class="place-add" location="${ deliver }" style="cursor:pointer;padding-right:0.2em;">`);
                }
            }
        });
    }

    function toggleLateVehicles ($e) {
        lateVehicles = !lateVehicles;
        if ($e.hasClass("btn-danger")) {
            $("span[style='color:red']").parent().parent().parent().css("display", "");
            $e.text("Verspätungen ausblenden");
            createLkwButton();
        } else {
            $("span[style='color:red']").parent().parent().parent().css("display", "none");
            $e.text("Verspätungen einblenden");
        }
        $e.toggleClass("btn-danger btn-success");
    }


    let deliver = null,
        distance = 0;

    if (path === "/firma:disponent:fax-auftraege") {
        $("span[style='color:red']").parent().parent().parent().css("display", "none");

        $("h2:contains(Anschlussaufträge)")
            .after(`<div class="btn-group" id="fax_btn_grp"><a class="btn btn-danger" id="toggle_lates">Verspätungen einblenden</></div>`);

        const way = $("strong:contains('Strecke:')")?.[0]?.nextSibling?.textContent,
            regExp = /(?<start>[\w\W]+)\W\—\W(?<destination>.+)\((?<distance>[\d\w\s]+)\)/g,
            matchedExp = regExp.exec(way);

        deliver = matchedExp.groups.destination.trim();

        markDistance(deliver, +matchedExp.groups.distance.replace(/\D+/g, ""), true);

    } else if (path === "/firma:disponent:auftrag" || path === "/firma:disponent:auftrag2" || path === "/firma:disponent:auftrag3") {
        const strongElements = document.getElementsByTagName("strong");

        for (const strong of strongElements) {
            const { textContent } = strong;

            if (textContent === "Lieferort:") deliver = strong.nextSibling.textContent.trim();
            if (textContent === "Entfernung:") distance = +strong.nextSibling.textContent.replace(/\D+/g, "");
        }

        markDistance(deliver, distance);

        $("td:contains(0 FE)").each((k, i) => {
            if (i.textContent === "0 FE") $(i).parent().css("display", "none");
        });
    } else if (path === "/firma:disponent" || path === "/firma:disponent:vertragsuebersicht") {
        markTarget();
    }

    $("body")
        .on("click", "#modal_toggle", e => $("#modal_places").css("display", "inline-block"))
        .on("click", "#modal_dismiss", e => $("#modal_places").css("display", "none"))
        .on("click", "#modal_save", e => saveSettings())
        .on("click", ".place-add", e => toggleLocation(e.currentTarget.attributes.location.value, true))
        .on("click", ".place-remove", e => toggleLocation(e.currentTarget.attributes.location.value, false))
        .on("click", "#toggle_lates", e => toggleLateVehicles($(e.currentTarget)))
        .on("click", ".add-lkw", e => addFaxLkw(+e.currentTarget.attributes.capacity.value));

})();