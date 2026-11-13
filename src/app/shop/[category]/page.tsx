import Link from "next/link";
import DevotionalProductCard from "@/components/DevotionalProductCard";
import { devotionalCategories } from "@/data/devotionalProducts";
import {
  getDevotionalCategoriesAsync,
  getDevotionalProductsAsync,
} from "@/lib/devotionalServer";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return devotionalCategories.map((category) => ({ category: category.slug }));
}

export default async function CategoryShopPage(
  props: PageProps<"/shop/[category]">
) {
  const { category } = await props.params;
  const categories = await getDevotionalCategoriesAsync();
  const categoryData = categories.find(
    (item) => item.slug.toLowerCase() === category.toLowerCase()
  ) || {
    slug: category,
    name: category
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `Devotional paintings and artworks for ${category.replace(
      /-/g,
      " "
    )}.`,
    image: "",
  };

  const products = await getDevotionalProductsAsync(category);

  return (
    <div className="theme-light min-h-screen pt-28">
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <Link
          href="/shop"
          className="mb-8 inline-block text-xs uppercase tracking-[0.22em] text-grey-stone hover:text-black-deep"
        >
          Back To Shop
        </Link>
        <p className="eyebrow text-[#c9a227] font-bold">{categoryData.name}</p>
        <h1 className="section-title max-w-5xl text-black-deep">
          {categoryData.description}
        </h1>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
        {products.length === 0 ? (
          <div className="py-16 text-center border border-black-deep/10 bg-white-pure p-8">
            <h3 className="font-serif text-2xl uppercase text-black-deep mb-2">
              No paintings in this category yet
            </h3>
            <p className="text-xs text-black-charcoal/70 mb-6">
              New authentic Tanjore paintings are being added regularly.
            </p>
            <Link
              href="/shop"
              className="inline-block px-6 py-3 bg-[#c9a227] text-black font-bold uppercase text-xs rounded-xl tracking-wider hover:brightness-110 shadow-md shadow-[#c9a227]/20 transition-all"
            >
              Browse All Paintings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <DevotionalProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
