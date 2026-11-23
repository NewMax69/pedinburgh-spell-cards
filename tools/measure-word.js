(() => {
  const c = document.createElement("canvas").getContext("2d");
  const word = "Предосторожность";
  const out = {};
  for (const [key, font] of [
    ["r12", '400 100px "Alegreya Sans"'],
    ["b12", '700 100px "Alegreya Sans"'],
    ["b11", '700 100px "Alegreya Sans"'],
  ]) {
    c.font = font;
    out[key] = +(c.measureText(word).width * (key === "b11" ? 0.11 : 0.12)).toFixed(2);
  }
  return JSON.stringify(out);
})()
