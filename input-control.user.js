// ==UserScript==
// @name         Input-Control
// @version      1.0.0
// @description  Fahrer und Zugmaschinen mit Anhänger auswählen
// @author       DrTraxx
// @match        https://www.lkw-sim.com/firma:disponent:auftrag2*
// @match        https://www.lkw-sim.com/firma:disponent:auftragsbestaetigung?method=methode-2
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lkw-sim.com
// @grant        none
// ==/UserScript==
/* global $ */

(function () {
    'use strict';

    const iptTypes = {};

    let driverID = "";

    $("input[type='number']").each((k, i) => {
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

    function checkDriver () {
        let sumDrivers = 0;
        for (const i in iptTypes) {
            const { text, type, id } = iptTypes[i];
            if (type === "lkw") {
                sumDrivers += +$(`#${ id }`).val();
            }
        }
        $(`#${ driverID }`).val(sumDrivers).trigger("change");
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
