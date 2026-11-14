"use client";

import Link from "next/link";
import Logo from "./Logo";

const links = [
  ["Tanjore Art Shop", "/shop"],
  ["Divine Gallery", "/divine-gallery"],
  ["Hindu Deities", "/hindu-deities"],
  ["Sacred Temples", "/sacred-temples"],
  ["Sacred Sculptures", "/sacred-sculptures"],
  ["Sacred Heritage", "/sacred-heritage"],
  ["About", "/about"],
  ["Contact", "/contact"],
];

export default function Footer() {
  return (
    <footer className="border-t border-black-deep/10 bg-[#ebe5d8] text-black-deep px-4 py-14 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.1fr_1.4fr_0.8fr]">
        <div>
          <Logo />
          <p className="mt-6 max-w-sm text-sm leading-7 text-black-charcoal/70">
            A premium divine gallery for Hindu deities, temple architecture, sacred sculpture, and handcrafted devotional frames.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="text-xs uppercase tracking-[0.22em] text-black-charcoal/70 transition-colors hover:text-black-deep">
              {label}
            </Link>
          ))}
        </nav>
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-grey-stone">Studio & Orders</p>
          <p className="mt-4 text-sm leading-7 text-black-charcoal/70">
            Handcrafted Tanjore Paintings & Devotional Frames. Custom pooja room sizing available.
          </p>
          <div className="mt-4">
            <a
              href="https://wa.me/919047044916?text=Namaste!%20I%20have%20an%20inquiry%20regarding%20devotional%20artworks."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black-deep hover:text-[#c9a227] transition-colors"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-[#25D366]"></span>
              WhatsApp: 90470 44916
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col justify-between gap-4 border-t border-black-deep/10 pt-6 text-xs text-black-charcoal/60 md:flex-row">
        <p>&copy; {new Date().getFullYear()} Frames of Divine. All rights reserved.</p>
        <p>Handcrafted Tanjore Paintings & Sacred Devotional Art.</p>
      </div>
    </footer>
  );
}
