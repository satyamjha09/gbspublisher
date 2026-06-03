import { PrismaClient, UserRole } from "@prisma/client";
import { createSlug } from "../libs/common/src";

const prisma = new PrismaClient();

async function main() {
  const displayName = "Dev Author";

  const user = await prisma.user.upsert({
    where: {
      email: "dev-author@publication.local"
    },
    update: {},
    create: {
      clerkId: "dev_clerk_author_001",
      email: "dev-author@publication.local",
      name: displayName,
      roles: [UserRole.READER, UserRole.AUTHOR, UserRole.ADMIN],
      profiles: {
        create: {
          displayName,
          slug: `${createSlug(displayName)}-dev`,
          penName: "Dev Pen Name",
          bio: "Development author account"
        }
      }
    }
  });

  console.log("Seed user created:");
  console.log(user);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
