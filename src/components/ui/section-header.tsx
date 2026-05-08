type SectionHeaderProps = {
  label: string;
  title: string;
  description: string;
};

export function SectionHeader({ label, title, description }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
        {label}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 text-base leading-7 text-black/65 sm:text-lg">
        {description}
      </p>
    </div>
  );
}
