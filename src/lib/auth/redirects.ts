export type ProductSelection = "BUSINESS" | "LABS" | "BOTH";

export function getProductPanelCopy(selection: ProductSelection) {
  switch (selection) {
    case "LABS":
      return {
        title: "Workspace VaseLabs",
        subtitle:
          "Tu tenant fue preparado para atencion automatizada, IA y nuevos flujos operativos.",
      };
    case "BOTH":
      return {
        title: "Workspace Business + Labs",
        subtitle:
          "Tu tenant combina ecommerce, integraciones, chatbot e IA en una sola base operativa.",
      };
    default:
      return {
        title: "Workspace Vase Business",
        subtitle:
          "Tu tenant fue preparado para ecommerce, gestion operativa e integraciones de negocio.",
      };
  }
}

export function getPostRegistrationRedirect(selection: ProductSelection) {
  switch (selection) {
    case "LABS":
    case "BOTH":
      return "/app/owner/labs/setup";
    default:
      return "/app/owner?product=business";
  }
}
