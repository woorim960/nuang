import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminContentRelease = {
  atomCounts: Record<string, number>;
  codeSchemeVersion: string;
  contractVersion: string;
  createdAt: string;
  inventory: {
    atoms: number;
    axes: number;
    facets: number;
    profiles: number;
  };
  profileNameReleaseId: string;
  releaseId: string;
  reviewCounts: Record<string, number>;
  status: string;
  updatedAt: string;
};

export type AdminContentReview = {
  atomId: string;
  atomState: string;
  atomVersion: number;
  copyShort: string;
  entityRef: string;
  releaseId: string;
  reviewRole: string;
  reviewStatus: string;
  slot: string;
  updatedAt: string;
};

export async function readAdminContent(client: SupabaseClient) {
  const rpcResponse = await client.rpc(
    "get_admin_trait_map_content_dashboard",
  );
  if (!rpcResponse.error && isDashboardPayload(rpcResponse.data)) {
    return {
      releases: rpcResponse.data.releases as AdminContentRelease[],
      reviews: rpcResponse.data.reviews as AdminContentReview[],
    };
  }

  const releasesResponse = await client
    .schema("trait_map")
    .from("content_release")
    .select(
      "release_id,contract_version,code_scheme_version,profile_name_release_id,status,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(20);
  if (releasesResponse.error) throw releasesResponse.error;

  const releaseIds = (releasesResponse.data ?? []).map((row) => row.release_id);
  if (releaseIds.length === 0) {
    return { releases: [] as AdminContentRelease[], reviews: [] as AdminContentReview[] };
  }

  const [axes, facets, profiles, atoms, reviews] = await Promise.all([
    client
      .schema("trait_map")
      .from("axis_definition")
      .select("release_id")
      .in("release_id", releaseIds),
    client
      .schema("trait_map")
      .from("facet_definition")
      .select("release_id")
      .in("release_id", releaseIds),
    client
      .schema("trait_map")
      .from("role_profile")
      .select("release_id")
      .in("release_id", releaseIds),
    client
      .schema("trait_map")
      .from("content_atom")
      .select(
        "release_id,atom_id,version,entity_ref,slot,copy_short,publication_state,updated_at",
      )
      .in("release_id", releaseIds)
      .order("updated_at", { ascending: false })
      .limit(5000),
    client
      .schema("trait_map")
      .from("content_review")
      .select(
        "release_id,atom_id,atom_version,review_role,status,updated_at",
      )
      .in("release_id", releaseIds)
      .order("updated_at", { ascending: false })
      .limit(10000),
  ]);
  for (const response of [axes, facets, profiles, atoms, reviews]) {
    if (response.error) throw response.error;
  }

  const atomMap = new Map(
    (atoms.data ?? []).map((atom) => [
      atomKey(atom.release_id, atom.atom_id, atom.version),
      atom,
    ]),
  );
  const releases = (releasesResponse.data ?? []).map(
    (release): AdminContentRelease => ({
      atomCounts: countStates(
        (atoms.data ?? []).filter((row) => row.release_id === release.release_id),
        "publication_state",
      ),
      codeSchemeVersion: release.code_scheme_version,
      contractVersion: release.contract_version,
      createdAt: release.created_at,
      inventory: {
        atoms: countRelease(atoms.data ?? [], release.release_id),
        axes: countRelease(axes.data ?? [], release.release_id),
        facets: countRelease(facets.data ?? [], release.release_id),
        profiles: countRelease(profiles.data ?? [], release.release_id),
      },
      profileNameReleaseId: release.profile_name_release_id,
      releaseId: release.release_id,
      reviewCounts: countStates(
        (reviews.data ?? []).filter(
          (row) => row.release_id === release.release_id,
        ),
        "status",
      ),
      status: release.status,
      updatedAt: release.updated_at,
    }),
  );

  const reviewQueue = (reviews.data ?? [])
    .map((review): AdminContentReview | null => {
      const atom = atomMap.get(
        atomKey(review.release_id, review.atom_id, review.atom_version),
      );
      if (!atom) return null;
      return {
        atomId: review.atom_id,
        atomState: atom.publication_state,
        atomVersion: review.atom_version,
        copyShort: atom.copy_short,
        entityRef: atom.entity_ref,
        releaseId: review.release_id,
        reviewRole: review.review_role,
        reviewStatus: review.status,
        slot: atom.slot,
        updatedAt: review.updated_at,
      };
    })
    .filter((item): item is AdminContentReview => Boolean(item))
    .sort(
      (left, right) =>
        reviewPriority(left.reviewStatus) - reviewPriority(right.reviewStatus) ||
        right.updatedAt.localeCompare(left.updatedAt),
    );

  return { releases, reviews: reviewQueue };
}

function isDashboardPayload(
  value: unknown,
): value is {
  releases: unknown[];
  reviews: unknown[];
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return Array.isArray(payload.releases) && Array.isArray(payload.reviews);
}

function atomKey(releaseId: string, atomId: string, version: number) {
  return `${releaseId}::${atomId}::${version}`;
}

function countRelease(rows: Array<{ release_id: string }>, releaseId: string) {
  return rows.filter((row) => row.release_id === releaseId).length;
}

function countStates<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = String(row[key]);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function reviewPriority(status: string) {
  if (status === "changes_requested") return 0;
  if (status === "in_review") return 1;
  if (status === "not_started") return 2;
  return 3;
}
