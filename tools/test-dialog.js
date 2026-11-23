(async () => {
  const openButton = document.querySelector('article button[aria-label^="Открыть"]');
  if (!openButton) return JSON.stringify({ error: "no card button" });
  openButton.click();
  await new Promise((resolve) => setTimeout(resolve, 800));
  const dialog = document.querySelector('[role="dialog"]');
  const details = dialog?.querySelector("details");
  return JSON.stringify({
    dialog: !!dialog,
    details: !!details,
    detailsOpen: details?.open ?? null,
    summary: details?.querySelector("summary")?.textContent ?? null,
    tail: dialog?.innerText.slice(-220) ?? "",
  });
})()
