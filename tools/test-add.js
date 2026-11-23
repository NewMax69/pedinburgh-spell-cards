(async () => {
  localStorage.removeItem("pedinburgh:selection");
  const before = location.href;
  const buttons = [...document.querySelectorAll('article button[aria-label="Добавить в набор"]')];
  if (!buttons.length) return JSON.stringify({ error: "no add buttons", tiles: document.querySelectorAll("article").length });
  buttons[0].click();
  buttons[1].click();
  await new Promise((r) => setTimeout(r, 400));
  const navText = [...document.querySelectorAll('a[href="/print"]')].map((a) => a.textContent.trim());
  const tray = document.querySelector('a[href="/print"].bg-card, a[href="/print"]')?.textContent;
  return JSON.stringify({
    before,
    after: location.href,
    samePage: before === location.href,
    buttons: buttons.length,
    navText,
    tray,
    stored: JSON.parse(localStorage.getItem("pedinburgh:selection") || "[]").length,
    dialogOpened: !!document.querySelector('[role="dialog"]'),
  });
})()
