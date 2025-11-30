document.querySelectorAll(".btn-outline").forEach(button => {
  button.addEventListener("click", function(e) {
    e.preventDefault();
    const container = document.getElementById("contactFormContainer");

    // CONTACT US
    if (button.dataset.type === "contact") {
      const formHTML = `
        <section id="contact-form" class="contact-form-section">
          <h2>Send us a message</h2>
          <form id="contactForm">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" required />
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required />
            <label for="message">Message</label>
            <textarea id="message" name="message" rows="5" required></textarea>
            <button type="submit" class="btn-primary">Send Message</button>
          </form>
        </section>
      `;
      container.innerHTML = formHTML;
      container.scrollIntoView({ behavior: "smooth" });
      document.getElementById("contactForm").addEventListener("submit", function(e) {
        e.preventDefault();
        alert("Thanks for reaching out! We'll get back to you soon.");
        this.reset();
      });
    }

    // FEEDBACK
    if (button.dataset.type === "feedback") {
      const feedbackHTML = `
        <section id="feedback-form" class="feedback-form-section">
          <h2>We value your feedback</h2>
          <form id="feedbackForm">
            <label for="type">Feedback Type</label>
            <select id="type" name="type" required>
              <option value="">Choose one...</option>
              <option value="suggestion">Suggestion</option>
              <option value="bug">Bug Report</option>
              <option value="comment">General Comment</option>
            </select>
            <label for="message">Message</label>
            <textarea id="message" name="message" rows="5" required></textarea>
            <button type="submit" class="btn-primary">Submit Feedback</button>
          </form>
        </section>
      `;
      container.innerHTML = feedbackHTML;
      container.scrollIntoView({ behavior: "smooth" });
      document.getElementById("feedbackForm").addEventListener("submit", function(e) {
        e.preventDefault();
        alert("✅ Thanks for your feedback! It helps us improve Ctrl+Alt+Eat.");
        this.reset();
      });
    }

    // COLLABORATE / LET’S TALK
    if (button.dataset.type === "collaborate") {
      const collabHTML = `
        <section id="collab-form" class="collab-form-section">
          <h2>Let’s collaborate</h2>
          <form id="collabForm">
            <label for="name">Your Name</label>
            <input type="text" id="name" name="name" required />
            <label for="email">Your Email</label>
            <input type="email" id="email" name="email" required />
            <label for="idea">Collaboration Idea</label>
            <textarea id="idea" name="idea" rows="5" required></textarea>
            <button type="submit" class="btn-primary">Submit Idea</button>
          </form>
        </section>
      `;
      container.innerHTML = collabHTML;
      container.scrollIntoView({ behavior: "smooth" });
      document.getElementById("collabForm").addEventListener("submit", function(e) {
        e.preventDefault();
        const idea = document.getElementById("idea").value.trim();
        if (!idea) {
          alert("Please share your collaboration idea.");
          return;
        }
        alert("🍴 Thanks for your idea! We’ll reach out to collaborate soon.");
        this.reset();
      });
    }
  });
});
