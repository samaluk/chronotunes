import { cn } from "@/lib/utils";

function AspectRatio({
  ratio,
  className,
  ...props
}: React.ComponentProps<"div"> & { ratio: number }) {
  return (
    <div
      className={cn("relative aspect-(--ratio)", className)}
      data-slot="aspect-ratio"
      style={
        // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-unsafe-type-assertion
        {
          "--ratio": ratio,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { AspectRatio };
