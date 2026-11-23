(() => {
  const now = Date.now();
  const card = {
    id: "custom-check",
    name: "Предосторожность",
    level: 1,
    school: "Ограждение",
    ritual: true,
    casting: "1 минута",
    range: "Касание",
    duration: "Кон. до 1 ч.",
    components: "В, С, М (щепотка соли)",
    art: "Ты обводишь союзника кругом соли, и воздух вокруг становится упругим.",
    body: [
      "**Спасбросок:** Цель получает *помеху* на броски атаки по существам вне круга до конца действия.",
      "На высоких уровнях: радиус увеличивается на 1,5 метра за уровень ячейки выше 1-го.",
    ],
    upgrade: "Улучшение: +1 час длительности за уровень ячейки выше 1-го.",
    status: "edited",
    custom: true,
    createdAt: now,
    updatedAt: now,
  };
  localStorage.setItem("pedinburgh:customCards", JSON.stringify([card]));
  return "seeded";
})()
