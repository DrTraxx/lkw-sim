// ==UserScript==
// @name         Vehicle Rename
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Fahrzeuge in der Gesamtübersicht umbenennen
// @author       DrTraxx
// @match        https://www.lkw-sim.com/firma:disponent:fuhrpark*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lkw-sim.com
// @grant        none
// ==/UserScript==
/* global $ */

(async function () {
    'use strict';

    // rename link: https://www.lkw-sim.com/firma:disponent:rename?id=11083262&type=0&start=1 - post {"method": "rename_car", "carname": "NAME"}

    const regExPlace = /(?:Welt\s\d\s+\:\:\s)(?<place>[\w\W]+)/gm,
        rawPlace = $("strong:contains('Sie befinden sich hier')").parent().text().trim(),
        place = regExPlace.exec(rawPlace).groups.place.replace("(Hauptstelle)", "").trim(),
        shortPlace = place.slice(0, 3).toUpperCase();

    const vehicleShort = v => {
        const vName = v.toLowerCase();
        if (vName === "sattelzugmaschine") return "SZM";
        else if (vName === "kleintransporter") return "KTP";
        else if (vName === "kleintransporteranhänger") return "KTA";
        else if (vName.includes("lkw anhänger")) return "ANH";
        else if (vName.includes("lkw") && !vName.includes("anhänger")) return "LKW";
        else if (vName.includes("gigaliner")) return "GL";
        else if (vName.includes("auflieger")) return "AFL";
        else return "UNBEKANNT";
    }

    const renameVehicle = (capacity, type, load, id) => `${ shortPlace }-${ +capacity === 0 ? type : type + capacity + "-" + load }-${ id }`;

    $("h3:contains(Gesamtkapazitäten)").after(`<a class="btn btn-success" id="rename_list">Fahrzeuge umbenennen</a>`);

    async function startRename () {
        console.log("rename Starting");
        $(".accordion-toggle").each(async (k, i) => {

            const { textContent, attributes } = i,
                { href } = attributes,
                vehicleFullType = textContent.replace(/\(.+\)/g, "").trim(),
                shortType = vehicleShort(vehicleFullType),
                loadType = vehicleFullType.slice(0, 2).toUpperCase(),
                collapseID = href.value.split("#")[1];

            if (vehicleFullType === "Fahrzeuge und Anhänger im Zulauf") return;

            $(`#${ collapseID } >> table > tbody > tr`).each(async (ik, ii) => {

                const { children } = ii,
                    oldName = children[0].innerText.trim(),
                    capacity = children[5].innerText.replace(" FE", "").trim(),
                    renameElement = children[8],
                    renameHref = $(renameElement).children().last().attr("href"),
                    vehicleID = /id=(?<id>\d+)/g.exec(renameHref).groups.id,
                    renamedVehicle = renameVehicle(capacity, shortType, loadType, vehicleID);

                if (renamedVehicle !== oldName) {
                    console.log("vehicle renaming =>", renamedVehicle);
                    await $.post(renameHref, { "method": "rename_car", "carname": renamedVehicle })
                        .done(() => $("#rename_list").text(`Gruppe ${ k + 1 }, Fahrzeug ${ ik + 1 } => ${ oldName } => ${ renamedVehicle }`));
                }
            });
        });
    }

    $("#rename_list").on("click", e => startRename());
})();