(() => {
  const cards = [...document.querySelectorAll(".spell-card")];
  return JSON.stringify({
    count: cards.length,
    texts: cards.map((c) => c.innerText.replace(/\n+/g, " | ").slice(0, 400)),
  });
})()
