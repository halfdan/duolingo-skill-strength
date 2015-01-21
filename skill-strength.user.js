// ==UserScript==
// @name         Skill Strength Viewer
// @namespace    http://blog.fabianbecker.eu/
// @version      0.1.1
// @description  Shows individual skill strength
// @author       Fabian Becker
// @match        https://www.duolingo.com/*
// @grant        none
// ==/UserScript==

function inject(f) { //Inject the script into the document
  var script;
  script = document.createElement('script');
  script.type = 'text/javascript';
  script.setAttribute('name', 'skill_strength');
  script.textContent = '(' + f.toString() + ')(jQuery)';
  document.head.appendChild(script);
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
        
        console.log("Average Age (hours): " + averageAge / 3600);
        console.log("Median Age (hours): " + medianAge / 3600);
        
        var el = $("<div class='box-gray' id='skillstrength'></div>"),
        	list = $("<ul class='list-leaderboard'></ul>"),
            language = window.duo.user.attributes.learning_language,
            skillIdMap = {};
        
       	var languageData = duo.user.get('language_data'),
            language = duo.user.get('learning_language');
        
        languageData[language].skills.each(function (skill) {
            var key = skill.get('url_title');
            skillIdMap[key] = skill.get('new_index');
        });
        
        _.each(skillStrength, function (skill) {
            var item = $("<li class='list-leaderboard-item'></li>");
            //item.append("<span class='skill-icon small gold avatar' style='width: 40px; heigh: 40px; margin: 0'><span style='zoom: 0.72; -moz-transform:scale(0.60); -moz-transform-origin: 0 0;' class='skill-icon-image skill-icon-"+skillIdMap[skill.url]+"'></span></span>");
            item.append("<span class='points'>" + (skill.strength * 100).toFixed(1) + " %</span>");
            item.append("<span class='name'><a class='username' href='/skill/" + language + "/" + skill.url + "'>" + skill.name + "</a></span>");
            list.append(item);
        });
        
        el.append(            
            $("<h2>Skill Strength</h2>"),
            $("<div class='board'></div>").append(list)
        );
        
        el.append("<span><strong>Overall Strength: </strong>" + (averageStrength * 100).toFixed(1) + " %</span><br />");
        el.append("<span><strong>Dead Words (0 Strength): </strong>" + zeroStrength + "/" + vocab.length + "</span>");
        
        $("section.sidebar-left > div.inner").append(el);
        isLoading = false;        
    }
    
    function average(data) {
        var sum = data.reduce(function(a, b) { return a + b });
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
                    strength: median(value.map(function(v) { return v.strength; })),                    
                    url: value[0].skill_url_title
                }
            }).value();
        
        // Sort by strength (weakest first)
        skills.sort(function (a, b) {
            return a.strength - b.strength;
        });
        
        return skills;
    }
    
    // Variable to prevent race condition
    var isLoading = false;
    
    /**
     * Fetches vocabulary
     */
    function showSkillStrength() {
        // Only show if we are on the home screen
        if ($('#app').hasClass('home') && !$('#skillstrength').length && !isLoading) {
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
    $(document).ajaxComplete(function () {
    	showSkillStrength();
    });
}    