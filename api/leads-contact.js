import nodemailer from "nodemailer";

const isGmail = (email) =>
  /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(String(email || "").trim());
const is10Digits = (phone) => /^\d{10}$/.test(String(phone || ""));

function prettyPurpose(purpose) {
  const map = {
    complisight: "CompliSight",
    loadsight: "LoadSight",
    carbonsight: "CarbonSight",
    guardianeye: "GuardianEye",
    ai_services: "AI Services",
    other: "Other",
  };
  return map[purpose] || purpose || "-";
}

let transporter;
function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.ALERT_EMAIL_USER;
  const pass = process.env.ALERT_EMAIL_APP_PASS;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return transporter;
}

function buildContactEmailText({
  name,
  email,
  phone,
  company,
  purpose,
  message,
  pageUrl,
}) {
  return (
    `Hi Team,\n\n` +
    `A visitor has submitted a contact request on the CloudSeals website.\n\n` +
    `Customer Details\n` +
    `----------------\n` +
    `Name    : ${name}\n` +
    `Email   : ${email}\n` +
    `Phone   : ${phone}\n` +
    `Company : ${company}\n` +
    `Purpose : ${prettyPurpose(purpose)}\n` +
    `Page    : ${pageUrl || "-"}\n\n` +
    `Message\n` +
    `-------\n` +
    `${message}\n\n` +
    `Regards,\n` +
    `CloudSeals Website Notification\n`
  );
}

export default async function handler(req, res) {
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { ALERT_EMAIL_USER, ALERT_EMAIL_APP_PASS, LEADS_TO_EMAIL } =
      process.env;

    if (!ALERT_EMAIL_USER || !ALERT_EMAIL_APP_PASS || !LEADS_TO_EMAIL) {
      return res
        .status(500)
        .json({ ok: false, error: "Missing Vercel env vars for email." });
    }

    const { name, email, phone, company, purpose, message, pageUrl } =
      req.body || {};

    if (!name || !email || !phone || !purpose || !message) {
      return res.status(400).json({
        ok: false,
        error: "Missing name/email/phone/purpose/message",
      });
    }

    if (!isGmail(email)) {
      return res
        .status(400)
        .json({ ok: false, error: "Email must be a valid @gmail.com address." });
    }

    if (!is10Digits(phone)) {
      return res
        .status(400)
        .json({ ok: false, error: "Phone number must be exactly 10 digits." });
    }

    const safeCompany = company?.trim() ? company.trim() : "-";

    const subject = `New Contact Request - ${prettyPurpose(
      purpose
    )} | ${name}`;

    const text = buildContactEmailText({
      name,
      email,
      phone,
      company: safeCompany,
      purpose,
      message,
      pageUrl,
    });

    await getTransporter().sendMail({
      from: ALERT_EMAIL_USER,
      to: LEADS_TO_EMAIL,
      subject,
      text,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("leads-contact error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message || "Server error" });
  }
}
