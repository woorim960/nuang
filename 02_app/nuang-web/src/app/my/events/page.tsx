import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountEventHistory } from "@/features/account/AccountEventHistory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "참여한 이벤트 | NUANG",
};

export default async function MyEventsPage() {
  const client = await createServerSupabaseClient();
  const { data } = client
    ? await client.auth.getUser()
    : { data: { user: null } };

  if (!data.user) {
    redirect("/login?next=%2Fmy%2Fevents&reason=event");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link aria-label="마이로 돌아가기" href="/my">
          <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.7} />
        </Link>
        <p>참여한 이벤트</p>
        <span aria-hidden="true" />
      </header>
      <AccountEventHistory />
    </main>
  );
}
