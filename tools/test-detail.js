(async () => {
  const button = document.querySelector('article button[aria-label^="Открыть"]');
  if (!button) return JSON.stringify({ error: "no card button" });
  button.click();
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const dialog = document.querySelector('[role="dialog"]');
  return JSON.stringify({
    dialog: Boolean(dialog),
    text: dialog ? dialog.innerText.slice(0, 300) : "",
    body: document.body.innerText.slice(0, 200),
  });
})()
