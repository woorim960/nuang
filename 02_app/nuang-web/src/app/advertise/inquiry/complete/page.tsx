import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdvertisingInquiryComplete } from "@/features/advertising/AdvertisingInquiryComplete";

export const metadata: Metadata = {
  title: "광고 문의 접수 완료 | NUANG",
  robots: {
    follow: false,
    index: false,
  },
};

export default async function AdvertisingInquiryCompletePage({
  searchParams,
}: {
  searchParams?: Promise<{ reference?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const requestedReference = Array.isArray(params.reference)
    ? params.reference[0]
    : params.reference;
  const publicReference = readPublicReference(requestedReference);

  if (!publicReference) {
    redirect("/advertise/inquiry");
  }

  return <AdvertisingInquiryComplete publicReference={publicReference} />;
}

function readPublicReference(value?: string) {
  return value && /^AD-\d{8}-[A-Z2-9]{6}$/.test(value) ? value : "";
}
