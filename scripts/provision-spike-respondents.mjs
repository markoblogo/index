import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PASSWORD_SETUP_TOKEN_TTL_HOURS = 48;
const tenantScope = {
  tenantId: process.env.INDEX_TENANT ?? "spike-ua",
  indexProductId:
    process.env.NEXT_PUBLIC_INDEX_TENANT ??
    process.env.INDEX_TENANT ??
    "spike-ua",
};

const fopSolovey = {
  id: "fop-solovey",
  legalName: "ФОП Соловей",
  contactName: "Oleksandr Solovey",
  email: "oleksandr.solo@gmail.com",
  phone: "+380503862991",
  telegramChatId: "447017744",
  telegramUsername: "o_solo",
};

function digestPasswordSetupToken(token) {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

async function createPasswordSetupLink({ authId, email, userId }) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + PASSWORD_SETUP_TOKEN_TTL_HOURS * 60 * 60 * 1000,
  );

  await prisma.passwordSetupToken.create({
    data: {
      ...tenantScope,
      email,
      expiresAt,
      respondentAuthAccountId: authId,
      tokenDigest: digestPasswordSetupToken(token),
      userId,
    },
  });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://spike.1d3x.com";
  const url = new URL("/setup-password", siteUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("next", "/respondent");
  return url.toString();
}

