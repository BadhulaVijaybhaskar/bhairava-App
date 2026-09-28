import { Panel, SectionTitle } from "@/components/kit";

export function ComingSoonPanel({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Panel className="text-center">
      <SectionTitle>{title}</SectionTitle>
      <p className="pt-2 text-sm text-muted-foreground">
        {description ?? "This Portfolio OS tab is planned for a later slice. Navigation works; content ships in P2+."}
      </p>
      <p className="pt-4 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Coming soon
      </p>
    </Panel>
  );
}
