let hamburger = document.getElementById('hamburger');   // burger icon
let navDesc = document.getElementById('nav');    // links container

// Toggle the mobile menu on burger click
hamburger.onclick = function () {
    navDesc.classList.toggle('open');                     // add/remove .open to show/hide
};