async function main() {
  const setupTarget = await prisma.$transaction(async (tx) => {
    const existingRespondent = await tx.respondent.findUnique({
      where: { id: fopSolovey.id },
    });

    if (
      existingRespondent &&
      (existingRespondent.tenantId !== tenantScope.tenantId ||
        existingRespondent.indexProductId !== tenantScope.indexProductId)
    ) {
      throw new Error("FOP Solovey respondent id belongs to another tenant.");
    }

    await tx.respondent.updateMany({
      where: {
        ...tenantScope,
        id: { notIn: ["MN7R_MONITOR", fopSolovey.id] },
        legalName: { startsWith: "Spike Brokers Partner" },
      },
      data: {
        active: false,
        status: "disabled",
      },
    });

    if (existingRespondent) {
      await tx.respondent.update({
        where: { id: fopSolovey.id },
        data: {
          active: true,
          collectionMode: "self_service",
          displayName: fopSolovey.legalName,
          legalName: fopSolovey.legalName,
          status: "active",
        },
      });
    } else {
      await tx.respondent.create({
        data: {
          ...tenantScope,
          id: fopSolovey.id,
          active: true,
          collectionMode: "self_service",
          displayName: fopSolovey.legalName,
          legalName: fopSolovey.legalName,
          status: "active",
        },
      });
    }

    const contactData = {
      email: fopSolovey.email,
      name: fopSolovey.contactName,
      phone: fopSolovey.phone,
      preferredLocale: "uk",
      primary: true,
      role: "Primary contact",
      telegramChatId: fopSolovey.telegramChatId,
      telegramUsername: fopSolovey.telegramUsername,
    };
    const contact = await tx.respondentContact.findFirst({
      where: { respondentId: fopSolovey.id, active: true, primary: true },
    });

    if (contact) {
      await tx.respondentContact.update({
        where: { id: contact.id },
        data: contactData,
      });
    } else {
      await tx.respondentContact.create({
        data: {
          respondentId: fopSolovey.id,
          ...contactData,
        },
      });
    }

    const existingAuth = await tx.respondentAuthAccount.findUnique({
      where: { respondentId: fopSolovey.id },
    });
    const shouldGenerateSetupLink =
      !existingAuth ||
      existingAuth.passwordSetupStatus !== "active" ||
      !existingAuth.passwordHash;
    const auth = await tx.respondentAuthAccount.upsert({
      where: { respondentId: fopSolovey.id },
      update: {
        loginEmail: fopSolovey.email,
        ...(shouldGenerateSetupLink
          ? {
              lastGeneratedAt: new Date(),
              passwordHash: null,
              passwordSetAt: null,
              passwordSetupStatus: "temporary",
              temporaryPassword: null,
            }
          : {}),
      },
      create: {
        respondentId: fopSolovey.id,
        lastGeneratedAt: new Date(),
        loginEmail: fopSolovey.email,
        passwordSetupStatus: "temporary",
        temporaryPassword: null,
      },
    });

    const existingUser = await tx.user.findUnique({
      where: { email: fopSolovey.email },
    });

    if (
      existingUser &&
      (existingUser.tenantId !== tenantScope.tenantId ||
        existingUser.indexProductId !== tenantScope.indexProductId)
    ) {
      throw new Error("FOP Solovey user email belongs to another tenant.");
    }

    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            active: true,
            name: `${fopSolovey.legalName} respondent`,
            respondentId: fopSolovey.id,
            role: "respondent",
            ...(shouldGenerateSetupLink
              ? {
                  lastGeneratedAt: new Date(),
                  passwordHash: null,
                  passwordSetAt: null,
                  passwordSetupStatus: "temporary",
                  temporaryPassword: null,
                }
              : {}),
          },
        })
      : await tx.user.create({
          data: {
            ...tenantScope,
            active: true,
            email: fopSolovey.email,
            name: `${fopSolovey.legalName} respondent`,
            respondentId: fopSolovey.id,
            role: "respondent",
            passwordSetupStatus: "temporary",
            temporaryPassword: null,
          },
        });

    const baskets = await tx.basket.findMany({
      where: { ...tenantScope, active: true },
    });
    await Promise.all(
      baskets.map((basket) =>
        tx.basketRespondent.upsert({
          where: {
            basketId_respondentId: {
              basketId: basket.id,
              respondentId: fopSolovey.id,
            },
          },
          update: { active: true },
          create: {
            active: true,
            basketId: basket.id,
            respondentId: fopSolovey.id,
          },
        }),
      ),
    );

    return {
      authId: auth.id,
      email: auth.loginEmail,
      shouldGenerateSetupLink,
      userId: user.id,
    };
  });

  const setupLink =
    setupTarget.shouldGenerateSetupLink || process.env.SEND_SOLOVEY_ONBOARDING === "1"
      ? await createPasswordSetupLink(setupTarget)
      : null;

  if (process.env.SEND_SOLOVEY_ONBOARDING === "1" && setupLink) {
    await sendOnboardingEmail(setupLink);
  }

  console.log(
    JSON.stringify(
      {
        respondentId: fopSolovey.id,
        loginEmail: fopSolovey.email,
        sentOnboarding: process.env.SEND_SOLOVEY_ONBOARDING === "1",
        setupLinkGenerated: Boolean(setupLink),
      },
      null,
      2,
    ),
  );
}

async function sendOnboardingEmail(setupLink) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://spike.1d3x.com";
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: "SPIKE SPOT INDEX <onboarding@resend.dev>",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111">
          <h1>Доступ до SPIKE SPOT INDEX</h1>
          <p>Ви додані як респондент SPIKE SPOT INDEX.</p>
          <p><strong>Логін:</strong> ${fopSolovey.email}</p>
          <p>Встановіть власний пароль за одноразовим посиланням.</p>
          <p><a href="${setupLink}" style="font-weight:700;color:#111">Встановити пароль</a></p>
          <p>Після встановлення пароля входьте через <a href="${siteUrl}/login">${siteUrl}/login</a>.</p>
        </div>
      `,
      subject: "Доступ респондента до SPIKE SPOT INDEX",
      text: [
        "Ви додані як респондент SPIKE SPOT INDEX.",
        `Логін: ${fopSolovey.email}`,
        `Встановити пароль: ${setupLink}`,
        `Вхід: ${siteUrl}/login`,
      ].join("\n"),
      to: [fopSolovey.email],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Resend onboarding failed: ${response.status} ${await response.text()}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
