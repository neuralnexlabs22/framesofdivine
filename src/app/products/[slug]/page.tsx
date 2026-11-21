import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Truck } from "lucide-react";
import { devotionalProducts } from "@/data/devotionalProducts";
import {
  getDevotionalProductAsync,
  getDevotionalProductsAsync,
} from "@/lib/devotionalServer";
import { getDeliverySettingsAsync, resolveDeliveryEstimate } from "@/lib/deliverySettings";
import ProductDetailActions from "@/components/ProductDetailActions";
import DevotionalProductCard from "@/components/DevotionalProductCard";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return devotionalProducts.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const [product, allProducts, deliverySettings] = await Promise.all([
    getDevotionalProductAsync(slug),
    getDevotionalProductsAsync(),
    getDeliverySettingsAsync(),
  ]);

  if (!product) notFound();

  const isReadyStock = Boolean(product.is_ready_stock) && (product.stock ?? 10) > 0;
  const deliveryEstimate = resolveDeliveryEstimate(product, deliverySettings);

  const relatedProducts = allProducts
    .filter((p) => p.slug !== product.slug && p.id !== product.id)
    .sort((a, b) => (a.category === product.category ? -1 : 1))
    .slice(0, 4);

  return (
    <div className="theme-light min-h-screen pt-28">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1fr_0.9fr] md:px-8 md:items-start">
        <div>
          <Link
            href="/shop"
            className="mb-8 inline-flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-grey-stone hover:text-black-deep transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Shop
          </Link>
          <div className="relative min-h-[680px] overflow-hidden border border-black-deep/15 bg-[#eae4d6]">
            {product.cropPosition ? (
              <div
                className="absolute inset-0 bg-cover bg-no-repeat"
                role="img"
                aria-label={product.imageAlt}
                style={{
                  backgroundImage: `url(${product.image})`,
                  backgroundPosition: product.cropPosition,
                  backgroundSize: "400% 300%",
                }}
              />
            ) : (
              <Image
                src={product.image}
                alt={product.imageAlt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 55vw"
                className="object-cover"
              />
            )}
          </div>
        </div>
        <div className="sticky top-28 border border-black-deep/15 bg-[#f4f0e8] p-7">
          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#c9a227] font-bold">
              {product.category}
            </p>
            {isReadyStock && (
              <div className="inline-flex items-center gap-1.5 bg-[#c9a227]/20 border border-[#c9a227] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#8c6d12]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#c9a227]" />
                <span>READY STOCK AVAILABLE</span>
              </div>
            )}
          </div>
          <h1 className="font-serif text-4xl uppercase leading-tight text-black-deep md:text-5xl">
            {product.name}
          </h1>
          <p className="mt-2 text-xs text-grey-stone">
            Tax included. Insured Pan-India delivery.
          </p>
          <p className="mt-6 text-sm leading-8 text-black-charcoal/72">
            {product.description}
          </p>
          <div className="mt-6">
            <ProductDetailActions product={product} />
          </div>
          {/* Dynamic Delivery & Dispatch Badge */}
          <div className="mt-6 border-t border-black-deep/10 pt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-black-deep">
                {product.delivery_fee && Number(product.delivery_fee) > 0
                  ? `DELIVERY: ₹${Number(product.delivery_fee).toLocaleString("en-IN")}`
                  : "FREE DELIVERY"}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-black-deep underline">
                PAN INDIA
              </span>
            </div>
            <p className="text-xs text-grey-stone flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#c9a227]" />
              <span>Estimated Delivery:</span>
              <span className="font-semibold text-black-deep">
                {deliveryEstimate.displayText}
              </span>
            </p>
            <p className="text-[11px] text-black-charcoal/65">
              Calculated dynamically from order date ({deliveryEstimate.minDays}–{deliveryEstimate.maxDays} days). Insured art wooden crate packaging.
            </p>
          </div>
        </div>
      </section>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-black-deep/15 bg-white-ivory/20 px-4 py-16 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <p className="eyebrow text-grey-stone">Sacred Collection</p>
              <h2 className="font-serif text-3xl uppercase text-black-deep">
                Related Devotional Paintings
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 items-stretch">
              {relatedProducts.map((rel) => (
                <DevotionalProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
