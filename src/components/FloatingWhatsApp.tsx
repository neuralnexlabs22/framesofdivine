"use client";

import { MessageSquare } from "lucide-react";

export default function FloatingWhatsApp() {
  return (
    <aside aria-label="Support chat" className="fixed bottom-6 right-6 z-40">
      <a
        href="https://wa.me/919047044916?text=Namaste!%20I%20am%20interested%20in%20traditional%20god%20photo%20paintings%20and%20framing."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp: 90470 44916"
        className="group flex items-center gap-2.5 bg-[#25D366] text-white px-4 py-3 rounded-full shadow-2xl hover:brightness-110 transition-all hover:scale-105"
      >
        <MessageSquare className="w-5 h-5 fill-white stroke-none" />
        <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider pr-1">
          WhatsApp: 90470 44916
        </span>
      </a>
    </aside>
  );
}

