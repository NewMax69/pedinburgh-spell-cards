import CatalogView from "@/components/catalog/catalog-view";
import { loadSnapshot } from "@/lib/server-snapshot";

export default async function Page() {
  const snapshot = await loadSnapshot();
  return <CatalogView initialSpells={snapshot.spells} />;
}
