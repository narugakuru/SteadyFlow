import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils/utils";

type PageContainerProps = HTMLAttributes<HTMLDivElement>;

export function PageContainer({ className, ...props }: PageContainerProps) {
  return <div className={cn("mx-auto w-full max-w-5xl px-4 md:px-6", className)} {...props} />;
}
