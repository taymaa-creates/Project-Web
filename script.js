document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".form");
  const button = document.getElementById("button");

  form.addEventListener("submit", function (e) {
    e.preventDefault(); 

    const name = form.querySelector('input[type="text"]').value.trim();
    const email = form.querySelector('input[type="email"]').value.trim();
    const message = form.querySelector('textarea').value.trim();

    if (!name || !email || !message) {
      alert("Please fill out all fields.");
      return;
    }
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    if (!email.match(emailPattern)) {
      alert("Please enter a valid email address.");
      return;
    }
    alert("Thank you! Your message has been sent.");
    form.reset(); 
  });
});
let hamburger = document.getElementById('hamburger');   
let navDesc = document.getElementById('nav');    

hamburger.onclick = function () {
    navDesc.classList.toggle('open');                    
};
const messages = [
  "Your thoughts matter to us.",
  "Got a recipe idea? Share it!",
  "We love hearing from fellow foodies.",
  "Questions, feedback, or just saying hi?",
  "Let’s cook up something great together!"
];

let index = 0;
const infoBox = document.getElementById("changing-info");

setInterval(() => {
  infoBox.style.opacity = 0;
  setTimeout(() => {
    index = (index + 1) % messages.length;
    infoBox.textContent = messages[index];
    infoBox.style.opacity = 1;
  }, 300);
}, 3000);
