'use client';

import { Avatar, AvatarFallback } from '@forsyteco/product-ui';
import Image from 'next/image';

export function AgentAvatar({ className }: { className?: string }) {
  return (
    // overflow-visible: Avatar clips to a circle, which cuts off the logo's glow.
    <Avatar className={`overflow-visible ${className ?? ''}`}>
      {/*
        product-ui's AvatarImage never shows: it passes `src` to the inner
        <img> rather than to Radix, so Radix treats the image as failed. With
        no AvatarImage, Radix always renders the fallback, so the logo goes there.
        Decorative: the agent's name is always shown or announced nearby.
      */}
      <AvatarFallback className="bg-transparent">
        <Image
          src="/forsyte-avatar.png"
          alt=""
          width={64}
          height={64}
          className="size-full"
        />
      </AvatarFallback>
    </Avatar>
  );
}
