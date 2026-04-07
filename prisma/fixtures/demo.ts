export const demoFixtures = {
  admin: {
    name: "Vase Admin",
    email: "admin@vase.local",
    password: "Admin!23456",
  },
  support: {
    name: "Vase Support",
    email: "support@vase.local",
    password: "Support!23456",
  },
  owner: {
    name: "Acme Owner",
    email: "owner@acme.local",
    password: "Owner!23456",
  },
  tenant: {
    name: "Acme Retail",
    slug: "acme-retail",
    accountName: "Acme",
    industry: "Retail",
    onboardingProduct: "BOTH" as const,
  },
};
