const sessionKey = "purr-and-pour-note-v1";
const endings = {
  yes: { title: "It’s a date!", message: "Can’t wait to see you. ♡" },
  no: { title: "No worries.", message: "Thanks for telling me. ♡" },
  "no-coffee": { title: "Fair enough!", message: "A paw-five for you anyway. ♡" }
};

function restoreNote() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey));
    const stages = ["coffee", "date", ...Object.keys(endings)];
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.id)
      && stages.includes(saved.stage) && Number.isInteger(saved.taps) && saved.taps >= 0 && saved.taps <= 5) {
      return saved;
    }
  } catch { /* A browser may have session storage turned off. */ }
  return { id: crypto.randomUUID(), stage: "coffee", taps: 0 };
}

const note = restoreNote();
const byId = id => document.getElementById(id);
const yes = byId("yes");
const happyDialog = byId("happy-dialog");
const celebrationDialog = byId("celebration-dialog");
const celebrationClose = byId("celebration-close");
const likeDialog = byId("like-dialog");
const likeInput = byId("like-input");
const likeSubmit = byId("like-submit");
const no = byId("no");
const sometimes = byId("sometimes");
const statusLine = byId("status");
const responseNotice = statusLine.textContent;
const heading = byId("heading");
const cafe = byId("cafe");
const otherCafe = byId("other-cafe");
const otherLabel = byId("other-label");
const planForm = byId("plan-form");
let sending = false;
const emailEndpoint = "https://formsubmit.co/ajax/ishtiak7070@gmail.com";

async function sendEmail(fields) {
  const response = await fetch(emailEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(fields)
  });
  const result = await response.json();
  if (!response.ok || (result.success !== true && result.success !== "true")) {
    throw new Error(result.message || "Email service rejected the submission");
  }
}

async function saveReply(reply) {
  try {
    const response = await fetch("/api/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reply)
    });
    if (!response.ok) throw new Error(`Reply API returned ${response.status}`);
  } catch (error) {
    // Email delivery is the visitor-facing confirmation; D1 remains a secondary copy.
    console.error("Reply inbox save error:", error);
  }
}

// Handle like dialog submission
likeSubmit.addEventListener("click", () => {
  const val = likeInput.value.trim();
  if (!val) { likeInput.focus(); return; }
  note.like = val;
  remember();
  likeDialog.close();
  // Proceed to date stage with coffee set to "no"
  send("date", "no", null);
});

function remember() {
  try { sessionStorage.setItem(sessionKey, JSON.stringify(note)); } catch { }
}

function showTapCount() {
  byId("letter").className = "letter move-" + Math.min(note.taps, 4);
  const hint = byId("hint");
  hint.hidden = note.taps < 4;
  hint.textContent = note.taps === 4 ? "Two more No taps will be counted as a NO. 😿"
    : note.taps === 5 ? "One more tap to send your no." : "";
}

function renderStage() {
  const finish = endings[note.stage];
  byId("choices").hidden = Boolean(finish);
  sometimes.hidden = note.stage !== "coffee";
  byId("message").hidden = !finish;
  byId("hint").hidden = true;
  statusLine.textContent = finish ? "Reply sent." : responseNotice;
  if (note.stage === "date") {
    if (note.like) {
      heading.textContent = `Would you like to have ${note.like} with me sometime?`;
    } else {
      heading.replaceChildren(byId("date-heading").content.cloneNode(true));
    }
    showTapCount();
  }
  if (finish) {
    byId("letter").className = "letter move-0";
    heading.textContent = finish.title;
    byId("message").textContent = finish.message;
    if (note.stage === "yes" && happyDialog && !happyDialog.open && (!celebrationDialog || !celebrationDialog.open)) {
      happyDialog.showModal();
    }
  }
}

