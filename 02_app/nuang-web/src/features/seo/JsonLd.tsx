type JsonLdValue = Readonly<Record<string, unknown>> | readonly unknown[];

export function JsonLd({ data }: { data: JsonLdValue }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</gu, "\\u003c"),
      }}
      type="application/ld+json"
    />
  );
}
