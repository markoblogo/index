import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isPlatformSite } from "@/lib/platform-site";
import { BlogShell } from "@/components/platform/blog-shell";

export default async function BlogLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isPlatformSite()) {
    notFound();
  }

  return <BlogShell>{children}</BlogShell>;
}
