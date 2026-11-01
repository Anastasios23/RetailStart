import {
  getPublicPresentationConfig,
  type PublicPresentationConfig,
} from "./config"

/**
 * Per-client presentation + store facts.
 * For the next business: replace this file (or swap the export) and leave commerce code alone.
 * Research: docs/clients/katerina-kayia-pharmacy.md
 */
export const CLIENT_STORE = {
  legal_name: "Φαρμακείο Κατερίνα Καγιά LTD",
  display_name: "Φαρμακείο Κατερίνα Καγιά",
  display_name_en: "Katerina Kayia Pharmacy",
  phone: "+357 22 480 888",
  phone_tel: "+35722480888",
  email: "katerinakayiapharmacy@gmail.com",
  address_lines: [
    "Δημήτρη Σταύρου 3ΑΒ",
    "Λατσιά 2224, Λευκωσία",
    "Δίπλα από Κέντρο Υγείας Λατσιών",
  ],
  hours: [
    { label: "Δευ–Τρί, Πέμ–Παρ", value: "08:00–13:30 & 15:00–18:30" },
    { label: "Τετάρτη", value: "08:00–13:30" },
    { label: "Σάββατο", value: "08:00–13:30" },
    { label: "Κυριακή", value: "Κλειστά" },
  ],
  social: {
    instagram: "https://www.instagram.com/katerinakayiapharmacy/",
    facebook: "https://www.facebook.com/katerinakayiapharmacy/",
    wolt: "https://wolt.com/el/cyp/nicosia/venue/katerina-kayia-pharmacy",
  },
  maps_query: "Δημήτρη Σταύρου 3ΑΒ Λατσιά 2224",
} as const

export const CLIENT_PRESENTATION: PublicPresentationConfig = {
  bundle_id: "pb_katerina_kayia_pharmacy_v1",
  version: "1.0.0",
  branding: {
    name: "Φαρμακείο Κατερίνα Καγιά",
    tagline: "Personal care · Wellness · Cosmetics · Home delivery",
  },
  theme: {
    // From docs/clients/katerina-kayia-brand-identity.md (FB logo + farmakeia banner).
    primary_color: "#088888",
    accent_color: "#1EA87E",
    font_family: '"Manrope", "Segoe UI", sans-serif',
    dark_mode_enabled: false,
  },
  navigation: {
    header: [
      { label: "Αρχική", href: "/", order: 1 },
      { label: "Προϊόντα", href: "/products", order: 2 },
      { label: "Κατηγορίες", href: "/categories", order: 3 },
      { label: "Αναζήτηση", href: "/search", order: 4 },
      { label: "Καλάθι", href: "/cart", order: 5 },
    ],
    footer: [
      { label: "Προϊόντα", href: "/products", order: 1 },
      { label: "Κατηγορίες", href: "/categories", order: 2 },
      { label: "Αναζήτηση", href: "/search", order: 3 },
      { label: "Καλάθι", href: "/cart", order: 4 },
    ],
  },
  seo: {
    default_title: "Φαρμακείο Κατερίνα Καγιά | Λατσιά",
    title_template: "%s | Φαρμακείο Κατερίνα Καγιά",
    default_description:
      "Φαρμακείο στα Λατσιά για personal care, wellness και καλλυντικά. Δημήτρη Σταύρου 3ΑΒ · 22 480 888.",
    robots: "index, follow",
    open_graph: {
      site_name: "Φαρμακείο Κατερίνα Καγιά",
    },
  },
  static_content: {
    announcement_banner: {
      enabled: true,
      text: "Δερμοκαλλυντικά & wellness online · Συνταγές και συμβουλές στο φαρμακείο · 22 480 888",
    },
    hero: {
      heading: "Wellness, από το φαρμακείο σας",
      subheading:
        "Personal care, δερμοκαλλυντικά και συμπληρώματα — η δική τους ιστοσελίδα, με την εμπειρία ενός σύγχρονου καταστήματος delivery.",
      cta_label: "Δείτε τα προϊόντα",
      cta_link: "/products",
    },
  },
}

/** Active client storefront presentation. Swap this module for the next business. */
export function getActivePresentationConfig(): PublicPresentationConfig {
  return getPublicPresentationConfig(CLIENT_PRESENTATION)
}
