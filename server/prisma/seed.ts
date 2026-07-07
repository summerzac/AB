import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Electronics Components", slug: "electronics-components" },
    { name: "Textiles & Apparel", slug: "textiles-apparel" },
    { name: "Industrial Machinery", slug: "industrial-machinery" },
    { name: "Home & Garden", slug: "home-garden" },
    { name: "Packaging Supplies", slug: "packaging-supplies" },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const electronics = await prisma.category.findUniqueOrThrow({ where: { slug: "electronics-components" } });
  const textiles = await prisma.category.findUniqueOrThrow({ where: { slug: "textiles-apparel" } });

  const passwordHash = await bcrypt.hash("password123", 10);

  const manufacturerUser = await prisma.user.upsert({
    where: { email: "demo-manufacturer@example.com" },
    update: {},
    create: {
      email: "demo-manufacturer@example.com",
      passwordHash,
      name: "Wei Zhang",
      role: "MANUFACTURER",
      manufacturerProfile: {
        create: {
          companyName: "Shenzhen Bright Electronics Co.",
          description: "Manufacturer of consumer electronics components and accessories, 15 years in business.",
          country: "CN",
          verified: true,
          shipFromAddress: {
            create: {
              name: "Shenzhen Bright Electronics Co.",
              street1: "88 Futian Industrial Rd",
              city: "Shenzhen",
              state: "Guangdong",
              zip: "518000",
              country: "CN",
              phone: "+86 755 1234 5678",
            },
          },
        },
      },
    },
    include: { manufacturerProfile: true },
  });

  await prisma.user.upsert({
    where: { email: "demo-buyer@example.com" },
    update: {},
    create: {
      email: "demo-buyer@example.com",
      passwordHash,
      name: "Alex Buyer",
      role: "BUYER",
      addresses: {
        create: {
          name: "Alex Buyer",
          street1: "500 Market St",
          city: "San Francisco",
          state: "CA",
          zip: "94105",
          country: "US",
          phone: "+1 415 555 0100",
        },
      },
    },
  });

  const profileId = manufacturerUser.manufacturerProfile!.id;

  const existing = await prisma.product.findFirst({ where: { manufacturerId: profileId } });
  if (!existing) {
    await prisma.product.create({
      data: {
        manufacturerId: profileId,
        categoryId: electronics.id,
        title: "USB-C Fast Charging Cable (Bulk)",
        description:
          "Braided nylon USB-C cables rated for 100W PD fast charging. Available in multiple lengths and colors. MOQ 500 units.",
        minOrderQty: 500,
        images: {
          create: [{ url: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800", position: 0 }],
        },
        variants: {
          create: [
            {
              sku: "USBC-1M-BLK",
              attributes: { length: "1m", color: "Black" },
              price: 1.25,
              stock: 50000,
              weightOz: 2,
              lengthIn: 6,
              widthIn: 4,
              heightIn: 1,
            },
            {
              sku: "USBC-2M-WHT",
              attributes: { length: "2m", color: "White" },
              price: 1.75,
              stock: 30000,
              weightOz: 3,
              lengthIn: 8,
              widthIn: 4,
              heightIn: 1,
            },
          ],
        },
      },
    });

    await prisma.product.create({
      data: {
        manufacturerId: profileId,
        categoryId: textiles.id,
        title: "Cotton Blend T-Shirts (Wholesale)",
        description: "220gsm cotton-poly blend t-shirts, custom printing available. MOQ 200 units per color/size.",
        minOrderQty: 200,
        images: {
          create: [{ url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800", position: 0 }],
        },
        variants: {
          create: [
            {
              sku: "TSHIRT-M-BLU",
              attributes: { size: "M", color: "Blue" },
              price: 3.2,
              stock: 5000,
              weightOz: 6,
              lengthIn: 12,
              widthIn: 10,
              heightIn: 1,
            },
            {
              sku: "TSHIRT-L-BLK",
              attributes: { size: "L", color: "Black" },
              price: 3.4,
              stock: 4000,
              weightOz: 7,
              lengthIn: 12,
              widthIn: 10,
              heightIn: 1,
            },
          ],
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log("Demo manufacturer login: demo-manufacturer@example.com / password123");
  console.log("Demo buyer login:        demo-buyer@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
