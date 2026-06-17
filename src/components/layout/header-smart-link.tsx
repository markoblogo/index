"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useEffect } from "react";

type HeaderSmartLinkProps = Omit<ComponentPropsWithoutRef<typeof Link>, "href"> & {
  children: ReactNode;
  href: string;
  prefetchOnMount?: boolean;
};

export function HeaderSmartLink({
  children,
  href,
  onFocus,
  onMouseEnter,
  onTouchStart,
  prefetchOnMount = false,
  ...props
}: HeaderSmartLinkProps) {
  const router = useRouter();

  useEffect(() => {
    if (!prefetchOnMount) return;
    router.prefetch(href);
  }, [href, prefetchOnMount, router]);

  const prefetch = () => router.prefetch(href);

  return (
    <Link
      href={href}
      onFocus={(event) => {
        prefetch();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        prefetch();
        onTouchStart?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
