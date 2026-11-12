// Renders every Owed email with sample data and drops it into the local Mailpit (never a real inbox).
// npm run mail:gallery  [-- --to=gallery+owed@datasparklab.local]
import {
  accountDeletedEmail,
  deleteRequestEmail,
  welcomeEmail,
  type Email,
} from "../lib/mail";

const mailpit = (
  process.env.MAILPIT_URL || "http://mail.datasparklab.local"
).replace(/\/$/, "");
const to =
  process.argv.find((a) => a.startsWith("--to="))?.slice(5) ||
  "gallery+owed@datasparklab.local";
const site = "https://owed.edilsonsantos.co.za";

const emails: [string, Email][] = [
  [
    "Welcome",
    welcomeEmail({
      name: "Thandi Mokoena",
      email: to,
      appUrl: `${site}/app`,
      accountUrl: `${site}/account`,
    }),
  ],
  [
    "Confirm deletion",
    deleteRequestEmail({
      name: "Thandi Mokoena",
      confirmUrl: `${site}/account?token=sample`,
    }),
  ],
  [
    "Account deleted",
    accountDeletedEmail({ name: "Thandi Mokoena", siteUrl: site }),
  ],
];

async function main() {
  for (const [label, email] of emails) {
    const res = await fetch(`${mailpit}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: "noreply@edilsonsantos.co.za", Name: "Owed" },
        To: [{ Email: to }],
        Subject: email.subject,
        HTML: email.html,
        Text: email.text,
        Tags: ["owed"],
      }),
    });
    if (!res.ok)
      throw new Error(
        `Mailpit refused "${email.subject}": ${res.status} ${await res.text()}`,
      );
    console.log(`  ${label.padEnd(26)} ${email.subject}`);
  }
  console.log(`  ${emails.length} sent from noreply@edilsonsantos.co.za`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
