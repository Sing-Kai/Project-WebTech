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
        mainPhoto.setAttribute ('src','images/Ant_Nebula.jpg');
        dot0.className = "active";
        break;
      case 1:
        mainPhoto.setAttribute ('src','images/Alpheus_bellulus.jpg');
        dot1.className = "active";
        break;
      case 2:
        mainPhoto.setAttribute ('src','images/bee.jpg');
        dot2.className = "active";
        break;
      case 3:
        mainPhoto.setAttribute ('src','images/C_auratus_with_prey.jpg');
        dot3.className = "active";
        break;
      case 4:
        mainPhoto.setAttribute ('src','images/celular.jpg');
        dot4.className = "active";
        break;
    }
  }
} 

