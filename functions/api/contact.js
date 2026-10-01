const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY) {
    return json({ error: "Η υπηρεσία email δεν έχει ρυθμιστεί ακόμη." }, 503);
  }

  let form;
  try {
    form = await request.json();
  } catch {
    return json({ error: "Μη έγκυρα στοιχεία φόρμας." }, 400);
  }

  const name = String(form.name || "").trim();
  const phone = String(form.phone || "").trim();
  const email = String(form.email || "").trim();
  const message = String(form.message || "").trim();
  const turnstileToken = String(form["cf-turnstile-response"] || "").trim();

  if (!name || !phone || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: "Συμπληρώστε σωστά όλα τα υποχρεωτικά πεδία." }, 400);
  }

  if (!turnstileToken) {
    return json({ error: "Παρακαλώ ολοκληρώστε τον έλεγχο ασφαλείας." }, 400);
  }

  const verification = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: request.headers.get("CF-Connecting-IP") || "",
      }),
    },
  );
  const verificationResult = await verification.json();

  if (!verificationResult.success) {
    return json(
      { error: "Ο έλεγχος ασφαλείας δεν ολοκληρώθηκε. Παρακαλώ δοκιμάστε ξανά." },
      400,
    );
  }

  const text = [
    `Ονοματεπώνυμο: ${name}`,
    `Τηλέφωνο: ${phone}`,
    `Email: ${email}`,
    "",
    `Μήνυμα: ${message || "—"}`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        env.FORM_FROM_EMAIL ||
        "NOUS Therapy Center <forms@noustherapycenter.gr>",
      to: ["info@nouscenter.gr", "sec@nouscenter.gr"],
      reply_to: email,
      subject: "NousTherapyCenter - LP Form",
      text,
    }),
  });

  if (!response.ok) {
    return json({ error: "Η αποστολή απέτυχε. Παρακαλώ δοκιμάστε ξανά." }, 502);
  }

  return json({ ok: true });
}
