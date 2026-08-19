export default function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="surface mx-auto max-w-3xl overflow-hidden">
      <div className="bg-[linear-gradient(135deg,#072a66,#1a56b0)] px-6 py-8 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-100">Module</p>
        <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 max-w-lg text-sm text-sky-100/90">{description}</p>
      </div>
      <div className="px-6 py-6">
        <p className="text-sm font-medium text-muted-foreground">
          Premium UI shell is ready. Full CRUD for this module lands in the next build slice.
        </p>
      </div>
    </div>
  );
}
