"use strict";
addEventListener('load', start);

function start() {
  var count = 0;
  var mainPhoto = document.querySelector('#mainphoto');
  var leftArrow = document.querySelector('#left');
  var rightArrow = document.querySelector('#right');
        
  var dot0 = document.querySelector('#dot0');
  var dot1 = document.querySelector('#dot1');
  var dot2 = document.querySelector('#dot2');
  var dot3 = document.querySelector('#dot3');
  var dot4 = document.querySelector('#dot4');

  dot0.onclick = function() {
    count=0;
    pick();
  }
  dot1.onclick = function() {
    count=1;
    pick();
  }
  dot2.onclick = function() {
    count=2;
    pick();
  }
  dot3.onclick = function() {
    count=3;
    pick();
  }
  dot4.onclick = function() {
    count=4;
    pick();
  }

  rightArrow.onclick = function() {
    count = (count+1)%5;
    pick();
  }

  leftArrow.onclick = function() {
    count = (count+4)%5;
    pick();
  }

  var pick = function(){        
    dot0.className = "";      
    dot1.className = "";      
    dot2.className = "";      
    dot3.className = "";      
    dot4.className = "";
    switch(count){
      case 0:
        mainPhoto.setAttribute ('src','images/ancient-oldest-trees-starlight-photography-beth-moon-5.jpg');
        dot0.className = "active";
        break;
      case 1:
        mainPhoto.setAttribute ('src','images/Wagner_Daphnia400.jpg');
        dot1.className = "active";
        break;
      case 2:
        mainPhoto.setAttribute ('src','images/The-Art-and-Science-of-Cooking-8.png');
        dot2.className = "active";
        break;
      case 3:
        mainPhoto.setAttribute ('src','images/small2-720481.jpg');
        dot3.className = "active";
        break;
      case 4:
        mainPhoto.setAttribute ('src','images/snowflake-11.jpg');
        dot4.className = "active";
        break;
    }
  }
} 

