import Image from "next/image";

export function PlatformFooterBrand() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <a
        className="inline-flex shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        href="https://ami.1d3x.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="AMI — Agro Market Infrastructure"
      >
        <Image alt="AMI" className="block h-16 w-16 object-contain" height={64} src="/brand/ami-mark.png" width={64} />
      </a>
      <div className="flex min-w-0 max-w-[165px] flex-col gap-2">
        <Image alt="1d3x" className="h-4 w-auto self-start opacity-60" height={736} src="/brand/1d3x-logo-white.webp" width={2140} />
        <p className="break-words text-[0.86rem] leading-[1.35]">Commodity index infrastructure.</p>
      </div>
    </div>
  );
}
