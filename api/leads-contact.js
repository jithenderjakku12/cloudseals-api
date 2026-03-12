import nodemailer from "nodemailer";

/* -----------------------------------------------------
   VALIDATIONS
----------------------------------------------------- */

const isGmail = (email) =>
  /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(String(email || "").trim());

const is10Digits = (phone) =>
  /^\d{10}$/.test(String(phone || "").trim());

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

/* -----------------------------------------------------
   NODEMAILER TRANSPORT
----------------------------------------------------- */

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

/* -----------------------------------------------------
   TEXT EMAIL (Fallback)
----------------------------------------------------- */

function buildLeadEmailText({
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
    `-----------------------------\n` +
    `Name    : ${name}\n` +
    `Email   : ${email}\n` +
    `Phone   : ${phone}\n` +
    `Company : ${company || "-"}\n` +
    `Purpose : ${prettyPurpose(purpose)}\n` +
    `Page    : ${pageUrl || "-"}\n\n` +
    `Message\n` +
    `-----------------------------\n` +
    `${message}\n\n` +
    `Regards,\n` +
    `CloudSeals Website Notification\n`
  );
}

/* -----------------------------------------------------
   HTML EMAIL (Professional)
----------------------------------------------------- */

function buildLeadEmailHTML({
  name,
  email,
  phone,
  company,
  purpose,
  message,
  pageUrl,
}) {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:40px">

<table width="650" align="center"
style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e5e5">

<tr>
<td style="background:#0c2b5a;color:white;padding:22px;font-size:22px;font-weight:bold">
<img src="https://cloudseals.com/logo.png"
style="height:40px;margin-bottom:6px"/>
CLOUDSEALS
<div style="font-size:13px;opacity:.85">
Pioneering Deep Tech Solutions
</div>
</td>
</tr>

<tr>
<td style="padding:25px">

<h2 style="margin-top:0;color:#222">
🔔 New Website Contact Lead
</h2>

<p style="color:#444">
A visitor has submitted their details through the CloudSeals website popup.
</p>

<table width="100%" cellpadding="10" cellspacing="0" border="1"
style="border-collapse:collapse;border-color:#e3e3e3">

<tr style="background:#f2f4f7">
<th align="left">Field</th>
<th align="left">Value</th>
</tr>

<tr>
<td>Name</td>
<td>${name}</td>
</tr>

<tr>
<td>Email</td>
<td>${email}</td>
</tr>

<tr>
<td>Phone</td>
<td>${phone}</td>
</tr>

<tr>
<td>Company</td>
<td>${company || "-"}</td>
</tr>

<tr>
<td>Purpose</td>
<td>${prettyPurpose(purpose)}</td>
</tr>

<tr>
<td>Page</td>
<td>${pageUrl || "-"}</td>
</tr>

<tr>
<td>Message</td>
<td>${message}</td>
</tr>

</table>

<p style="margin-top:20px;color:#444">
Please follow up with this lead as soon as possible.
</p>

</td>
</tr>

<tr>
<td style="background:#f5f5f5;padding:15px;font-size:12px;color:#777">
This is an automated notification from the CloudSeals website.
</td>
</tr>

</table>

</div>
`;
}

/* -----------------------------------------------------
   API HANDLER
----------------------------------------------------- */

export default async function handler(req, res) {

  /* ---------- CORS ---------- */

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {

    const {
      ALERT_EMAIL_USER,
      ALERT_EMAIL_APP_PASS,
      LEADS_TO_EMAIL,
    } = process.env;

    if (!ALERT_EMAIL_USER || !ALERT_EMAIL_APP_PASS || !LEADS_TO_EMAIL) {
      return res.status(500).json({
        ok: false,
        error: "Missing Vercel env vars for email.",
      });
    }

    const {
      name,
      email,
      phone,
      company,
      purpose,
      message,
      pageUrl,
    } = req.body || {};

    /* ---------- VALIDATION ---------- */

    if (!name || !email || !phone || !purpose || !message) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields",
      });
    }

    if (!isGmail(email)) {
      return res.status(400).json({
        ok: false,
        error: "Email must be a valid @gmail.com address.",
      });
    }

    if (!is10Digits(phone)) {
      return res.status(400).json({
        ok: false,
        error: "Phone number must be exactly 10 digits.",
      });
    }

    /* ---------- EMAIL CONTENT ---------- */

    const subject =
      `🚀 New Website Lead | ${prettyPurpose(purpose)} | ${name}`;

    const text = buildLeadEmailText({
      name,
      email,
      phone,
      company,
      purpose,
      message,
      pageUrl,
    });

    const html = buildLeadEmailHTML({
      name,
      email,
      phone,
      company,
      purpose,
      message,
      pageUrl,
    });

    /* ---------- SEND EMAIL ---------- */

    await getTransporter().sendMail({
      from: `"CloudSeals Website" <${ALERT_EMAIL_USER}>`,
      to: LEADS_TO_EMAIL,
      subject,
      text,
      html,
    });

    return res.status(200).json({
      ok: true,
    });

  } catch (err) {

    console.error("leads-contact error:", err);

    return res.status(500).json({
      ok: false,
      error: err?.message || "Server error",
    });

  }
}
