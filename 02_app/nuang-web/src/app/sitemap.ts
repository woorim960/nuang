import type { MetadataRoute } from "next";
import { candidateProfileDefinitions } from "@/features/nuang-code/candidate-profile-names";
import { getSeoLabSlugs, getSeoTopicSlugs } from "@/features/seo/seo-content";
import { toAbsoluteNuangUrl } from "@/features/seo/site-config";

const lastContentReview = new Date("2026-08-05T00:00:00+09:00");

export default function sitemap(): MetadataRoute.Sitemap {
  const primaryRoutes: MetadataRoute.Sitemap = [
    entry("/", "weekly", 1),
    entry("/home", "weekly", 1),
    entry("/assessments/nu-core-quick", "monthly", 0.95),
    entry("/assessments/nu-core-full", "monthly", 0.8),
    entry("/assessments/together/balance-game", "weekly", 0.95),
    entry("/assessments/friend-match", "monthly", 0.8),
    entry("/map", "monthly", 0.85),
    entry("/feed", "daily", 0.75),
    entry("/help", "monthly", 0.45),
  ];

  const topicRoutes = getSeoTopicSlugs().map((slug) =>
    entry(`/assessments/topics/${slug}`, "monthly", 0.85),
  );
  const labRoutes = getSeoLabSlugs().map((slug) =>
    entry(`/labs/${slug}`, "monthly", 0.75),
  );
  const mapRoutes = Object.keys(candidateProfileDefinitions)
    .sort()
    .map((code) => entry(`/map/${code}`, "monthly", 0.65));

  return [...primaryRoutes, ...topicRoutes, ...labRoutes, ...mapRoutes];
}

function entry(
  path: string,
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >,
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    changeFrequency,
    lastModified: lastContentReview,
    priority,
    url: toAbsoluteNuangUrl(path),
  };
}
