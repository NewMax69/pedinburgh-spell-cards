const urls = [
  "https://new.ttg.club/spells/acid-splash-phb",
  "https://new.ttg.club/spells/mage-hand-phb",
];

for (const url of urls) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0", "accept-language": "ru" }, redirect: "follow" });
  const html = await res.text();
  const index = html.indexOf("Классы:");
  const snippet = index >= 0 ? html.slice(index, index + 700) : "(no classes)";
  const slugs = [...snippet.matchAll(/\/classes\/([a-z-]+)/g)].map((m) => m[1]);
  console.log(url, "->", res.url, "len", html.length, "classes:", JSON.stringify(slugs));
  console.log(snippet.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 160));
}
