// ==UserScript==
// @name         Duolingo Skill Strength Viewer
// @namespace    http://blog.fabianbecker.eu/
// @version      0.2.2
// @description  Shows individual skill strength
// @author       Fabian Becker
// @match        https://www.duolingo.com/*
// @downloadURL  https://github.com/halfdan/duolingo-skill-strength/raw/master/skill-strength.user.js
// @updateURL    https://github.com/halfdan/duolingo-skill-strength/raw/master/skill-strength.user.js
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.2.1/lodash.min.js
// @grant        none
// ==/UserScript==

function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

addGlobalStyle(
    ".list-skills { margin: 30px -20px 0 -10px; overflow: auto; max-height: 255px; padding: 10px; }" +
    ".list-skills-item { padding: 0 10px 0 0; margin: 10px 0 0 0; }" +
    ".list-skills-item:before { display: table; content: ''; line-height: 0; }" +
    ".list-skills-item .points { float: right; font-weight: 300; color: #999; }" +
    ".list-skills-item .name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }"
);

function inject(f) { //Inject the script into the document
  var script;
  script = document.createElement('script');
  script.type = 'text/javascript';
  script.setAttribute('name', 'skill_strength');
  script.textContent = '(' + f.toString() + ')(jQuery)';
  document.body.appendChild(script);
}
inject(f);

function f($) {
    function handleVocabulary(data) {
        var vocab = data.vocab_overview,
            fuerte = 0.0,
            edad = 0.0,
            ahora = new Date().getTime();

        var averageStrength = average(vocab.map(function(v) { return v.strength; }));
        var averageAge = average(vocab.map(function(v) { return (ahora - v.last_practiced_ms) / 1000 ; }));
        var medianAge = median(vocab.map(function(v) { return (ahora - v.last_practiced_ms) / 1000 ; }));
        var zeroStrength = vocab.filter(function(v) { return v.strength === 0; }).length;

        var skillStrength = calculateSkillStrength(vocab);
        console.log("Average Strength: " + averageStrength);
        console.log("Dead words (0 strength): " + zeroStrength);
        var deadwords = vocab.filter(function(v) { return v.strength === 0; });
        var deadwordsDict = _.countBy(deadwords.map(a=>a.skill_url_title),function(word){return word;});
        var allwordsDict = _.countBy(vocab.map(a=>a.skill_url_title),function(word){return word;});

        console.log("Average Age (hours): " + averageAge / 3600);
        console.log("Median Age (hours): " + medianAge / 3600);

        var el = $("<div class='box-gray' id='skillstrength'></div>"),
        	list = $("<ul class='list-skills'></ul>"),
            skillIdMap = {};

       	var language = data.learning_language;

        _.each(skillStrength, function (skill) {
            var item = $("<li class='list-skills-item'></li>");
            item.append("<span class='points'>" + (skill.strength * 100).toFixed(1) + " %</span>");
            item.append("<span class='name'><a class='username' href='/skill/" + language + "/" + skill.url + "/practice'>" + skill.name + "</a> ("+(skill.url in deadwordsDict?deadwordsDict[skill.url]:0)+"/"+allwordsDict[skill.url]+")</span>");
            list.append(item);
        });

        el.append(
            $("<h2>Skill Strength</h2>"),
            $("<div class='board'></div>").append(list)
        );

        el.append("<span><strong>Overall Strength: </strong>" + (averageStrength * 100).toFixed(1) + " %</span><br />");
        el.append("<span><strong>Dead Words (0 Strength): </strong>" + zeroStrength + "/" + vocab.length + "</span>");

        displaySkillStrength(el);
        isLoading = false;
    }

    function displaySkillStrength(el) {
        if ($("section.sidebar-left > div.inner").length > 0) {
            $("section.sidebar-left > div.inner").append(el);
        } else {
            //English - German - Italian - Portuguese - Spanish - French
            var parent = $("h2:contains('Friends'),h2:contains('Freunde'),h2:contains('Amici'),h2:contains('Amigos'),h2:contains('Amis')").parent();
            el.addClass(parent.attr('class'));
            el.insertAfter(parent);
        }
    }

    function average(data) {
        var sum = data.reduce(function(a, b) { return a + b; });
        return sum / data.length;
    }

    function median(data) {

        // extract the .values field and sort the resulting array
        var m = data.sort(function(a, b) {
            return a - b;
        });

        var middle = Math.floor((m.length - 1) / 2); // NB: operator precedence
        if (m.length % 2) {
            return m[middle];
        } else {
            return (m[middle] + m[middle + 1]) / 2.0;
        }
    }

    function calculateSkillStrength(vocab) {
        var skills = _.chain(vocab)
            .groupBy('skill')
            .map(function(value, key) {
                return {
                    name: key,
                    strength: average(value.map(function(v) { return v.strength; })),
                    url: value[0].skill_url_title
                };
            }).value();

        // Sort by strength (weakest first)
        skills.sort(function (a, b) {
            return a.strength - b.strength;
        });

        return skills;
    }

    // Variable to prevent race condition
    var isLoading = false;

    function isHomeScreen() {
        var v1home = $('#app').hasClass('home');
        var v2home = !!$('#root').length;
        return v1home || v2home;
    }

    /**
     * Fetches vocabulary
     */
    function showSkillStrength() {
        // Only show if we are on the home screen and it's not already there
        if (isHomeScreen() && !$('#skillstrength').length && !isLoading) {
            isLoading = true;
            $.ajax({
                url: '/vocabulary/overview',
                success: function (data) {
                    handleVocabulary(data);
                }
            });
        }
    }

    $(document).ready(function () {
        showSkillStrength();
    });

    function onChange(mutations) {
        if (window.location.pathname == "/"
            && !document.getElementById("skillstrength")
            && !isLoading) {
            showSkillStrength();
        }
    }

    new MutationObserver(onChange).observe(document.body, {
    childList : true,
    subtree : true
    });

}
