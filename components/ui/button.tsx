import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "ui-btn group/button inline-flex shrink-0 items-center justify-center rounded-[4px] text-sm font-medium whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:     "ui-btn-default",
        outline:     "ui-btn-outline",
        secondary:   "ui-btn-secondary",
        ghost:       "ui-btn-ghost",
        destructive: "ui-btn-destructive",
        link:        "ui-btn-link",
      },
      size: {
        default:   "h-8 gap-1.5 px-3",
        xs:        "h-6 gap-1 rounded-[3px] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm:        "h-7 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg:        "h-9 gap-1.5 px-3.5",
        icon:      "size-8",
        "icon-xs": "size-6 rounded-[3px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[3px]",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
