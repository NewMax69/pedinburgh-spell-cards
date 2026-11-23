(() => {
  const now = Date.now();
  const base = {
    school: "Ограждение",
    ritual: true,
    casting: "1 минута",
    range: "Касание",
    duration: "Кон. до 1 ч.",
    components: "В, С, М (щепотка соли)",
    art: "Ты обводишь союзника кругом соли, и воздух вокруг становится упругим.",
    body: ["**Спасбросок:** Цель получает *помеху* на броски атаки по существам вне круга."],
    upgrade: "Улучшение: +1 час длительности за уровень ячейки выше 1-го.",
    status: "edited",
    custom: true,
    createdAt: now,
    updatedAt: now,
  };
  const cards = [
    { ...base, id: "custom-l9", name: "Девятый круг", level: 9 },
    { ...base, id: "custom-l7", name: "Седьмой круг", level: 7 },
    { ...base, id: "custom-l5", name: "Пятый круг", level: 5 },
    { ...base, id: "custom-l4", name: "Четвёртый круг", level: 4 },
    { ...base, id: "custom-l3", name: "Третий круг", level: 3 },
    { ...base, id: "custom-l2", name: "Второй круг", level: 2 },
  ];
  localStorage.setItem("pedinburgh:customCards", JSON.stringify(cards));
  return "seeded";
})()
