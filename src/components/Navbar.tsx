"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, Scale, Search, ShoppingCart, X, Sparkles, MessageSquare, ChevronDown } from "lucide-react";
import Logo from "./Logo";
import { useCart } from "@/context/CartContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useContactInfo } from "@/context/ContactInfoContext";
import { useCatalog } from "@/context/CatalogContext";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Custom Order", href: "/custom-order" },
  { name: "Reviews", href: "/reviews" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

const categoryLinks = [
  ["God Photo Paintings", "/shop/deity-prints"],
  ["Temple Paintings", "/shop/temple-prints"],
  ["Sculpture Paintings", "/shop/sculpture-prints"],
  ["Premium Sets", "/shop/premium-sets"],
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(true);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pathname = usePathname();
  const isHome = pathname === "/";
  const isSolid = scrolled || !isHome;

  const { totalItems, openCart } = useCart();
  const { getSetting } = useSiteSettings();
  const { contactInfo } = useContactInfo();
  const { categories: catalogCategories } = useCatalog();

  useEffect(() => {
    setShopDropdownOpen(false);
  }, [pathname]);

  const activeCategoryLinks = useMemo(() => {
    if (catalogCategories && catalogCategories.length > 0) {
      return catalogCategories
        .filter((c) => c.is_active !== false)
        .map((c) => [c.name, `/shop/${c.slug}`] as [string, string]);
    }
    return categoryLinks;
  }, [catalogCategories]);

  const phone = contactInfo?.phone_number || "90470 44916";
  const announcementSetting = getSetting("announcement_bar") as { text?: string; enabled?: boolean } | undefined;
  const rawAnnouncement =
    announcementSetting?.text ||
    `Traditional God Photo Paintings & Devotional Artworks | Customization available | WhatsApp: ${phone}`;
  const announcementText = rawAnnouncement.replace(/8122228386|81222\s*28386/g, "90470 44916");
  const announcementEnabled = announcementSetting?.enabled !== false;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`fixed left-0 top-0 z-50 w-full transition-cinematic ${isSolid ? "py-3 bg-[#f4f0e8]/95 shadow-md border-b border-black-deep/10 backdrop-blur-lg text-black-deep" : "py-4 bg-transparent border-b border-transparent text-white"}`}>
        {announcementEnabled && (
          <div className={`hidden border-b px-4 py-2 text-center text-[10px] uppercase tracking-[0.18em] transition-colors md:block ${isSolid ? "border-black-deep/10 text-black-deep/70" : "border-white/20 text-white/95"}`}>
            <a
              href="https://wa.me/919047044916?text=Namaste!%20I%20am%20interested%20in%20traditional%20god%20photo%20paintings."
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#c9a227] transition-colors inline-block"
              title="Chat on WhatsApp: 90470 44916"
            >
              {announcementText}
            </a>
          </div>
        )}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <button className="md:hidden" onClick={() => setIsOpen(true)} aria-label="Open navigation">
            <Menu className="h-6 w-6 text-current" />
          </button>
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`));

              if (link.name === "Shop") {
                const isShopActive = pathname === "/shop" || pathname.startsWith("/shop/");
                return (
                  <div
                    key={link.href}
                    className="relative"
                    onMouseEnter={() => {
                      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
                      setShopDropdownOpen(true);
                    }}
                    onMouseLeave={() => {
                      dropdownTimeoutRef.current = setTimeout(() => {
                        setShopDropdownOpen(false);
                      }, 180);
                    }}
                  >
                    <div className="flex items-center">
                      <Link
                        href={link.href}
                        onClick={() => setShopDropdownOpen(false)}
                        className={`group relative py-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors ${
                          isShopActive || shopDropdownOpen
                            ? "text-[#c9a227]"
                            : isSolid
                            ? "text-black-deep/75 hover:text-black-deep"
                            : "text-white/95 hover:text-[#c9a227]"
                        }`}
                      >
                        <span>{link.name}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            shopDropdownOpen ? "rotate-180 text-[#c9a227]" : ""
                          }`}
                        />
                        <span
                          className={`absolute bottom-0 left-0 h-px transition-cinematic ${
                            isShopActive ? "bg-[#c9a227]" : isSolid ? "bg-black-deep" : "bg-white"
                          } ${isShopActive || shopDropdownOpen ? "w-full" : "w-0 group-hover:w-full"}`}
                        />
                      </Link>
                    </div>

                    <AnimatePresence>
                      {shopDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.96 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="absolute top-full left-0 mt-1 min-w-[240px] rounded-2xl bg-[#070707] border border-white/10 shadow-2xl p-2.5 backdrop-blur-2xl z-50 text-white"
                        >
                          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.28em] text-[#c9a227] border-b border-white/10 mb-1">
                            Devotional Categories
                          </div>
                          <div className="space-y-0.5">
                            {activeCategoryLinks.map(([label, href]) => (
                              <Link
                                key={href}
                                href={href}
                                onClick={() => setShopDropdownOpen(false)}
                                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-white/10 transition-all group"
                              >
                                <span>{label}</span>
                                <span className="text-[10px] text-zinc-500 group-hover:text-[#c9a227] transition-colors">
                                  →
                                </span>
                              </Link>
                            ))}
                          </div>
                          <div className="border-t border-white/10 mt-1.5 pt-1.5">
                            <Link
                              href="/shop"
                              onClick={() => setShopDropdownOpen(false)}
                              className="flex items-center justify-between px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-[#c9a227] hover:bg-[#c9a227]/10 transition-all"
                            >
                              <span>View All Artworks</span>
                              <span>→</span>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              }

              return (
                <Link key={link.href} href={link.href} className={`group relative py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors ${active ? "text-[#c9a227]" : (isSolid ? "text-black-deep/75 hover:text-black-deep" : "text-white/95 hover:text-[#c9a227]")}`}>
                  {link.name}
                  <span className={`absolute bottom-0 left-0 h-px transition-cinematic ${active ? "bg-[#c9a227]" : (isSolid ? "bg-black-deep" : "bg-white")} ${active ? "w-full" : "w-0 group-hover:w-full"}`} />
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/shop" aria-label="Search products" className="hidden sm:block transition-colors hover:opacity-70"><Search className="h-5 w-5 stroke-[1.5]" /></Link>
            <Link href="/custom-order" aria-label="Custom Order" className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold border border-current px-2.5 py-1.5 hover:bg-white-pure hover:text-black-deep transition-all">
              <Sparkles className="h-3 w-3 text-[#c9a227]" /> Custom
            </Link>
            <button
              onClick={openCart}
              aria-label="Cart"
              className={`inline-flex items-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-cinematic ${
                isSolid
                  ? "border-[#c9a227] bg-[#c9a227]/10 text-black-deep hover:bg-[#c9a227] hover:text-black-deep"
                  : "border-white/60 text-white hover:bg-white hover:text-black-deep"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{totalItems} item(s)</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#f4f0e8] text-black-deep p-6 md:hidden overflow-y-auto">
            <div className="mb-10 flex items-center justify-between border-b border-ornamental pb-6">
              <div className="text-black-deep">
                <Logo />
              </div>
              <button onClick={() => setIsOpen(false)} aria-label="Close navigation">
                <X className="h-6 w-6 text-black-deep" />
              </button>
            </div>
            <nav className="flex flex-col gap-6">
              {navLinks.map((link, index) => {
                if (link.name === "Shop") {
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -18 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex flex-col"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className="font-serif text-2xl uppercase text-black-deep hover:text-[#c9a227] transition-colors"
                        >
                          {link.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setMobileShopOpen((prev) => !prev)}
                          aria-label="Toggle categories"
                          className="p-2 rounded-lg text-black-deep/60 hover:text-black-deep hover:bg-black-deep/5 transition-all"
                        >
                          <ChevronDown
                            className={`w-6 h-6 transition-transform duration-200 ${
                              mobileShopOpen ? "rotate-180 text-[#c9a227]" : ""
                            }`}
                          />
                        </button>
                      </div>

                      <AnimatePresence>
                        {mobileShopOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden pl-3 pt-2 pb-1 space-y-2.5 flex flex-col border-l-2 border-[#c9a227] my-2"
                          >
                            {activeCategoryLinks.map(([label, href]) => (
                              <Link
                                key={href}
                                href={href}
                                onClick={() => setIsOpen(false)}
                                className="text-sm uppercase tracking-wider text-black-deep/75 hover:text-[#c9a227] font-semibold py-0.5 transition-colors"
                              >
                                {label}
                              </Link>
                            ))}
                            <Link
                              href="/shop"
                              onClick={() => setIsOpen(false)}
                              className="text-xs uppercase tracking-widest text-[#c9a227] font-bold pt-1 transition-colors"
                            >
                              Explore All Paintings →
                            </Link>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }

                return (
                  <motion.div key={link.href} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                    <Link href={link.href} onClick={() => setIsOpen(false)} className="font-serif text-2xl uppercase text-black-deep hover:text-[#c9a227] transition-colors">
                      {link.name}
                    </Link>
                  </motion.div>
                );
              })}
              <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    openCart();
                  }}
                  className="flex items-center justify-center gap-2 border border-[#c9a227] bg-[#c9a227] text-black font-black uppercase tracking-wider text-xs py-3.5 rounded-xl"
                >
                  <ShoppingCart className="h-4 w-4" /> Open Cart ({totalItems} items)
                </button>
                <Link
                  href="/custom-order"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 border border-black-deep/20 text-black-deep font-bold uppercase tracking-wider text-xs py-3 rounded-xl hover:border-white"
                >
                  <Sparkles className="h-4 w-4 text-[#c9a227]" /> Custom Devotional Order
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