async function send(stage, coffee, date) {
  if (sending) return;
  sending = true;
  yes.disabled = no.disabled = sometimes.disabled = true;
  statusLine.textContent = "Sending…";
  remember();
  try {
    await saveReply({ id: note.id, coffee, date });
    if (stage === "yes" || stage === "no" || stage === "no-coffee") {
      await sendEmail({
        _subject: `🐾 New Purr & Pour reply: ${stage === "yes" ? "Yes" : "No"}`,
        _template: "table",
        Guest: "Adiba",
        "Coffee preference": coffee === "sometimes" ? "Sometimes" : coffee === "yes" ? "Yes" : "No",
        "Favorite thing": note.like || "",
        "Date response": stage === "yes" ? "Yes" : "No",
        "Submitted At": new Date().toLocaleString()
      });
    }
    note.stage = stage;
    note.coffee = coffee;
    note.taps = 0;
    remember();
    renderStage();
    if (stage !== "yes") heading.focus({ preventScroll: true });
  } catch {
    statusLine.textContent = "Couldn’t email your reply. Please try again.";
  } finally {
    sending = false;
    yes.disabled = no.disabled = sometimes.disabled = false;
  }
}

yes.addEventListener("click", () => {
  console.log('YES clicked, current stage:', note.stage);
  if (note.stage === "coffee") {
    console.log('YES at coffee -> send date');
    send("date", "yes", null);
  } else if (note.stage === "date") {
    console.log('YES at date -> send yes');
    send("yes", note.coffee ?? "yes", "yes");
  }
});

sometimes.addEventListener("click", () => {
  if (note.stage === "coffee") send("date", "sometimes", null);
});
no.addEventListener("click", () => {
  if (note.stage === "coffee") {
    // Open like dialog to ask what she likes
    likeDialog.showModal();
    return;
  }
  if (note.stage !== "date" || sending) return;
  if (note.taps === 5) return send("no", note.coffee ?? "yes", "no");
  note.taps++;
  remember();
  showTapCount();
  statusLine.textContent = responseNotice;
});

renderStage();
yes.disabled = no.disabled = sometimes.disabled = false;


if (celebrationClose) {
  celebrationClose.addEventListener("click", () => {
    celebrationDialog.close();
  });
}

if (cafe) {
  cafe.addEventListener("change", () => {
    const isOther = cafe.value === "other";
    otherCafe.hidden = otherLabel.hidden = !isOther;
    otherCafe.required = isOther;
  });
}

if (planForm) {
  planForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = planForm.querySelector("button[type=submit]");
    const status = byId("plan-status");
    const place = (cafe.value === "other" ? otherCafe.value : cafe.value).trim();
    if (!place) {
      if (status) status.textContent = "Please enter a place.";
      return;
    }
    const day = byId("day") ? byId("day").value : "";
    const time = byId("time") ? byId("time").value : "";
    if (button) button.disabled = true;
    if (status) status.textContent = "Sending…";
    try {
      try {
        await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: note.id,
            place,
            day,
            time
          })
        });
      } catch {
        // In static deployment (e.g. GitHub Pages), fetch fails or 404s; continue gracefully
      }
      await sendEmail({
        _subject: `🐾 Adiba chose a coffee place! (${place})`,
        _template: "table",
        Guest: "Adiba",
        "Café Choice": place,
        "Preferred Day": day || "Flexible / Not specified",
        "Preferred Time": time || "Flexible / Not specified",
        "Drink Preference": note.like || (note.coffee === "sometimes" ? "Sometimes coffee" : note.coffee === "yes" ? "Coffee" : "Other"),
        "Submitted At": new Date().toLocaleString()
      });

      if (status) status.textContent = "Sent! Can’t wait. ♡";
      if (button) button.textContent = "Update my choice ♡";

      if (happyDialog && happyDialog.open) {
        happyDialog.close();
      }
      if (celebrationDialog) {
        celebrationDialog.showModal();
      }
    } catch (err) {
      console.error("Plan submit error:", err);
      if (status) status.textContent = "Couldn’t send. Please try again.";
    } finally {
      if (button) button.disabled = false;
    }
  });
}
