import { Resend } from "resend";

type ContactRequestBody = { name: string; email: string; msg: string };

type ContactResponse = { ok: true } | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ContactRequestBody>;

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const msg = body.msg?.trim() ?? "";

  if (!name || !email || !msg || !EMAIL_PATTERN.test(email)) {
    const response: ContactResponse = { ok: false, error: "Datos inválidos. Revisa nombre, correo y mensaje." };
    return Response.json(response, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.CONTACT_TO_EMAIL as string,
      replyTo: email,
      subject: `Nuevo mensaje de contacto – ${name}`,
      html: `
        <div style="font-family: sans-serif; font-size: 14px; color: #111;">
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Correo:</strong> ${email}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${msg.replace(/\n/g, "<br>")}</p>
        </div>
      `,
    });

    if (error) {
      throw error;
    }

    const response: ContactResponse = { ok: true };
    return Response.json(response);
  } catch {
    const response: ContactResponse = { ok: false, error: "No se pudo enviar el mensaje. Intenta de nuevo más tarde." };
    return Response.json(response, { status: 500 });
  }
}
