(() => {
  const now = Date.now();
  const cards = [
    {
      id: "custom-demo",
      name: "Пламя Пединбурга",
      level: 3,
      school: "Воплощение",
      ritual: false,
      casting: "Действие",
      range: "36.5 метров",
      duration: "Мгновенно",
      components: "В, С, М (щепотка серы)",
      art: "С ладоней срывается белое пламя, оставляющее на камнях выжженный узор.",
      body: [
        "Спасбросок: Цели в сфере радиусом 6 м. делают спасбросок по Лвк., иначе получают 8d6 урона огнём.",
        "Огонь обходит союзников и поджигает незакреплённые предметы в области.",
      ],
      upgrade: "На высоких уровнях: +1d6 урона за каждый уровень ячейки выше 3-го.",
      status: "edited",
      custom: true,
      theme: { header: "#F7D9A8", accent: "#E0A85C", ink: "#1A1410", paper: "#FFFDF8" },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "custom-demo-2",
      name: "Тихий шаг",
      level: 1,
      school: "Иллюзия",
      ritual: true,
      casting: "Бон. действ.",
      range: "На себя",
      duration: "Кон. до 1 м.",
      components: "С",
      art: "Шаги тонут в воздухе, как будто пол стал водой.",
      body: ["Ты становишься невидимым для слуха: проверки Внимательности против тебя совершаются с помехой."],
      upgrade: "",
      status: "edited",
      custom: true,
      createdAt: now - 1000,
      updatedAt: now - 1000,
    },
  ];
  localStorage.setItem("pedinburgh:customCards", JSON.stringify(cards));
  return "seeded";
})()
