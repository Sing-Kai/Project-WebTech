"use strict";
addEventListener('load', start);

function start() {
  var show = false;
  var toggle = document.querySelector('.navbar-toggle');
  var navbar = document.querySelector('#navbar');
  
  toggle.onclick = function() {
    if(!show){
      navbar.className = navbar.className.replace(/\bcollapse\b/,'reveal');
      show = true;
    } else{
      navbar.className = navbar.className.replace(/\breveal\b/,'collapse');
      show = false;
    }
  }     
} 

