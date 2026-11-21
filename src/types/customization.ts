export interface CustomizationOption {
  id: string;
  label: string;
  description?: string;
  priceDelta: number;
  active: boolean;
  displayOrder: number;
}

export interface CustomizationField {
  id: string;
  slug: string;
  label: string;
  description?: string;
  fieldType: "select" | "radio" | "pills";
  scope: "all" | "category" | "product";
  targetCategory?: string;
  targetProductId?: string;
  appliesTo: "both" | "product_page" | "custom_order";
  required: boolean;
  active: boolean;
  displayOrder: number;
  options: CustomizationOption[];
  createdAt?: string;
  updatedAt?: string;
}

export const defaultCustomizationFields: CustomizationField[] = [
  {
    id: "field-dimensions",
    slug: "dimensions",
    label: "Desired Dimensions",
    description: "Select standard pooja room dimensions or request custom temple wall proportions.",
    fieldType: "pills",
    scope: "all",
    appliesTo: "both",
    required: true,
    active: true,
    displayOrder: 1,
    options: [
      {
        id: "dim-12x18",
        label: "12 x 18 in (Compact Pooja Room)",
        description: "Compact pooja mandap or shelf placement",
        priceDelta: 0,
        active: true,
        displayOrder: 1,
      },
      {
        id: "dim-16x24",
        label: "16 x 24 in (Standard Classic)",
        description: "Traditional standard proportions for residential pooja sanctums",
        priceDelta: 500,
        active: true,
        displayOrder: 2,
      },
      {
        id: "dim-20x30",
        label: "20 x 30 in (Grand Sanctum)",
        description: "Grand statement artwork for spacious pooja rooms",
        priceDelta: 1200,
        active: true,
        displayOrder: 3,
      },
      {
        id: "dim-24x36",
        label: "24 x 36 in (Temple Collector Gallery)",
        description: "Masterpiece proportions with expansive gold leaf detailing",
        priceDelta: 2200,
        active: true,
        displayOrder: 4,
      },
      {
        id: "dim-custom",
        label: "Custom Wall Proportions",
        description: "Tailored to your specific architectural sanctum niche",
        priceDelta: 0,
        active: true,
        displayOrder: 5,
      },
    ],
  },
  {
    id: "field-frame-finish",
    slug: "frame-finish",
    label: "Frame & Finish Preference",
    description: "Seasoned solid wood frames crafted by hereditary Chettinad carpenters.",
    fieldType: "pills",
    scope: "all",
    appliesTo: "both",
    required: true,
    active: true,
    displayOrder: 2,
    options: [
      {
        id: "frame-teak",
        label: "Teak Wood Frame (Matte Glass)",
        description: "Seasoned Chettinad teak wood with non-reflective protective glass",
        priceDelta: 0,
        active: true,
        displayOrder: 1,
      },
      {
        id: "frame-gold-foil",
        label: "22KT Gold Foil Accent Frame",
        description: "Gilded inner bead border enhancing 22KT gold Tanjore artwork",
        priceDelta: 600,
        active: true,
        displayOrder: 2,
      },
      {
        id: "frame-chettinad",
        label: "Chettinad Carved Wood Border",
        description: "Authentic hand-carved floral temple pilaster motifs",
        priceDelta: 850,
        active: true,
        displayOrder: 3,
      },
      {
        id: "frame-rosewood",
        label: "Traditional Rosewood Finish",
        description: "Rich deep rosewood stain with archival moisture sealant",
        priceDelta: 450,
        active: true,
        displayOrder: 4,
      },
      {
        id: "frame-unframed",
        label: "Unframed Archival Canvas Only",
        description: "Rolled archival canvas with gold leaf, ready for local framing",
        priceDelta: 0,
        active: true,
        displayOrder: 5,
      },
    ],
  },
  {
    id: "field-gold-quality",
    slug: "material-quality",
    label: "Gold Leaf & Material Grade",
    description: "Authentic 22KT or 24KT pure gold leaf applied over traditional Arabic gum chalk gesso.",
    fieldType: "pills",
    scope: "all",
    appliesTo: "product_page",
    required: true,
    active: true,
    displayOrder: 3,
    options: [
      {
        id: "gold-22kt",
        label: "22 Carat Exclusive Gold Foil",
        description: "Authentic certified 22KT gold leaves with Jaipur gemstones",
        priceDelta: 0,
        active: true,
        displayOrder: 1,
      },
      {
        id: "gold-24kt",
        label: "24 Carat Imperial Gold Foil",
        description: "Museum-grade 24KT pure gold leaves with high-relief gesso",
        priceDelta: 2000,
        active: true,
        displayOrder: 2,
      },
    ],
  },
  {
    id: "field-artwork-relief",
    slug: "artwork-relief",
    label: "Artwork Type & Relief Depth",
    description: "Choose surface embossing depth and sanctum relief style.",
    fieldType: "select",
    scope: "all",
    appliesTo: "both",
    required: false,
    active: true,
    displayOrder: 4,
    options: [
      {
        id: "relief-flat",
        label: "Traditional Flat Tanjore Painting",
        description: "Classic smooth Tanjore iconographic surface",
        priceDelta: 0,
        active: true,
        displayOrder: 1,
      },
      {
        id: "relief-semi",
        label: "2D / Semi Embossed Sanctum Depth",
        description: "Subtle jewelry, crown, and border relief for dimensional brilliance",
        priceDelta: 800,
        active: true,
        displayOrder: 2,
      },
      {
        id: "relief-3d",
        label: "3D Embossed Royal Relief",
        description: "Sculpted high-relief gesso mudras and architectural vimana embossing",
        priceDelta: 1500,
        active: true,
        displayOrder: 3,
      },
      {
        id: "relief-panel",
        label: "Panel Painting (Double Diptych/Triptych)",
        description: "Hinged or paired multi-panel sanctum ensemble",
        priceDelta: 2500,
        active: true,
        displayOrder: 4,
      },
    ],
  },
];
