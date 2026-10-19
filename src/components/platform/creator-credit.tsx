import Image from "next/image";

export function CreatorCredit() {
  return (
    <a
      className="col-start-2 row-start-1 inline-flex shrink-0 flex-col items-center gap-[5px] justify-self-end whitespace-nowrap text-[0.78rem] leading-[1.35] text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:col-start-3"
      href="https://abvx.xyz/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <picture className="block overflow-hidden rounded bg-[#f8f7f4]">
        <source srcSet="/brand/abvx-mark.avif" type="image/avif" />
        <Image alt="" className="block" height={44} src="/brand/abvx-mark.jpeg" unoptimized width={44} />
      </picture>
      <span>Created by ABVX</span>
    </a>
  );
}
