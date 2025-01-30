// ==UserScript==
// @name         Input-Control
// @version      1.1.1
// @description  Fahrer und Zugmaschinen mit Anhänger auswählen
// @author       DrTraxx
// @match        *://*.lkw-sim.com/firma:disponent:auftrag2*
// @match        *://lkw-sim.com/firma:disponent:auftrag2*
// @match        *://*.lkw-sim.com/firma:disponent:auftragsbestaetigung?method=methode-2
// @match        *://lkw-sim.com/firma:disponent:auftragsbestaetigung?method=methode-2
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lkw-sim.com
// @grant        none
// ==/UserScript==
/* global $ */

(function () {
    'use strict';

    const iptTypes = {};

    let driverID = "";

    $("input[type='number']:not(#modal_low):not(#modal_hig)").each((k, i) => {
        const iptDesc = i.nextSibling.textContent.trim();

        let iptType = "";

        if (i.id.includes("d")) {
            iptType = "driver";
            driverID = i.id;
        } else if (i.id.includes("c")) {
            iptType = "lkw";
            if (iptDesc.includes("Gigaliner")) $(i).attr("watched_by_script", "true");
        } else if (i.id.includes("t")) {
            iptType = "trailer";
            $(i).attr("watched_by_script", "true");
        }

        iptTypes[i.id] = {
            text: iptDesc,
            type: iptType,
            id: i.id
        }
    });

    for (const strong of document.getElementsByTagName("strong")) {
        if (strong.innerHTML === "Spätester Liefertermin:") {
            const select = document.createElement("select"),
                oneDriver = document.createElement("option"),
                twoDriver = document.createElement("option"),
                driveFactor = +localStorage.drivefactor || 1,
                factorOne = driveFactor === 1;

            oneDriver.text = "1 Fahrer pro Fahrzeug";
            oneDriver.value = 1;

            twoDriver.text = "2 Fahrer pro Fahrzeug";
            twoDriver.value = 2;

            if (factorOne === true) oneDriver.selected = true;
            else twoDriver.selected = true;

            select.id = "driverfactor";
            select.add(oneDriver);
            select.add(twoDriver);
            select.addEventListener("change", (e) => { localStorage.drivefactor = +e.target.value; });

            strong.parentNode.nextElementSibling.insertBefore(select, null);
        }
    }

    function checkDriver () {
        const drivefactor = +localStorage.drivefactor || 1;

        let sumDrivers = 0;

        for (const i in iptTypes) {
            const { text, type, id } = iptTypes[i];
            if (type === "lkw") {
                sumDrivers += +$(`#${ id }`).val();
            }
        }

        $(`#${ driverID }`).val(sumDrivers * drivefactor).trigger("change");
    }

    // $("input[type='number']:not(input[watched_by_script='true'])").attr("disabled", "disabled");
    $("input[type='number']:not(input[watched_by_script='true'])").css("-moz-appearance", "textfield");
    $(".add, .delete").css("display", "none");

    $(document).on("change", "input[watched_by_script='true']", e => {
        if (e.isTrigger) return;

        const target = e.target,
            { id, value } = target,
            iptType = iptTypes[id];

        if (iptType.type === "trailer") {
            for (const i in iptTypes) {
                if (iptType.text.includes("auflieger") && iptTypes[i].text.includes("Sattelzugmaschine")) $(`#${ i }`).val(value).trigger("change");
                if (iptType.text.includes("Anhänger") && iptTypes[i].text.includes("Lkw")) $(`#${ i }`).val(value).trigger("change");
                if (iptType.text === "Kleintransporteranhänger" && iptTypes[i].text === "Kleintransporter") $(`#${ i }`).val(value).trigger("change");
            }
            checkDriver();
        }
        if (iptType.type === "lkw" && iptType.text.includes("Gigaliner")) {
            checkDriver();
        }
    });

    $(document).on("keypress", e => {
        const { key, target } = e;

        if (target.nodeName !== "BODY") {
            return;
        }

        if (key === "e") $("input.btn").click();
    });

})();
