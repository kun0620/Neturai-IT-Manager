import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  // ตรวจสอบว่า src มาจาก Dicebear API หรือไม่
  const isDicebear = src?.startsWith('https://api.dicebear.com');

  if (isDicebear) {
    // หากเป็น URL ของ Dicebear เราจะจงใจไม่เรนเดอร์ AvatarPrimitive.Image
    // ซึ่งจะบังคับให้แสดง AvatarFallback แทน
    // console.warn('Dicebear API image fetch skipped due to persistent network issues.'); // ลบข้อความเตือนนี้ออก
    return null; // หรือจะคืนค่าเป็นรูปภาพโปร่งใสก็ได้ แต่ null จะสะอาดกว่าเพื่อบังคับให้ใช้ fallback
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn('aspect-square h-full w-full', className)}
      src={src} // ใช้ src เดิมหากไม่ใช่ Dicebear
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted',
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
