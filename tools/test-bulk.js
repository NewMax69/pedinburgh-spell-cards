(async () => {
  const trigger = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Добавить всё"));
  if (!trigger) return JSON.stringify({ error: "no trigger" });
  trigger.click();
  await new Promise((resolve) => setTimeout(resolve, 300));
  const option = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Все карточки"));
  if (!option) return JSON.stringify({ error: "no option" });
  option.click();
  await new Promise((resolve) => setTimeout(resolve, 500));
  const ids = JSON.parse(localStorage.getItem("pedinburgh:selection") || "[]");
  const nav = [...document.querySelectorAll('header a[href="/print"]')].map((a) => a.textContent.trim());
  return JSON.stringify({ added: ids.length, nav });
})()
