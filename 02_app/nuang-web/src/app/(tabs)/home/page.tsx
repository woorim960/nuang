import { HomeDashboard } from "@/features/home/HomeDashboard";
import { createServerHomeFeedPreviewItems } from "@/features/feed/server-read";

export default async function HomePage() {
  const feedPreviewItems = await createServerHomeFeedPreviewItems();

  return <HomeDashboard feedPreviewItems={feedPreviewItems} />;
}
