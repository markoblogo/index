import { NextResponse } from "next/server";

const MAX_FIELD_LENGTH = 4000;

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = cleanField(formData.get("name"));
  const email = cleanField(formData.get("email"));
  const company = cleanField(formData.get("company"));
  const market = cleanField(formData.get("market"));
  const message = cleanField(formData.get("message"));

  if (!name || !email || !message) {
    return NextResponse.json(
      { message: "Please include your name, email and message." },
      { status: 400 },
    );
  }

  if (!isLikelyEmail(email)) {
    return NextResponse.json({ message: "Please include a valid email address." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Contact form is not configured yet. Please email partnerships@1d3x.com." },
      { status: 503 },
    );
  }

  const to = process.env.PLATFORM_CONTACT_TO_EMAIL ?? "a.biletskiy@gmail.com";
  const from = process.env.PLATFORM_CONTACT_FROM_EMAIL ?? "1d3x <partnerships@1d3x.com>";
  const replyTo = email;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject: `1d3x partnership inquiry from ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Company: ${company || "-"}`,
        `Market: ${market || "-"}`,
        "",
        message,
      ].join("\n"),
      html: [
        `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
        `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`,
        `<p><strong>Company:</strong> ${escapeHtml(company || "-")}</p>`,
        `<p><strong>Market:</strong> ${escapeHtml(market || "-")}</p>`,
        `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
      ].join(""),
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "The message could not be sent. Please email partnerships@1d3x.com." },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: "Message sent. We will reply shortly." });
}

function cleanField(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_FIELD_LENGTH);
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

