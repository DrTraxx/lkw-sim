// ==UserScript==
// @name         Textmarker
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Marks Elements with 15km and above
// @author       DrTraxx
// @match        https://*lkw-sim.com/firma:disponent:fax-auftraege*
// @match        https://*lkw-sim.com/firma:disponent:auftrag*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lkw-sim.com
// @grant        none
// ==/UserScript==
/* global $ */

(function () {
    'use strict';

    /*
    Hier in dem Array die Orte eintragen, an denen die Fahrzeuge bleiben sollen. Bitte ans Schema halten.
    */
    const places = [
        "Hamm", "Recklinghausen", "Düsseldorf", "Köln", "Duisburg", "Essen", "Gelsenkirchen", "Hagen", "Herne", "Mönchengladbach",
        "Siegen", "Leverkusen", "Aachen", "Bottrop", "Bochum", "Wuppertal", "Osnabrück", "Münster", "Mülheim an der Ruhr", "Bonn",
        "Neuss", "Paderborn", "Kassel", "Oberhausen", "Krefeld", "Bergisch Gladbach", "Moers", "Bielefeld", "Osnabrück", "Koblenz",
        "Offenbach am Main", "Erfurt", "Wolfsburg", "Hannover", "Frankfurt am Main", "Braunschweig", "Göttingen", "Salzgitter", "Hildesheim"
    ];
    /*
    Die beiden Zahlen hier geben die Entfernungen für die farbliche Markierung an. Zahlen bitte als Zahlen schreiben, ohne Anführungszeichen.
    */
    const disLow = 50,
        disHig = 200;

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

    if (!places.includes(deliver)) {
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