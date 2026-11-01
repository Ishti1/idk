const key = location.hash.slice(1);
const refresh = document.getElementById("refresh");
const list = document.getElementById("replies");
const statusLine = document.getElementById("status");
const description = document.getElementById("description");

function renderReply(reply) {
  const item = document.getElementById("reply").content.cloneNode(true);
  const labels = { yes: "Yes to a coffee date!", no: "Declined the date" };
  const preferences = { yes: "Likes coffee", no: "Not a coffee person", sometimes: "Sometimes likes coffee" };
  const preference = preferences[reply.coffee];
  item.querySelector("strong").textContent = labels[reply.date] || preference;
  if (reply.date === "yes") item.querySelector("use").setAttribute("href", "/marks.svg#heart");
  const detail = reply.date ? preference : reply.coffee !== "no" ? "Date question unanswered" : "";
  item.querySelector("small").textContent = [detail, reply.place, reply.day, reply.time, new Date(reply.received).toLocaleString()].filter(Boolean).join(" · ");
  return item;
}

async function checkInbox() {
  refresh.disabled = true;
  statusLine.textContent = "Checking the mailbox…";
  try {
    const response = await fetch("/api/inbox", {
      headers: { Authorization: "Bearer " + key }, cache: "no-store"
    });
    if (response.status === 403) {
      description.textContent = "";
      list.replaceChildren();
      refresh.hidden = true;
      statusLine.textContent = "Open the private inbox link you were given.";
      return;
    }
    if (!response.ok) throw new Error("Inbox unavailable");
    const rows = await response.json();
    description.textContent = rows.length ? "The latest notes from your coffee invitation."
      : "The mailbox is quiet. Her answers will appear here when she replies.";
    list.replaceChildren(...rows.map(renderReply));
    statusLine.textContent = "";
  } catch {
    statusLine.textContent = "Couldn’t load replies. Please try again.";
  } finally {
    refresh.disabled = false;
  }
}

refresh.addEventListener("click", checkInbox);
if (key) {
  refresh.hidden = false;
  checkInbox();
} else {
  statusLine.textContent = "Open your private inbox link to see replies.";
}
