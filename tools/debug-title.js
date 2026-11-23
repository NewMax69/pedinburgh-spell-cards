(() => {
  const card = document.querySelector(".spell-card");
  if (!card) return JSON.stringify({ error: "no card" });
  const titleSizes = [...document.querySelectorAll(".spell-card")].map((el) => ({
    size: el.getAttribute("data-title-size"),
    lines: el.getAttribute("data-title-lines"),
  }));
  const title = [...card.querySelectorAll("div")].find((el) => el.style.whiteSpace === "nowrap" && el.style.fontSize);
  return JSON.stringify({
    cards: titleSizes.slice(0, 3),
    titleFont: title?.style.fontSize ?? null,
    titleText: title?.textContent ?? null,
    titleWidth: title?.getBoundingClientRect().width ?? null,
  });
})()
